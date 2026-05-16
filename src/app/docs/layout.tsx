import type { ReactNode } from 'react';
import { lazy } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { SearchProvider } from 'fumadocs-ui/contexts/search';
import { source } from '@/lib/source';

const DefaultSearchDialog = lazy(
  () => import('fumadocs-ui/components/dialog/search-default'),
);

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <SearchProvider SearchDialog={DefaultSearchDialog}>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: 'preroll.io docs',
          url: '/docs',
        }}
        themeSwitch={{ enabled: false }}
        links={[
          { text: 'Sign In', url: '/login' },
          { text: 'Get Started', url: '/signup' },
        ]}
      >
        {children}
      </DocsLayout>
    </SearchProvider>
  );
}
