// Role performance type definitions

export interface RoleStats {
  role: string
  total_games: number
  wins: number
  losses: number
  win_rate: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_kda: number
  avg_cs_per_min: number
  avg_damage_to_champions: number
  avg_vision_score: number
  avg_gold_earned: number
  performance_score: number
  games_percentage: number
}

export interface RolePerformanceData {
  role_stats: RoleStats[]
  total_games: number
  most_played_role: string | null
  best_performing_role: string | null
  role_distribution: Record<string, number>
  timeframe_days: number
}

export interface RoleBenchmarks {
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_kda: number
  avg_cs: number
  avg_cs_per_min: number
  avg_damage: number
  avg_gold: number
  avg_vision: number
}

export interface RoleBenchmarkData {
  role: string
  total_games: number
  win_rate: number
  benchmarks: RoleBenchmarks
  insights: string[]
  recommendations: string[]
  timeframe_days: number
}

// Role mapping for display
export const ROLE_NAMES: Record<string, string> = {
  "TOP": "Top Lane",
  "JUNGLE": "Jungle", 
  "MIDDLE": "Mid Lane",
  "BOTTOM": "Bot Lane (ADC)",
  "UTILITY": "Support",
  "UNKNOWN": "Unknown"
}

export const ROLE_ICONS: Record<string, string> = {
  "TOP": "⚔️",
  "JUNGLE": "🌿",
  "MIDDLE": "⚡",
  "BOTTOM": "🏹",
  "UTILITY": "🛡️",
  "UNKNOWN": "❓"
}

export const ROLE_COLORS: Record<string, string> = {
  "TOP": "text-red-400",
  "JUNGLE": "text-green-400", 
  "MIDDLE": "text-blue-400",
  "BOTTOM": "text-yellow-400",
  "UTILITY": "text-purple-400",
  "UNKNOWN": "text-gray-400"
}
