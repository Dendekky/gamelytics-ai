from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class LiveGameParticipantResponse(BaseModel):
    """Response schema for live game participant"""
    summoner_name: str
    summoner_level: int
    champion_id: int
    spell1_id: int
    spell2_id: int
    team_id: int
    perks: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class TeamCompositionResponse(BaseModel):
    """Response schema for team composition"""
    your_team: List[LiveGameParticipantResponse]
    enemy_team: List[LiveGameParticipantResponse]


class EnemyPlayerAnalysis(BaseModel):
    """Analysis of individual enemy player"""
    summoner_name: str
    champion_id: int
    summoner_level: int
    threat_level: str = Field(..., description="low, medium, or high")
    threat_reason: str
    counter_strategy: str
    estimated_rank: str = "Unknown"
    win_rate_estimate: Optional[float] = None
    main_role: str = "Unknown"


class TeamThreat(BaseModel):
    """Information about a team threat"""
    summoner_name: str
    champion_id: int
    reason: str
    counter_strategy: str


class TeamComposition(BaseModel):
    """Analysis of team composition"""
    damage_types: Dict[str, int] = {"physical": 0, "magical": 0, "true": 0}
    roles: Dict[str, int] = {"tank": 0, "damage": 0, "support": 0}
    crowd_control: str = "low"  # low, medium, high


class EnemyAnalysisResponse(BaseModel):
    """Response schema for enemy team analysis"""
    team_threats: List[TeamThreat]
    team_composition: TeamComposition
    individual_analysis: List[EnemyPlayerAnalysis]
    recommended_strategies: List[str]


class GameRecommendations(BaseModel):
    """Real-time game recommendations"""
    immediate_actions: List[str]
    item_builds: List[str]
    macro_strategy: List[str]
    warding_spots: List[str]


class LiveGameInfo(BaseModel):
    """Basic live game information"""
    game_id: str
    game_mode: Optional[str] = None
    game_type: Optional[str] = None
    map_id: Optional[int] = None
    queue_id: Optional[int] = None
    game_length: Optional[int] = None  # in seconds
    spectator_delay: Optional[int] = None


class LiveGameStatusResponse(BaseModel):
    """Complete live game status response"""
    is_in_game: bool
    game_info: Optional[LiveGameInfo] = None
    team_composition: Optional[TeamCompositionResponse] = None
    enemy_analysis: Optional[EnemyAnalysisResponse] = None
    recommendations: Optional[GameRecommendations] = None


class LiveGameMonitorResponse(BaseModel):
    """Response for monitoring multiple players"""
    success: bool
    data: Dict[str, Any]  # PUUID -> LiveGameStatusResponse
    region: str
    monitored_count: int


class FeaturedGameParticipant(BaseModel):
    """Participant in a featured game"""
    summoner_name: str
    champion_id: int
    team_id: int
    spell1_id: int
    spell2_id: int


class FeaturedGame(BaseModel):
    """Featured game from Riot API"""
    game_id: str
    game_mode: str
    game_length: int
    map_id: int
    participants: List[FeaturedGameParticipant]


class FeaturedGamesResponse(BaseModel):
    """Response for featured games"""
    game_list: List[FeaturedGame]
    client_refresh_interval: int


class LiveGameRecommendationsResponse(BaseModel):
    """Response for live game recommendations"""
    recommendations: GameRecommendations
    game_time_minutes: int
    game_phase: str = Field(..., description="early, mid, or late")
    next_major_objective: str


class CacheStatusResponse(BaseModel):
    """Cache status response"""
    total_entries: int
    size_estimate_mb: float
    oldest_entry_age_seconds: Optional[float] = None
    newest_entry_age_seconds: Optional[float] = None
    cleanup_task_running: bool


# Request schemas
class LiveGameAnalysisRequest(BaseModel):
    """Request for live game analysis"""
    puuid: str
    region: str = "na1"
    include_detailed_analysis: bool = True


class MonitorPlayersRequest(BaseModel):
    """Request to monitor multiple players"""
    puuids: List[str] = Field(..., max_items=10, description="List of PUUIDs to monitor")
    region: str = "na1"


# Error responses
class LiveGameErrorResponse(BaseModel):
    """Error response for live game endpoints"""
    success: bool = False
    error: str
    details: Optional[str] = None


# Champion counter information
class ChampionCounter(BaseModel):
    """Counter information for a specific champion"""
    champion_id: int
    counter_strategy: str
    difficulty: str = Field(..., description="easy, medium, or hard")
    key_abilities_to_avoid: List[str]
    recommended_items: List[str]


class LiveGameAnalyticsData(BaseModel):
    """Analytics data for live games"""
    total_games_detected: int
    average_game_length: float
    most_common_champions: List[Dict[str, Any]]
    win_rate_by_role: Dict[str, float]
    threat_level_distribution: Dict[str, int]


# Response wrappers
class LiveGameAPIResponse(BaseModel):
    """Generic API response wrapper"""
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    region: Optional[str] = None
    
    class Config:
        from_attributes = True


class SummonerLiveGameResponse(BaseModel):
    """Response including summoner info with live game status"""
    success: bool
    data: LiveGameStatusResponse
    region: str
    summoner: Dict[str, Any]  # Summoner info
