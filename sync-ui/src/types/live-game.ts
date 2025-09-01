// Live Game Types for Frontend
export interface LiveGameParticipant {
  summoner_name: string;
  summoner_level: number;
  champion_id: number;
  spell1_id: number;
  spell2_id: number;
  team_id: number;
  perks?: {
    perkStyle?: number;
    perkSubStyle?: number;
    [key: string]: any;
  };
}

export interface TeamComposition {
  your_team: LiveGameParticipant[];
  enemy_team: LiveGameParticipant[];
}

export interface EnemyPlayerAnalysis {
  summoner_name: string;
  champion_id: number;
  summoner_level: number;
  threat_level: 'low' | 'medium' | 'high';
  threat_reason: string;
  counter_strategy: string;
  estimated_rank?: string;
  win_rate_estimate?: number;
  main_role?: string;
}

export interface TeamThreat {
  summoner_name: string;
  champion_id: number;
  reason: string;
  counter_strategy: string;
}

export interface TeamCompositionAnalysis {
  damage_types: {
    physical: number;
    magical: number;
    true: number;
  };
  roles: {
    tank: number;
    damage: number;
    support: number;
  };
  crowd_control: 'low' | 'medium' | 'high';
}

export interface EnemyAnalysis {
  team_threats: TeamThreat[];
  team_composition: TeamCompositionAnalysis;
  individual_analysis: EnemyPlayerAnalysis[];
  recommended_strategies: string[];
}

export interface GameRecommendations {
  immediate_actions: string[];
  item_builds: string[];
  macro_strategy: string[];
  warding_spots: string[];
}

export interface LiveGameInfo {
  game_id: string;
  game_mode?: string;
  game_type?: string;
  map_id?: number;
  queue_id?: number;
  game_length?: number; // in seconds
  spectator_delay?: number;
}

export interface LiveGameStatus {
  is_in_game: boolean;
  game_info?: LiveGameInfo;
  team_composition?: TeamComposition;
  enemy_analysis?: EnemyAnalysis;
  recommendations?: GameRecommendations;
}

export interface LiveGameResponse {
  success: boolean;
  data: LiveGameStatus;
  region: string;
  summoner: {
    puuid: string;
    summoner_name: string;
    region: string;
  };
}

export interface FeaturedGameParticipant {
  summoner_name: string;
  champion_id: number;
  team_id: number;
  spell1_id: number;
  spell2_id: number;
}

export interface FeaturedGame {
  game_id: string;
  game_mode: string;
  game_length: number;
  map_id: number;
  participants: FeaturedGameParticipant[];
}

export interface LiveGameRecommendationsResponse {
  recommendations: GameRecommendations;
  game_time_minutes: number;
  game_phase: 'early' | 'mid' | 'late';
  next_major_objective: string;
}

// Live game notification types
export interface LiveGameNotification {
  type: 'game_start' | 'game_end' | 'threat_detected' | 'objective_reminder';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  game_id?: string;
}

// Live game monitoring types
export interface PlayerMonitorStatus {
  puuid: string;
  summoner_name: string;
  is_in_game: boolean;
  game_status?: LiveGameStatus;
  last_checked: Date;
}

export interface MultiPlayerMonitorResponse {
  success: boolean;
  data: Record<string, LiveGameStatus>; // PUUID -> LiveGameStatus
  region: string;
  monitored_count: number;
}

// Champion counter types
export interface ChampionCounter {
  champion_id: number;
  counter_strategy: string;
  difficulty: 'easy' | 'medium' | 'hard';
  key_abilities_to_avoid: string[];
  recommended_items: string[];
}

// Threat level colors for UI
export const THREAT_LEVEL_COLORS = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400'
} as const;

export const THREAT_LEVEL_BACKGROUNDS = {
  low: 'bg-green-900/20 border-green-500/30',
  medium: 'bg-yellow-900/20 border-yellow-500/30',
  high: 'bg-red-900/20 border-red-500/30'
} as const;

// Game phase colors
export const GAME_PHASE_COLORS = {
  early: 'text-blue-400',
  mid: 'text-yellow-400',
  late: 'text-red-400'
} as const;

// Team ID constants
export const TEAM_IDS = {
  BLUE: 100,
  RED: 200
} as const;
