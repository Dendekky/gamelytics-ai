from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from datetime import datetime

from app.models.summoner import Summoner
from app.schemas.summoner import SummonerResponse


class SummonerService:
    """Service for managing summoner data in the database"""
    
    @staticmethod
    async def get_summoner_by_puuid(db: AsyncSession, puuid: str) -> Optional[Summoner]:
        """Get summoner by PUUID"""
        result = await db.execute(select(Summoner).where(Summoner.puuid == puuid))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_summoner_by_riot_id(db: AsyncSession, game_name: str, tag_line: str) -> Optional[Summoner]:
        """Get summoner by Riot ID (game_name#tag_line)"""
        result = await db.execute(
            select(Summoner).where(
                Summoner.game_name == game_name,
                Summoner.tag_line == tag_line
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_or_update_summoner(
        db: AsyncSession,
        puuid: str,
        game_name: str,
        tag_line: str,
        summoner_level: int,
        revision_date: int,
        region: str,
        summoner_id: Optional[str] = None,
        account_id: Optional[str] = None,
        profile_icon_id: Optional[int] = None
    ) -> Summoner:
        """Create a new summoner or update existing one"""
        
        # Check if summoner already exists
        existing_summoner = await SummonerService.get_summoner_by_puuid(db, puuid)
        
        if existing_summoner:
            # Update existing summoner
            existing_summoner.game_name = game_name
            existing_summoner.tag_line = tag_line
            existing_summoner.summoner_level = summoner_level
            existing_summoner.revision_date = revision_date
            existing_summoner.region = region
            existing_summoner.last_updated = datetime.utcnow()
            
            if summoner_id:
                existing_summoner.summoner_id = summoner_id
            if account_id:
                existing_summoner.account_id = account_id
            if profile_icon_id:
                existing_summoner.profile_icon_id = profile_icon_id
            
            await db.commit()
            await db.refresh(existing_summoner)
            return existing_summoner
        else:
            # Create new summoner
            new_summoner = Summoner(
                puuid=puuid,
                game_name=game_name,
                tag_line=tag_line,
                summoner_level=summoner_level,
                revision_date=revision_date,
                region=region,
                summoner_id=summoner_id,
                account_id=account_id,
                profile_icon_id=profile_icon_id,
                is_active=True
            )
            
            db.add(new_summoner)
            await db.commit()
            await db.refresh(new_summoner)
            return new_summoner
    
    @staticmethod
    async def update_summoner_last_seen(db: AsyncSession, puuid: str) -> bool:
        """Update the last_updated timestamp for a summoner"""
        result = await db.execute(
            update(Summoner)
            .where(Summoner.puuid == puuid)
            .values(last_updated=datetime.utcnow())
        )
        await db.commit()
        return result.rowcount > 0
    
    @staticmethod
    def summoner_to_response(summoner: Summoner) -> SummonerResponse:
        """Convert Summoner model to SummonerResponse schema"""
        return SummonerResponse(
            puuid=summoner.puuid,
            game_name=summoner.game_name,
            tag_line=summoner.tag_line,
            level=summoner.summoner_level,
            revision_date=summoner.revision_date or 0,  # Provide default if None
            region=summoner.region
        )
