interface Stage {
  id: string
  name: string
  position: number
}

interface PipelineProgressProps {
  stages: Stage[]
  currentStageId: string | null
  size?: 'compact' | 'default'
}

export function PipelineProgress({
  stages,
  currentStageId,
  size = 'default',
}: PipelineProgressProps) {
  if (stages.length === 0) {
    return null
  }

  const sorted = [...stages].sort((a, b) => a.position - b.position)
  const currentIndex = currentStageId
    ? sorted.findIndex((s) => s.id === currentStageId)
    : -1

  const isCompact = size === 'compact'
  const dotSize = isCompact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'
  const currentDotSize = isCompact ? 'h-3 w-3' : 'h-4.5 w-4.5'
  const connectorWidth = isCompact ? 'w-4' : 'w-8'

  return (
    <div className="flex items-center" role="list" aria-label="Episode pipeline stages">
      {sorted.map((stage, i) => {
        const isCompleted = currentIndex >= 0 && i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={stage.id} className="flex items-center" role="listitem">
            {/* Connector line before dot (skip first) */}
            {i > 0 && (
              <div
                className={`${connectorWidth} h-px ${
                  isCompleted || isCurrent
                    ? 'bg-accent/50'
                    : 'bg-border-subtle'
                }`}
              />
            )}

            {/* Dot + label group */}
            <div className={`flex flex-col items-center ${isCompact ? '' : 'gap-1.5'}`}>
              {/* Dot */}
              <div
                className={`rounded-full shrink-0 ${
                  isCurrent
                    ? `${currentDotSize} bg-accent ring-2 ring-accent/25`
                    : isCompleted
                      ? `${dotSize} bg-accent/50`
                      : `${dotSize} border ${isCompact ? 'border-border-subtle' : 'border-border-default'} bg-transparent`
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              />

              {/* Label (default mode only) */}
              {!isCompact && (
                <span
                  className={`text-[11px] leading-tight whitespace-nowrap ${
                    isCurrent
                      ? 'text-accent font-medium'
                      : isCompleted
                        ? 'text-text-secondary'
                        : 'text-text-tertiary'
                  }`}
                >
                  {stage.name}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
