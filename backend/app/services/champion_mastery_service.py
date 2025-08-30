from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.champion_mastery import ChampionMastery
from app.models.summoner import Summoner
from app.services.riot_client import RiotClient
from .cache_service import cache_champion_data


class ChampionMasteryService:
    """Service for managing champion mastery data"""
    
    @staticmethod
    async def get_mastery_by_puuid(
        db: AsyncSession, 
        puuid: str, 
        limit: Optional[int] = None
    ) -> List[ChampionMastery]:
        """Get champion masteries for a summoner by PUUID"""
        query = select(ChampionMastery).where(ChampionMastery.puuid == puuid)
        
        # Order by mastery points descending to get highest mastery first
        query = query.order_by(desc(ChampionMastery.mastery_points))
        
        if limit:
            query = query.limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_mastery_by_champion(
        db: AsyncSession, 
        puuid: str, 
        champion_id: int
    ) -> Optional[ChampionMastery]:
        """Get mastery for a specific champion"""
        result = await db.execute(
            select(ChampionMastery).where(
                and_(
                    ChampionMastery.puuid == puuid,
                    ChampionMastery.champion_id == champion_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def store_mastery_data(
        db: AsyncSession, 
        puuid: str, 
        mastery_data: Dict[str, Any]
    ) -> ChampionMastery:
        """Store or update champion mastery data"""
        
        # Check if mastery already exists
        existing_mastery = await ChampionMasteryService.get_mastery_by_champion(
            db, puuid, mastery_data["championId"]
        )
        
        if existing_mastery:
            # Update existing mastery
            existing_mastery.mastery_level = mastery_data.get("championLevel", 0)
            existing_mastery.mastery_points = mastery_data.get("championPoints", 0)
            existing_mastery.points_until_next_level = mastery_data.get("championPointsUntilNextLevel")
            existing_mastery.chest_granted = mastery_data.get("chestGranted", False)
            existing_mastery.tokens_earned = mastery_data.get("tokensEarned", 0)
            existing_mastery.last_play_time = datetime.fromtimestamp(
                mastery_data["lastPlayTime"] / 1000
            ) if mastery_data.get("lastPlayTime") else None
            existing_mastery.updated_at = datetime.now()
            
            return existing_mastery
        else:
            # Create new mastery record
            new_mastery = ChampionMastery(
                puuid=puuid,
                champion_id=mastery_data["championId"],
                mastery_level=mastery_data.get("championLevel", 0),
                mastery_points=mastery_data.get("championPoints", 0),
                points_until_next_level=mastery_data.get("championPointsUntilNextLevel"),
                chest_granted=mastery_data.get("chestGranted", False),
                tokens_earned=mastery_data.get("tokensEarned", 0),
                last_play_time=datetime.fromtimestamp(
                    mastery_data["lastPlayTime"] / 1000
                ) if mastery_data.get("lastPlayTime") else None,
            )
            
            db.add(new_mastery)
            return new_mastery
    
    @staticmethod
    async def fetch_and_store_masteries(
        db: AsyncSession,
        puuid: str,
        summoner_id: str,
        region: str
    ) -> List[ChampionMastery]:
        """
        Fetch champion masteries from Riot API and store them in database
        
        Args:
            db: Database session
            puuid: Player PUUID
            summoner_id: Summoner ID for API calls
            region: Region for API calls
        
        Returns:
            List of stored ChampionMastery objects
        """
        riot_client = RiotClient()
        
        # Get masteries from Riot API
        mastery_data_list = await riot_client.get_champion_masteries(summoner_id, region)
        print(f"🏆 Riot API returned {len(mastery_data_list)} champion masteries")
        
        stored_masteries = []
        for mastery_data in mastery_data_list:
            # Store each mastery in database
            stored_mastery = await ChampionMasteryService.store_mastery_data(
                db, puuid, mastery_data
            )
            stored_masteries.append(stored_mastery)
        
        # Commit all changes
        await db.commit()
        print(f"✅ Stored {len(stored_masteries)} champion masteries for PUUID: {puuid}")
        
        return stored_masteries
    
    @staticmethod
    @cache_champion_data(ttl_seconds=1800)  # Cache for 30 minutes
    async def get_top_masteries(
        db: AsyncSession, 
        puuid: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top champion masteries with additional formatting"""
        masteries = await ChampionMasteryService.get_mastery_by_puuid(db, puuid, limit)
        
        # Convert to formatted response
        formatted_masteries = []
        for mastery in masteries:
            formatted_masteries.append({
                "champion_id": mastery.champion_id,
                "mastery_level": mastery.mastery_level,
                "mastery_points": mastery.mastery_points,
                "points_until_next_level": mastery.points_until_next_level,
                "chest_granted": mastery.chest_granted,
                "tokens_earned": mastery.tokens_earned,
                "last_play_time": mastery.last_play_time.isoformat() if mastery.last_play_time else None,
                "mastery_progress_percentage": mastery.mastery_progress_percentage,
                "updated_at": mastery.updated_at.isoformat() if mastery.updated_at else None
            })
        
        return formatted_masteries
    
    @staticmethod
    async def get_mastery_stats_summary(
        db: AsyncSession, 
        puuid: str
    ) -> Dict[str, Any]:
        """Get summary statistics for champion masteries"""
        masteries = await ChampionMasteryService.get_mastery_by_puuid(db, puuid)
        
        if not masteries:
            return {
                "total_champions": 0,
                "total_mastery_points": 0,
                "mastery_7_count": 0,
                "mastery_6_count": 0,
                "mastery_5_count": 0,
                "average_mastery_level": 0.0,
                "highest_mastery_points": 0
            }
        
        # Calculate statistics
        total_champions = len(masteries)
        total_mastery_points = sum(m.mastery_points for m in masteries)
        mastery_7_count = sum(1 for m in masteries if m.mastery_level == 7)
        mastery_6_count = sum(1 for m in masteries if m.mastery_level == 6)
        mastery_5_count = sum(1 for m in masteries if m.mastery_level == 5)
        average_mastery_level = sum(m.mastery_level for m in masteries) / total_champions
        highest_mastery_points = max(m.mastery_points for m in masteries)
        
        return {
            "total_champions": total_champions,
            "total_mastery_points": total_mastery_points,
            "mastery_7_count": mastery_7_count,
            "mastery_6_count": mastery_6_count,
            "mastery_5_count": mastery_5_count,
            "average_mastery_level": round(average_mastery_level, 1),
            "highest_mastery_points": highest_mastery_points
        }
