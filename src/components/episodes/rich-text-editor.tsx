'use client'

import dynamic from 'next/dynamic'
import type { RichTextEditorProps } from './rich-text-editor-types'

export type { RichTextEditorProps } from './rich-text-editor-types'

// Lazy-load the Tiptap editor (~100-150KB) so it only ships when the editor is
// actually rendered, not on every episode page load.
const RichTextEditorImpl = dynamic(() => import('./rich-text-editor-impl'), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-border-subtle bg-surface-default min-h-[200px]" />
  ),
})

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorImpl {...props} />
}
