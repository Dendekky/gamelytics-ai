from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("/{puuid}")
async def get_matches(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Get match history for a summoner
    """
    # TODO: Implement match history fetching
    return {"message": "Match history endpoint - coming soon"} 