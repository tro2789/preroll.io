'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  limit?: number
  placeholder?: string
  className?: string
}

export function RichTextEditor({ content, onChange, limit = 4000, placeholder, className = '' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline underline-offset-2' },
      }),
      CharacterCount.configure({ limit }),
      Placeholder.configure({ placeholder: placeholder || 'Write show notes...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose-sm focus:outline-none min-h-[200px] max-h-[50vh] overflow-y-auto px-3 py-2 text-xs text-text-primary leading-relaxed',
      },
    },
  })

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  const charCount = editor.storage.characterCount.characters()
  const overLimit = charCount > limit

  return (
    <div className={`rounded-md border border-border-subtle bg-surface-default ${className}`}>
      <div className="flex items-center gap-1 border-b border-border-subtle px-2 py-1.5">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13" />
            <text x="1" y="8" className="text-[8px] fill-current" fontFamily="system-ui">1</text>
            <text x="1" y="14" className="text-[8px] fill-current" fontFamily="system-ui">2</text>
            <text x="1" y="20" className="text-[8px] fill-current" fontFamily="system-ui">3</text>
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={setLink}
          label="Link"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.522a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.188" />
          </svg>
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <div className={`flex items-center justify-end px-3 py-1.5 border-t border-border-subtle text-xs tabular-nums ${overLimit ? 'text-red-400' : 'text-text-secondary'}`}>
        {charCount.toLocaleString()} / {limit.toLocaleString()}
      </div>
    </div>
  )
}

function ToolbarButton({ active, onClick, label, children }: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded px-1.5 py-1 text-xs transition-colors ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}
