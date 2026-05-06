export interface EpisodeTag {
  id: string
  name: string
  color: string
}

export interface KanbanEpisode {
  id: string
  title: string
  episode_number: number | null
  status: string
  stage_id: string | null
  position: number
  scheduled_publish_date: string | null
  show_id: string
  tags?: EpisodeTag[]
  [key: string]: unknown
}

export interface KanbanColumn {
  id: string
  name: string
  stageIds: string[]
  wipLimit: number | null
}
