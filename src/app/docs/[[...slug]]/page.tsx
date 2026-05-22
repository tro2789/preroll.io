import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { AIActions } from '@/components/docs/ai-actions';

function docsBreadcrumbJsonLd(slug: string, title: string) {
  const segments = slug ? slug.split('/') : [];
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Docs', item: 'https://preroll.io/docs' },
    ...segments.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 2,
      name: i === segments.length - 1 ? title : s.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      item: `https://preroll.io/docs/${segments.slice(0, i + 1).join('/')}`,
    })),
  ];
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const slug = params.slug?.join('/') ?? '';
  const jsonLd = docsBreadcrumbJsonLd(slug, page.data.title);

  return (
    <DocsPage toc={page.data.toc}>
      {/* Structured data sourced from local MDX metadata, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <AIActions slug={slug} title={page.data.title} />
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) return {};
  const slug = params.slug?.join('/') ?? '';
  const url = `https://preroll.io/docs${slug ? `/${slug}` : ''}`;
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${page.data.title} | PreRoll.io Docs`,
      description: page.data.description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${page.data.title} | PreRoll.io Docs`,
      description: page.data.description,
    },
  };
}
