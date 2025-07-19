from pydantic import BaseModel, Field
from typing import Optional


class SummonerCreate(BaseModel):
    name: str = Field(..., description="Summoner name")
    region: str = Field(..., description="League region (e.g., na1, euw1)")


class SummonerResponse(BaseModel):
    puuid: str = Field(..., description="Player Universally Unique Identifier")
    summoner_id: str = Field(..., description="Summoner ID")
    account_id: str = Field(..., description="Account ID")
    name: str = Field(..., description="Summoner name")
    level: int = Field(..., description="Summoner level")
    region: str = Field(..., description="League region")
    
    class Config:
        from_attributes = True 