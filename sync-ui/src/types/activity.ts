// Activity and heatmap type definitions

export interface HeatmapDataPoint {
  day: string
  hour: number
  games: number
  intensity: number // 0-1 normalized value
}

export interface DailyStat {
  day: string
  games: number
  percentage: number
}

export interface HourlyStat {
  hour: number
  games: number
  percentage: number
}

export interface ActivityHeatmapData {
  heatmap_data: HeatmapDataPoint[]
  total_games: number
  total_hours_played: number
  peak_hour: number | null
  peak_day: string | null
  activity_pattern: string
  daily_stats: DailyStat[]
  hourly_stats: HourlyStat[]
  timeframe_days: number
}
