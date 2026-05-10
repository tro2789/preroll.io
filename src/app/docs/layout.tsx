import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'PreRoll Docs',
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
  );
}
