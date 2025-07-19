from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.summoner import SummonerCreate, SummonerResponse
from app.services.riot_client import RiotClient

router = APIRouter()


@router.post("/lookup", response_model=SummonerResponse)
async def lookup_summoner(
    summoner_data: SummonerCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Look up a summoner by name and region
    """
    try:
        riot_client = RiotClient()
        summoner_info = await riot_client.get_summoner_by_name(
            summoner_data.name, summoner_data.region
        )
        
        if not summoner_info:
            raise HTTPException(status_code=404, detail="Summoner not found")
        
        return SummonerResponse(
            puuid=summoner_info["puuid"],
            summoner_id=summoner_info["id"],
            account_id=summoner_info["accountId"],
            name=summoner_info["name"],
            level=summoner_info["summonerLevel"],
            region=summoner_data.region,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error looking up summoner: {str(e)}")


@router.get("/{puuid}", response_model=SummonerResponse)
async def get_summoner(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Get summoner information by PUUID
    """
    # TODO: Implement database lookup
    raise HTTPException(status_code=501, detail="Not implemented yet") 