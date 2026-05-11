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

  if (size === 'compact') {
    return (
      <div className="flex items-center" role="list" aria-label="Episode pipeline stages">
        {sorted.map((stage, i) => {
          const isCompleted = currentIndex >= 0 && i < currentIndex
          const isCurrent = i === currentIndex

          return (
            <div key={stage.id} className="flex items-center" role="listitem">
              {i > 0 && (
                <div className={`w-4 h-px ${isCompleted || isCurrent ? 'bg-text-secondary' : 'bg-text-tertiary/40'}`} />
              )}
              <div
                className={`rounded-full shrink-0 ${
                  isCurrent
                    ? 'h-3 w-3 bg-text-primary ring-2 ring-text-primary/25'
                    : isCompleted
                      ? 'h-2.5 w-2.5 bg-text-secondary'
                      : 'h-2.5 w-2.5 border-2 border-text-tertiary/50 bg-transparent'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative flex justify-between" role="list" aria-label="Episode pipeline stages">
      {sorted.map((stage, i) => {
        const isCompleted = currentIndex >= 0 && i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={stage.id} className="relative flex flex-col items-center flex-1" role="listitem">
            {i > 0 && (
              <div
                className={`absolute top-[7px] right-1/2 w-full h-px ${
                  isCompleted || isCurrent ? 'bg-text-secondary' : 'bg-text-tertiary/40'
                }`}
              />
            )}

            <div
              className={`relative z-10 rounded-full shrink-0 ${
                isCurrent
                  ? 'h-4 w-4 bg-text-primary ring-2 ring-text-primary/25'
                  : isCompleted
                    ? 'h-3.5 w-3.5 bg-text-secondary'
                    : 'h-3.5 w-3.5 border-2 border-text-tertiary/50 bg-transparent'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            />

            <span
              className={`mt-1.5 text-[11px] leading-tight whitespace-nowrap ${
                isCurrent
                  ? 'text-text-primary font-medium'
                  : isCompleted
                    ? 'text-text-secondary'
                    : 'text-text-secondary'
              }`}
            >
              {stage.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
