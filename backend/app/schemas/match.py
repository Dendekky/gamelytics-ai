from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class MatchParticipantResponse(BaseModel):
    """Response schema for match participant data"""
    puuid: str = Field(..., description="Player PUUID")
    participant_id: int = Field(..., description="Participant ID (1-10)")
    team_id: int = Field(..., description="Team ID (100 or 200)")
    
    # Champion info
    champion_id: int = Field(..., description="Champion ID")
    champion_name: str = Field(..., description="Champion name")
    champion_level: int = Field(..., description="Champion level achieved")
    
    # KDA
    kills: int = Field(..., description="Kills")
    deaths: int = Field(..., description="Deaths")
    assists: int = Field(..., description="Assists")
    kda_ratio: float = Field(..., description="KDA ratio (kills + assists) / deaths")
    
    # Performance metrics
    total_damage_dealt_to_champions: int = Field(..., description="Damage to champions")
    gold_earned: int = Field(..., description="Gold earned")
    total_minions_killed: int = Field(..., description="CS (Creep Score)")
    vision_score: int = Field(..., description="Vision score")
    
    # Match outcome
    win: bool = Field(..., description="Whether the player won")
    
    # Items
    items: Optional[Dict[str, int]] = Field(None, description="Item build")
    
    class Config:
        from_attributes = True


class MatchResponse(BaseModel):
    """Response schema for match data"""
    match_id: str = Field(..., description="Match ID")
    game_creation: datetime = Field(..., description="When the match was created")
    game_duration: int = Field(..., description="Match duration in seconds")
    duration_minutes: float = Field(..., description="Match duration in minutes")
    
    # Game info
    game_mode: str = Field(..., description="Game mode")
    game_type: str = Field(..., description="Game type")
    map_id: int = Field(..., description="Map ID")
    queue_id: int = Field(..., description="Queue type ID")
    
    # Outcome
    winning_team: Optional[int] = Field(None, description="Winning team ID (100 or 200)")
    
    # Participants (optional, can be loaded separately)
    participants: Optional[List[MatchParticipantResponse]] = Field(None, description="Match participants")
    
    class Config:
        from_attributes = True


class MatchHistoryRequest(BaseModel):
    """Request schema for match history"""
    puuid: str = Field(..., description="Player PUUID")
    count: int = Field(10, ge=1, le=100, description="Number of matches to fetch (1-100)")
    fetch_new: bool = Field(False, description="Whether to fetch new matches from Riot API")


class MatchHistoryResponse(BaseModel):
    """Response schema for match history"""
    puuid: str = Field(..., description="Player PUUID")
    total_matches: int = Field(..., description="Total matches found")
    matches: List[MatchResponse] = Field(..., description="List of matches")


class MatchDetailRequest(BaseModel):
    """Request schema for detailed match info"""
    match_id: str = Field(..., description="Match ID")
    include_participants: bool = Field(True, description="Include participant data")


class PlayerMatchPerformance(BaseModel):
    """Schema for a player's performance in a specific match"""
    match_id: str = Field(..., description="Match ID")
    champion_name: str = Field(..., description="Champion played")
    kills: int = Field(..., description="Kills")
    deaths: int = Field(..., description="Deaths")
    assists: int = Field(..., description="Assists")
    kda_ratio: float = Field(..., description="KDA ratio")
    cs: int = Field(..., description="Creep Score")
    gold_earned: int = Field(..., description="Gold earned")
    damage_to_champions: int = Field(..., description="Damage dealt to champions")
    vision_score: int = Field(..., description="Vision score")
    win: bool = Field(..., description="Match result")
    game_duration_minutes: float = Field(..., description="Game duration in minutes")
    game_creation: datetime = Field(..., description="When the match was played")
    
    class Config:
        from_attributes = True
