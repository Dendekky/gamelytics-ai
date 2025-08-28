from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date


class PlayerOverviewStats(BaseModel):
    """Overview statistics for a player"""
    total_games: int = Field(..., description="Total games played")
    wins: int = Field(..., description="Number of wins")
    losses: int = Field(..., description="Number of losses")
    win_rate: float = Field(..., description="Win rate percentage")
    avg_kda: float = Field(..., description="Average KDA ratio")
    avg_kills: float = Field(..., description="Average kills per game")
    avg_deaths: float = Field(..., description="Average deaths per game")
    avg_assists: float = Field(..., description="Average assists per game")
    avg_cs_per_min: float = Field(..., description="Average CS per minute")
    avg_vision_score: float = Field(..., description="Average vision score")
    total_playtime_hours: float = Field(..., description="Total playtime in hours")
    timeframe_days: int = Field(..., description="Timeframe in days")
    
    class Config:
        from_attributes = True


class ChampionPerformance(BaseModel):
    """Performance statistics for a specific champion"""
    champion_name: str = Field(..., description="Champion name")
    champion_id: int = Field(..., description="Champion ID")
    total_games: int = Field(..., description="Total games played")
    wins: int = Field(..., description="Number of wins")
    losses: int = Field(..., description="Number of losses")
    win_rate: float = Field(..., description="Win rate percentage")
    avg_kda: float = Field(..., description="Average KDA ratio")
    avg_kills: float = Field(..., description="Average kills per game")
    avg_deaths: float = Field(..., description="Average deaths per game")
    avg_assists: float = Field(..., description="Average assists per game")
    avg_cs_per_min: float = Field(..., description="Average CS per minute")
    avg_damage_to_champions: float = Field(..., description="Average damage to champions")
    avg_vision_score: float = Field(..., description="Average vision score")
    last_played: datetime = Field(..., description="Last time this champion was played")
    
    class Config:
        from_attributes = True


class PerformanceTrendData(BaseModel):
    """Daily performance trend data"""
    date: str = Field(..., description="Date (YYYY-MM-DD)")
    total_games: int = Field(..., description="Games played on this date")
    wins: int = Field(..., description="Wins on this date")
    win_rate: float = Field(..., description="Win rate for this date")
    avg_kda: float = Field(..., description="Average KDA for this date")
    avg_cs_per_min: float = Field(..., description="Average CS per minute for this date")
    
    class Config:
        from_attributes = True


class PerformanceTrends(BaseModel):
    """Performance trends over time"""
    trend_data: List[PerformanceTrendData] = Field(..., description="Daily trend data")
    win_rate_trend: str = Field(..., description="Win rate trend (improving/declining/stable/insufficient_data)")
    kda_trend: str = Field(..., description="KDA trend (improving/declining/stable/insufficient_data)")
    cs_trend: str = Field(..., description="CS trend (improving/declining/stable/insufficient_data)")
    
    class Config:
        from_attributes = True


class GPIMetrics(BaseModel):
    """GPI-style performance metrics (0-10 scale)"""
    aggression: float = Field(..., ge=0, le=10, description="Aggression score (kills, damage, combat participation)")
    farming: float = Field(..., ge=0, le=10, description="Farming score (CS per minute)")
    survivability: float = Field(..., ge=0, le=10, description="Survivability score (deaths per game)")
    vision: float = Field(..., ge=0, le=10, description="Vision score (ward placement and vision control)")
    versatility: float = Field(..., ge=0, le=10, description="Versatility score (champion pool diversity)")
    consistency: float = Field(..., ge=0, le=10, description="Consistency score (win rate and performance variance)")
    
    class Config:
        from_attributes = True


class RecentMatchPerformance(BaseModel):
    """Detailed performance data for a recent match"""
    match_id: str = Field(..., description="Match ID")
    game_creation: datetime = Field(..., description="When the match was played")
    duration_minutes: float = Field(..., description="Match duration in minutes")
    champion_name: str = Field(..., description="Champion played")
    champion_id: int = Field(..., description="Champion ID")
    kills: int = Field(..., description="Kills")
    deaths: int = Field(..., description="Deaths")
    assists: int = Field(..., description="Assists")
    kda_ratio: float = Field(..., description="KDA ratio")
    cs: int = Field(..., description="Total creep score")
    cs_per_min: float = Field(..., description="CS per minute")
    damage_to_champions: int = Field(..., description="Damage dealt to champions")
    damage_per_min: float = Field(..., description="Damage per minute")
    vision_score: int = Field(..., description="Vision score")
    gold_earned: int = Field(..., description="Gold earned")
    win: bool = Field(..., description="Match result")
    performance_score: float = Field(..., description="Calculated performance score")
    queue_id: int = Field(..., description="Queue type ID")
    game_mode: str = Field(..., description="Game mode")
    
    class Config:
        from_attributes = True


class AnalyticsRequest(BaseModel):
    """Request schema for analytics data"""
    puuid: str = Field(..., description="Player PUUID")
    days: int = Field(30, ge=1, le=365, description="Number of days to analyze (1-365)")


class ComprehensiveAnalytics(BaseModel):
    """Comprehensive analytics response combining all metrics"""
    puuid: str = Field(..., description="Player PUUID")
    overview_stats: PlayerOverviewStats = Field(..., description="Overview statistics")
    champion_performance: List[ChampionPerformance] = Field(..., description="Per-champion performance")
    performance_trends: PerformanceTrends = Field(..., description="Performance trends over time")
    gpi_metrics: GPIMetrics = Field(..., description="GPI-style metrics")
    recent_matches: List[RecentMatchPerformance] = Field(..., description="Recent match performance")
    generated_at: datetime = Field(..., description="When this analysis was generated")
    
    class Config:
        from_attributes = True


class InsightData(BaseModel):
    """Performance insight or recommendation"""
    type: str = Field(..., description="Insight type (strength/weakness/recommendation)")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed description")
    metric_value: Optional[float] = Field(None, description="Associated metric value")
    priority: str = Field(..., description="Priority level (high/medium/low)")
    
    class Config:
        from_attributes = True


class PerformanceInsights(BaseModel):
    """AI-generated insights and recommendations"""
    puuid: str = Field(..., description="Player PUUID")
    insights: List[InsightData] = Field(..., description="List of insights and recommendations")
    summary: str = Field(..., description="Overall performance summary")
    top_strength: str = Field(..., description="Top identified strength")
    primary_weakness: str = Field(..., description="Primary area for improvement")
    generated_at: datetime = Field(..., description="When insights were generated")
    
    class Config:
        from_attributes = True
