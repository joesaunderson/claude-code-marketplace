'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PluginCard from '@/components/PluginCard';
import SearchBar from '@/components/SearchBar';
import { FetchedMarketplace } from '@/types/marketplace';
import MarketplaceInstallBox from '@/components/MarketplaceInstallBox';
import MarketplaceStructuredData from '@/components/MarketplaceStructuredData';
import { formatStarCount, formatRelativeTime } from '@/lib/github';

interface MarketplaceDetailClientProps {
  marketplace: FetchedMarketplace | null;
  marketplaceId: string;
}

export default function MarketplaceDetailClient({ marketplace, marketplaceId }: MarketplaceDetailClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlugins = useMemo(() => {
    if (!marketplace?.manifest?.plugins) return [];
    if (!searchQuery.trim()) {
      return marketplace.manifest.plugins;
    }

    const query = searchQuery.toLowerCase();
    return marketplace.manifest.plugins.filter((plugin) => {
      const nameMatch = plugin.name.toLowerCase().includes(query);
      const descriptionMatch = plugin.description?.toLowerCase().includes(query);
      const tagsMatch = plugin.tags?.some((tag) => tag.toLowerCase().includes(query));
      const keywordsMatch = plugin.keywords?.some((keyword) => keyword.toLowerCase().includes(query));

      return nameMatch || descriptionMatch || tagsMatch || keywordsMatch;
    });
  }, [searchQuery, marketplace]);

  if (!marketplace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-950 dark:via-blue-950/20 dark:to-indigo-950/30">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Marketplace Not Found</h1>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Hub
          </Link>
        </div>
      </div>
    );
  }

  const validateUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return null;
      return url;
    } catch {
      return null;
    }
  };

  const repoUrl = validateUrl(marketplace.repository);
  const homepageUrl = validateUrl(marketplace.homepage);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5] dark:bg-[#0A0A0A]">
      <MarketplaceStructuredData marketplace={marketplace} marketplaceId={marketplaceId} />

      <header className="bg-[#f0eee6] dark:bg-[#0A0A0A] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Hub
          </Link>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white">
                  {marketplace.name}
                </h1>
                {marketplace.verified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {marketplace.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  by{' '}
                  {marketplace.owner.url ? (
                    <a
                      href={marketplace.owner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {marketplace.owner.name}
                    </a>
                  ) : (
                    marketplace.owner.name
                  )}
                </span>
                {marketplace.pluginCount !== undefined && (
                  <span>
                    {marketplace.pluginCount} {marketplace.pluginCount === 1 ? 'plugin' : 'plugins'}
                  </span>
                )}
                {marketplace.stars !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {formatStarCount(marketplace.stars)}
                  </span>
                )}
                {marketplace.lastUpdated && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatRelativeTime(marketplace.lastUpdated)}
                  </span>
                )}
              </div>
              {marketplace.tags && marketplace.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {marketplace.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              )}
              {homepageUrl && homepageUrl !== repoUrl && (
                <a
                  href={homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Marketplace Installation */}
        {!marketplace.error && repoUrl && (
          <MarketplaceInstallBox repositoryUrl={repoUrl}  />
        )}

        {marketplace.error ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl mb-4">
              <svg className="w-16 h-16 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Unable to Load Plugins
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {marketplace.error}
            </p>
          </div>
        ) : !marketplace.manifest || marketplace.manifest.plugins.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Plugins Available
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This marketplace doesn't have any plugins yet.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search plugins by name, description, tags, or keywords..."
              />
            </div>

            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredPlugins.length} of {marketplace.manifest.plugins.length} plugins
            </div>

            {filteredPlugins.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No plugins found matching your search.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlugins.map((plugin) => (
                  <PluginCard key={plugin.name} plugin={plugin} marketplaceName={marketplaceId} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="mt-auto bg-[#f0eee6] dark:bg-[#0A0A0A] border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors">
              ← Back to Marketplace Hub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
