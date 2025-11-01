import { notFound } from 'next/navigation';
import MarketplaceDetailClient from './MarketplaceDetailClient';
import { getMarketplaceData, getMarketplaceEntry } from '@/app/actions';

export const revalidate = 3600; // Revalidate every hour

interface MarketplacePageProps {
  params: {
    id: string[];
  };
}

export async function generateMetadata({ params }: MarketplacePageProps) {
  const id = params.id.join('/');
  const entry = await getMarketplaceEntry(id);
  const marketplace = await getMarketplaceData(id);

  if (!entry) {
    return {
      title: 'Marketplace Not Found',
    };
  }

  const pluginCount = marketplace?.pluginCount || 0;
  const baseUrl = 'https://claudecodemarketplace.com';
  const pageUrl = `${baseUrl}/marketplace/${id}`;

  // Enhanced description with plugin count and call to action
  const enhancedDescription = pluginCount > 0
    ? `${entry.description} Browse ${pluginCount} plugin${pluginCount === 1 ? '' : 's'} for Claude Code. Install ${entry.name} marketplace and extend your AI coding assistant.`
    : entry.description;

  return {
    title: `${entry.name} - Claude Code Plugins`,
    description: enhancedDescription,
    keywords: [
      entry.name,
      'Claude Code plugins',
      'Claude Code extensions',
      ...(entry.tags || []),
      entry.owner.name,
    ],
    authors: [{ name: entry.owner.name, url: entry.owner.url }],
    creator: entry.owner.name,
    publisher: 'Claude Code Plugins',
    alternates: {
      canonical: pageUrl,
      types: {
        'text/markdown': `${baseUrl}/markdown/marketplace/${id}`,
      },
    },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: `${entry.name} - Claude Code Plugins`,
      description: enhancedDescription,
      siteName: 'Claude Code Plugins',
      images: [
        {
          url: `${baseUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${entry.name} - Claude Code Plugins`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${entry.name} - Claude Code Plugins`,
      description: enhancedDescription,
      images: [`${baseUrl}/opengraph-image`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function MarketplacePage({ params }: MarketplacePageProps) {
  const id = params.id.join('/');
  const marketplace = await getMarketplaceData(id);

  if (!marketplace) {
    notFound();
  }

  return <MarketplaceDetailClient marketplace={marketplace} marketplaceId={id} />;
}
