// TypeScript types for match data (matching the backend schemas)

export interface MatchParticipant {
  puuid: string
  participant_id: number
  team_id: number
  champion_id: number
  champion_name: string
  champion_level: number
  kills: number
  deaths: number
  assists: number
  kda_ratio: number
  total_damage_dealt_to_champions: number
  gold_earned: number
  total_minions_killed: number
  vision_score: number
  win: boolean
  items?: Record<string, number>
}

export interface Match {
  match_id: string
  game_creation: string // ISO datetime string
  game_duration: number // in seconds
  duration_minutes: number
  game_mode: string
  game_type: string
  map_id: number
  queue_id: number
  winning_team?: number
  participants?: MatchParticipant[]
}

export interface MatchHistoryResponse {
  puuid: string
  total_matches: number
  matches: Match[]
}

export interface PlayerMatchPerformance {
  match_id: string
  champion_name: string
  kills: number
  deaths: number
  assists: number
  kda_ratio: number
  cs: number
  gold_earned: number
  damage_to_champions: number
  vision_score: number
  win: boolean
  game_duration_minutes: number
  game_creation: string // ISO datetime string
}

// Utility types for queue information
export const QUEUE_TYPES: Record<number, string> = {
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  450: "ARAM",
  400: "Normal Draft",
  430: "Normal Blind",
  700: "Clash",
  830: "Co-op vs AI",
  840: "Co-op vs AI",
  850: "Co-op vs AI",
  900: "URF",
  920: "Poroking"
}

export const MAP_NAMES: Record<number, string> = {
  11: "Summoner's Rift",
  12: "Howling Abyss",
  21: "Nexus Blitz",
  22: "Teamfight Tactics"
}
