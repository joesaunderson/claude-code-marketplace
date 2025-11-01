import { notFound } from 'next/navigation';
import { getMarketplaceData } from '@/app/actions';

export const revalidate = 3600; // Revalidate every hour

interface MarkdownMarketplacePageProps {
  params: {
    id: string[];
  };
}

export default async function MarkdownMarketplacePage({ params }: MarkdownMarketplacePageProps) {
  const id = params.id.join('/');
  const marketplace = await getMarketplaceData(id);

  if (!marketplace) {
    notFound();
  }

  // Generate markdown content
  const markdown = `# ${marketplace.name}

${marketplace.description}

## Marketplace Information

- **Owner**: ${marketplace.owner.name}${marketplace.owner.url ? ` (${marketplace.owner.url})` : ''}
- **Repository**: ${marketplace.repository}
${marketplace.homepage && marketplace.homepage !== marketplace.repository ? `- **Homepage**: ${marketplace.homepage}` : ''}
${marketplace.pluginCount !== undefined ? `- **Total Plugins**: ${marketplace.pluginCount}` : ''}
${marketplace.stars !== undefined ? `- **GitHub Stars**: ${marketplace.stars}` : ''}
${marketplace.lastUpdated ? `- **Last Updated**: ${marketplace.lastUpdated}` : ''}
${marketplace.verified ? `- **Status**: Verified ✓` : ''}
${marketplace.tags && marketplace.tags.length > 0 ? `- **Tags**: ${marketplace.tags.join(', ')}` : ''}

## Installation

\`\`\`bash
/plugin marketplace add ${marketplace.repository.replace('https://github.com/', '')}
\`\`\`

${!marketplace.error && marketplace.manifest && marketplace.manifest.plugins.length > 0 ? `## Available Plugins (${marketplace.manifest.plugins.length})

${marketplace.manifest.plugins.map((plugin, index) => {
  const lines = [
    `### ${index + 1}. ${plugin.name}`,
    '',
    plugin.description || 'No description available',
    '',
  ];

  if (plugin.author) {
    lines.push(`**Author**: ${plugin.author}`);
  }

  if (plugin.version) {
    lines.push(`**Version**: ${plugin.version}`);
  }

  if (plugin.tags && plugin.tags.length > 0) {
    lines.push(`**Tags**: ${plugin.tags.join(', ')}`);
  }

  if (plugin.keywords && plugin.keywords.length > 0) {
    lines.push(`**Keywords**: ${plugin.keywords.join(', ')}`);
  }

  lines.push('');

  if (plugin.repository) {
    lines.push(`**Repository**: ${plugin.repository}`);
  }

  if (plugin.homepage) {
    lines.push(`**Homepage**: ${plugin.homepage}`);
  }

  lines.push('');
  lines.push(`**Installation**:`);
  lines.push('```bash');
  lines.push(`/plugin install ${plugin.name}@${marketplace.id}`);
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}).join('\n---\n\n')}` : ''}

${marketplace.error ? `## Error

⚠️ ${marketplace.error}

This marketplace may not be properly configured yet. Please check the repository for updates.` : ''}

## Links

- **Marketplace Details**: https://claudecodemarketplace.com/marketplace/${id}
- **GitHub Repository**: ${marketplace.repository}
${marketplace.homepage && marketplace.homepage !== marketplace.repository ? `- **Homepage**: ${marketplace.homepage}` : ''}

## Related Resources

- **Claude Code**: https://github.com/anthropics/claude-code
- **Documentation**: https://docs.claude.com/en/docs/claude-code
- **All Marketplaces**: https://claudecodemarketplace.com/

---

*Generated: ${new Date().toISOString()}*
*URL: https://claudecodemarketplace.com/marketplace/${id}*
`;

  return (
    <pre style={{
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      fontFamily: 'monospace',
      padding: '20px',
      maxWidth: '100%',
      overflow: 'auto'
    }}>
      {markdown}
    </pre>
  );
}

// Set content type to text/markdown
export const metadata = {
  other: {
    'Content-Type': 'text/markdown; charset=utf-8',
  },
};
