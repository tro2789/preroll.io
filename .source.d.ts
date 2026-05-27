// Type declarations for the Fumadocs auto-generated .source directory.
// These files are generated at build time by fumadocs-mdx and are gitignored,
// so this declaration file ensures tsc --noEmit passes in CI before a build.

declare module '@/.source/server' {
  import type { Source } from 'fumadocs-core/source';

  export const docs: {
    toFumadocsSource: () => Source<{
      pageData: Record<string, unknown>;
      metaData: Record<string, unknown>;
    }>;
  };
}
