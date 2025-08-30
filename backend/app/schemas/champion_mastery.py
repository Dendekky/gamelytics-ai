from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChampionMasteryResponse(BaseModel):
    """Response schema for champion mastery data"""
    champion_id: int
    mastery_level: int
    mastery_points: int
    points_until_next_level: Optional[int] = None
    chest_granted: bool = False
    tokens_earned: int = 0
    last_play_time: Optional[str] = None  # ISO format datetime string
    mastery_progress_percentage: float
    updated_at: Optional[str] = None  # ISO format datetime string
    
    class Config:
        from_attributes = True


class ChampionMasteryListResponse(BaseModel):
    """Response schema for list of champion masteries"""
    masteries: List[ChampionMasteryResponse]
    total_count: int


class ChampionMasterySummaryResponse(BaseModel):
    """Response schema for champion mastery summary statistics"""
    total_champions: int
    total_mastery_points: int
    mastery_7_count: int
    mastery_6_count: int
    mastery_5_count: int
    average_mastery_level: float
    highest_mastery_points: int


class ChampionMasteryWithPerformance(BaseModel):
    """Enhanced champion mastery with performance data"""
    champion_id: int
    champion_name: str = "Unknown Champion"
    mastery_level: int
    mastery_points: int
    points_until_next_level: Optional[int] = None
    chest_granted: bool = False
    tokens_earned: int = 0
    last_play_time: Optional[str] = None
    mastery_progress_percentage: float
    
    # Performance data from matches
    total_games_played: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float = 0.0
    avg_kda: float = 0.0
    avg_cs_per_min: float = 0.0
    last_played_match: Optional[str] = None  # ISO format datetime string


class ChampionMasteryEnhancedResponse(BaseModel):
    """Enhanced response with performance data"""
    masteries: List[ChampionMasteryWithPerformance]
    summary: ChampionMasterySummaryResponse
    total_count: int
