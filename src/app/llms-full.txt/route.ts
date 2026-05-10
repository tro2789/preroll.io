import { source } from '@/lib/source';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const revalidate = false;

export async function GET() {
  const pages = source.getPages();
  const content: string[] = [
    '# preroll.io Documentation (Full)',
    '',
    'preroll.io is an API-first podcast production management platform for service providers.',
    'This document contains the complete documentation for reference.',
    '',
  ];

  for (const page of pages) {
    const filePath = join(process.cwd(), 'content/docs', `${page.slugs.join('/')}.mdx`);
    let mdxContent = '';
    try {
      const raw = await readFile(filePath, 'utf-8');
      // Strip frontmatter
      mdxContent = raw.replace(/^---[\s\S]*?---\n*/, '');
    } catch {
      // File path might differ (e.g. index.mdx)
    }

    content.push('---');
    content.push(`## ${page.data.title}`);
    if (page.data.description) {
      content.push(`> ${page.data.description}`);
    }
    content.push(`URL: /docs/${page.slugs.join('/')}`);
    content.push('');
    if (mdxContent) {
      content.push(mdxContent);
    }
    content.push('');
  }

  return new Response(content.join('\n'));
}
