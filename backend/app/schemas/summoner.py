from pydantic import BaseModel, Field
from typing import Optional


class SummonerCreate(BaseModel):
    name: str = Field(..., description="Summoner name (DEPRECATED - use SummonerCreateByRiotId instead)")
    region: str = Field(..., description="League region (e.g., na1, euw1)")


class SummonerCreateByRiotId(BaseModel):
    game_name: str = Field(..., description="Riot ID game name (the part before #)")
    tag_line: str = Field(..., description="Riot ID tag line (the part after #)")
    region: str = Field(..., description="League region (e.g., na1, euw1)")


class SummonerResponse(BaseModel):
    puuid: str = Field(..., description="Player Universally Unique Identifier")
    # summoner_id: str = Field(..., description="Summoner ID")
    # account_id: str = Field(..., description="Account ID")
    # name: Optional[str] = Field(None, description="Summoner name (DEPRECATED)")
    game_name: Optional[str] = Field(None, description="Riot ID game name")
    tag_line: Optional[str] = Field(None, description="Riot ID tag line")
    level: int = Field(..., description="Summoner level")
    revision_date: int = Field(..., description="Revision date")
    region: str = Field(..., description="League region")
    
    class Config:
        from_attributes = True 