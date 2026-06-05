export interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  limit?: number
  placeholder?: string
  className?: string
}
