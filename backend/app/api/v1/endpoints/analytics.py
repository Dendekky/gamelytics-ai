from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("/{puuid}")
async def get_analytics(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    Get performance analytics for a summoner
    """
    # TODO: Implement analytics calculation
    return {"message": "Analytics endpoint - coming soon"} 