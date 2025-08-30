// Champion mastery type definitions

export interface ChampionMastery {
  champion_id: number
  mastery_level: number
  mastery_points: number
  points_until_next_level?: number | null
  chest_granted: boolean
  tokens_earned: number
  last_play_time?: string | null
  mastery_progress_percentage: number
  updated_at?: string | null
}

export interface ChampionMasteryWithPerformance extends ChampionMastery {
  champion_name: string
  total_games_played: number
  wins: number
  losses: number
  win_rate: number
  avg_kda: number
  avg_cs_per_min: number
  last_played_match?: string | null
}

export interface ChampionMasterySummary {
  total_champions: number
  total_mastery_points: number
  mastery_7_count: number
  mastery_6_count: number
  mastery_5_count: number
  average_mastery_level: number
  highest_mastery_points: number
}

export interface ChampionMasteryResponse {
  masteries: ChampionMasteryWithPerformance[]
  summary: ChampionMasterySummary
  total_count: number
}
