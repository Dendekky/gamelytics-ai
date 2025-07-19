from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.summoner import SummonerCreate, SummonerCreateByRiotId, SummonerResponse
from app.services.riot_client import RiotClient

router = APIRouter()


@router.post("/lookup", response_model=SummonerResponse)
async def lookup_summoner(
    summoner_data: SummonerCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Look up a summoner by name and region
    
    **DEPRECATED**: This endpoint uses the deprecated Summoner by-name API which may return 403 errors.
    Use `/lookup-by-riot-id` instead with Riot ID format (gameName#tagLine).
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
            name=summoner_info.get("name"),  # May be None due to deprecation
            game_name=None,  # Not available from old endpoint
            tag_line=None,   # Not available from old endpoint
            level=summoner_info["summonerLevel"],
            region=summoner_data.region,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error looking up summoner: {str(e)}")


@router.post("/lookup-by-riot-id", response_model=SummonerResponse)
async def lookup_summoner_by_riot_id(
    summoner_data: SummonerCreateByRiotId,
    db: AsyncSession = Depends(get_db),
):
    """
    Look up a summoner by Riot ID (gameName#tagLine) and region
    
    **RECOMMENDED**: This is the modern way to look up summoners using the Account-v1 API.
    Riot IDs have the format: gameName#tagLine (e.g., "PlayerName#1234")
    """
    try:
        riot_client = RiotClient()
        summoner_info = await riot_client.get_summoner_by_riot_id(
            summoner_data.game_name, summoner_data.tag_line, summoner_data.region
        )
        print(f"SUMMONER INFO: {summoner_info}")
        
        if not summoner_info:
            raise HTTPException(status_code=404, detail="Summoner not found")
        
        return SummonerResponse(
            puuid=summoner_info["puuid"],
            # summoner_id=summoner_info["id"] or None,
            # account_id=summoner_info["accountId"] or None,
            # name=summoner_info.get("name") or None,  # Legacy field, may be None
            game_name=summoner_info.get("gameName"),
            tag_line=summoner_info.get("tagLine"),
            level=summoner_info["summonerLevel"],
            revision_date=summoner_info["revisionDate"],
            # region=summoner_data.region,
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