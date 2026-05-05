interface BreadcrumbItem {
  id: string
  name: string
  path?: string
}

interface FilePickerBreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (path?: string) => void
}

export function FilePickerBreadcrumb({ items, onNavigate }: FilePickerBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
      {items.map((item, idx) => (
        <span key={item.id} className="flex items-center gap-1 shrink-0">
          {idx > 0 && <span className="text-text-tertiary">/</span>}
          {idx < items.length - 1 ? (
            <button
              onClick={() => onNavigate(item.path)}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              {item.name}
            </button>
          ) : (
            <span className="text-text-primary font-medium">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
