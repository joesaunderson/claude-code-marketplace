import { MarketplaceManifest } from '@/types/plugin';
import { FetchedMarketplace, MarketplaceEntry } from '@/types/marketplace';

/**
 * Parse a GitHub repository URL to extract owner, repo, and branch
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string } | null {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes('github.com')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      return null;
    }

    return {
      owner: pathParts[0],
      repo: pathParts[1].replace('.git', ''),
      branch: 'main', // Default branch
    };
  } catch {
    return null;
  }
}

/**
 * Construct the raw GitHub URL for a marketplace manifest
 */
export function constructManifestUrl(repoUrl: string, branch: string = 'main'): string | null {
  const parsed = parseGitHubUrl(repoUrl);

  if (!parsed) {
    return null;
  }

  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/.claude-plugin/marketplace.json`;
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [1000, 2000, 4000], // Exponential backoff: 1s, 2s, 4s
};

/**
 * Timeout configuration
 */
const TIMEOUT_CONFIG = {
  manifest: 10000, // 10s for manifest fetch
  githubApi: 15000, // 15s for GitHub API
};

/**
 * Helper to determine if error is retryable
 */
const isRetryableError = (error: any, statusCode?: number): boolean => {
  // Retry on network errors (timeout, connection refused, etc)
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
  if (error.message?.includes('fetch failed')) return true;

  // Retry on 5xx server errors
  if (statusCode && statusCode >= 500) return true;

  // Don't retry on 4xx client errors (except 429 rate limit)
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) return false;

  return false;
};

/**
 * Helper to get specific error message
 */
const getErrorMessage = (error: any, statusCode?: number): string => {
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return 'Request timeout';
  }

  if (error.message?.includes('fetch failed')) {
    return 'Connection failed';
  }

  if (error instanceof SyntaxError) {
    return 'Invalid response format';
  }

  if (statusCode === 404) {
    return 'Marketplace file not found';
  }

  if (statusCode && statusCode >= 500) {
    return `Server error (${statusCode})`;
  }

  if (statusCode && statusCode >= 400) {
    return `HTTP ${statusCode}`;
  }

  return 'Network error';
};

/**
 * Fetch with timeout using AbortController
 */
const fetchWithTimeout = async (url: string, timeout: number, options?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Fetch a marketplace manifest from GitHub with retry logic
 */
export async function fetchMarketplaceManifest(
  url: string,
  options?: RequestInit
): Promise<{ data: MarketplaceManifest | null; error?: string }> {
  let lastError: any;
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      console.log(`[Fetch] Manifest attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}: ${url}`);

      const response = await fetchWithTimeout(url, TIMEOUT_CONFIG.manifest, {
        ...options,
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      lastStatusCode = response.status;

      if (!response.ok) {
        const errorMsg = getErrorMessage(null, response.status);

        // Only retry if error is retryable
        if (!isRetryableError(null, response.status) || attempt === RETRY_CONFIG.maxAttempts - 1) {
          console.error(`[Fetch] Failed manifest from ${url}: ${errorMsg}`);
          return { data: null, error: errorMsg };
        }

        // Wait before retry
        console.warn(`[Fetch] Retryable error ${response.status}, waiting ${RETRY_CONFIG.delays[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.delays[attempt]));
        continue;
      }

      const data = await response.json();
      console.log(`[Fetch] Successfully fetched manifest from ${url}`);
      return { data: data as MarketplaceManifest };

    } catch (error) {
      lastError = error;
      const errorMsg = getErrorMessage(error);

      console.error(`[Fetch] Error attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts} for ${url}:`, error);

      // Only retry if error is retryable and not last attempt
      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxAttempts - 1) {
        return { data: null, error: errorMsg };
      }

      // Wait before retry
      console.warn(`[Fetch] Retrying after ${RETRY_CONFIG.delays[attempt]}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.delays[attempt]));
    }
  }

  // Should not reach here, but handle gracefully
  const errorMsg = getErrorMessage(lastError, lastStatusCode);
  return { data: null, error: errorMsg };
}

/**
 * Fetch and enrich a marketplace entry with its plugin data
 */
export async function fetchMarketplace(
  entry: MarketplaceEntry
): Promise<FetchedMarketplace> {
  // Fetch manifest and GitHub data in parallel
  const [manifestResult, githubData] = await Promise.all([
    fetchMarketplaceManifest(entry.manifestUrl),
    fetchGitHubRepoData(entry.repository),
  ]);

  if (!manifestResult.data) {
    return {
      ...entry,
      error: manifestResult.error || 'Failed to fetch marketplace data',
      lastFetched: new Date().toISOString(),
      stars: githubData?.stars,
      lastUpdated: githubData?.lastUpdated,
    };
  }

  return {
    ...entry,
    manifest: manifestResult.data,
    pluginCount: manifestResult.data.plugins.length,
    lastFetched: new Date().toISOString(),
    stars: githubData?.stars,
    lastUpdated: githubData?.lastUpdated,
  };
}

/**
 * Fetch multiple marketplaces in parallel
 */
export async function fetchMarketplaces(
  entries: MarketplaceEntry[]
): Promise<FetchedMarketplace[]> {
  const promises = entries.map(entry => fetchMarketplace(entry));
  return Promise.all(promises);
}

/**
 * Validate that a marketplace manifest URL is accessible
 */
export async function validateMarketplaceUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch GitHub repository stars and last updated date with retry logic
 * Uses GitHub REST API
 */
export async function fetchGitHubRepoData(repositoryUrl: string): Promise<{ stars: number; lastUpdated: string } | null> {
  const parsed = parseGitHubUrl(repositoryUrl);
  if (!parsed) return null;

  const { owner, repo } = parsed;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      console.log(`[Fetch] GitHub API attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}: ${owner}/${repo}`);

      const response = await fetchWithTimeout(apiUrl, TIMEOUT_CONFIG.githubApi, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          // Add GitHub token if available (optional, increases rate limit)
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
        next: {
          // Revalidate every 24 hours
          revalidate: 86400,
        },
      });

      if (!response.ok) {
        // Only retry if error is retryable
        if (!isRetryableError(null, response.status) || attempt === RETRY_CONFIG.maxAttempts - 1) {
          console.error(`[Fetch] GitHub API error for ${owner}/${repo}: ${response.status}`);
          return null;
        }

        // Wait before retry
        console.warn(`[Fetch] Retryable GitHub API error ${response.status}, waiting ${RETRY_CONFIG.delays[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.delays[attempt]));
        continue;
      }

      const data = await response.json();
      console.log(`[Fetch] Successfully fetched GitHub data for ${owner}/${repo}`);

      return {
        stars: data.stargazers_count || 0,
        lastUpdated: data.pushed_at || data.updated_at,
      };

    } catch (error) {
      console.error(`[Fetch] Error attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts} for GitHub API ${owner}/${repo}:`, error);

      // Only retry if error is retryable and not last attempt
      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxAttempts - 1) {
        return null;
      }

      // Wait before retry
      console.warn(`[Fetch] Retrying GitHub API after ${RETRY_CONFIG.delays[attempt]}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.delays[attempt]));
    }
  }

  return null;
}

/**
 * Format relative time from ISO date string
 */
export function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Updated ${Math.floor(diffDays / 30)} months ago`;
    return `Updated ${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return 'Updated recently';
  }
}

/**
 * Format star count with K/M suffix
 */
export function formatStarCount(stars: number): string {
  if (stars >= 1000000) {
    return `${(stars / 1000000).toFixed(1)}M`;
  }
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}K`;
  }
  return stars.toString();
}
