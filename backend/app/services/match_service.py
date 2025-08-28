from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.match import Match, MatchParticipant
from app.models.summoner import Summoner
from app.services.riot_client import RiotClient


class MatchService:
    """Service for managing match data in the database"""
    
    @staticmethod
    async def get_match_by_id(db: AsyncSession, match_id: str) -> Optional[Match]:
        """Get match by match ID"""
        result = await db.execute(select(Match).where(Match.match_id == match_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_matches_by_puuid(
        db: AsyncSession, 
        puuid: str, 
        limit: int = 20,
        offset: int = 0
    ) -> List[Match]:
        """Get matches for a specific summoner by PUUID"""
        result = await db.execute(
            select(Match)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(MatchParticipant.puuid == puuid)
            .order_by(Match.game_creation.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_match_participant(
        db: AsyncSession, 
        match_id: str, 
        puuid: str
    ) -> Optional[MatchParticipant]:
        """Get specific participant data for a match"""
        result = await db.execute(
            select(MatchParticipant).where(
                and_(
                    MatchParticipant.match_id == match_id,
                    MatchParticipant.puuid == puuid
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def store_match_data(
        db: AsyncSession, 
        match_data: Dict[str, Any], 
        region: str
    ) -> Match:
        """
        Store match data from Riot API response into database
        
        Args:
            db: Database session
            match_data: Raw match data from Riot API
            region: Region where the match was played
        
        Returns:
            Stored Match object
        """
        info = match_data.get("info", {})
        metadata = match_data.get("metadata", {})
        
        # Check if match already exists
        existing_match = await MatchService.get_match_by_id(db, metadata.get("matchId"))
        if existing_match:
            return existing_match
        
        # Convert timestamps from milliseconds to datetime
        game_creation = datetime.fromtimestamp(info.get("gameCreation", 0) / 1000)
        game_start = datetime.fromtimestamp(info.get("gameStartTimestamp", 0) / 1000) if info.get("gameStartTimestamp") else None
        game_end = datetime.fromtimestamp(info.get("gameEndTimestamp", 0) / 1000) if info.get("gameEndTimestamp") else None
        
        # Determine winning team
        winning_team = None
        teams = info.get("teams", [])
        for team in teams:
            if team.get("win"):
                winning_team = team.get("teamId")
                break
        
        # Create Match object
        match = Match(
            match_id=metadata.get("matchId"),
            game_creation=game_creation,
            game_start=game_start,
            game_end=game_end,
            game_duration=info.get("gameDuration", 0),
            game_mode=info.get("gameMode", ""),
            game_type=info.get("gameType", ""),
            game_version=info.get("gameVersion", ""),
            map_id=info.get("mapId", 0),
            platform_id=info.get("platformId", ""),
            queue_id=info.get("queueId", 0),
            tournament_code=info.get("tournamentCode"),
            winning_team=winning_team,
            teams_data=teams,  # Store raw teams data as JSON
        )
        
        db.add(match)
        await db.flush()  # Flush to get the match available for participants
        
        # Store participants
        participants = info.get("participants", [])
        for participant_data in participants:
            await MatchService._store_participant_data(
                db, match.match_id, participant_data, region
            )
        
        await db.commit()
        await db.refresh(match)
        return match
    
    @staticmethod
    async def _store_participant_data(
        db: AsyncSession,
        match_id: str,
        participant_data: Dict[str, Any],
        region: str
    ) -> MatchParticipant:
        """Store participant data for a match"""
        puuid = participant_data.get("puuid")
        
        # Check if participant already exists
        existing_participant = await MatchService.get_match_participant(db, match_id, puuid)
        if existing_participant:
            return existing_participant
        
        # Create MatchParticipant object
        participant = MatchParticipant(
            match_id=match_id,
            puuid=puuid,
            participant_id=participant_data.get("participantId", 0),
            team_id=participant_data.get("teamId", 0),
            
            # Champion info
            champion_id=participant_data.get("championId", 0),
            champion_name=participant_data.get("championName", ""),
            champion_level=participant_data.get("champLevel", 0),
            summoner_spell_1=participant_data.get("summoner1Id", 0),
            summoner_spell_2=participant_data.get("summoner2Id", 0),
            
            # KDA stats
            kills=participant_data.get("kills", 0),
            deaths=participant_data.get("deaths", 0),
            assists=participant_data.get("assists", 0),
            double_kills=participant_data.get("doubleKills", 0),
            triple_kills=participant_data.get("tripleKills", 0),
            quadra_kills=participant_data.get("quadraKills", 0),
            penta_kills=participant_data.get("pentaKills", 0),
            
            # Damage stats
            total_damage_dealt=participant_data.get("totalDamageDealt", 0),
            total_damage_dealt_to_champions=participant_data.get("totalDamageDealtToChampions", 0),
            total_damage_taken=participant_data.get("totalDamageTaken", 0),
            magic_damage_dealt=participant_data.get("magicDamageDealt", 0),
            physical_damage_dealt=participant_data.get("physicalDamageDealt", 0),
            true_damage_dealt=participant_data.get("trueDamageDealt", 0),
            
            # Gold and CS
            gold_earned=participant_data.get("goldEarned", 0),
            total_minions_killed=participant_data.get("totalMinionsKilled", 0),
            neutral_minions_killed=participant_data.get("neutralMinionsKilled", 0),
            
            # Vision stats
            vision_score=participant_data.get("visionScore", 0),
            wards_placed=participant_data.get("wardsPlaced", 0),
            wards_killed=participant_data.get("wardsKilled", 0),
            control_wards_purchased=participant_data.get("detectorWardsPlaced", 0),
            
            # Objective stats
            turret_kills=participant_data.get("turretKills", 0),
            inhibitor_kills=participant_data.get("inhibitorKills", 0),
            dragon_kills=participant_data.get("dragonKills", 0),
            baron_kills=participant_data.get("baronKills", 0),
            
            # Performance metrics
            largest_killing_spree=participant_data.get("largestKillingSpree", 0),
            largest_multi_kill=participant_data.get("largestMultiKill", 0),
            total_time_cc_dealt=participant_data.get("totalTimeCCDealt", 0),
            
            # Match outcome
            win=participant_data.get("win", False),
            
            # Items (store as JSON)
            items={
                "item0": participant_data.get("item0", 0),
                "item1": participant_data.get("item1", 0),
                "item2": participant_data.get("item2", 0),
                "item3": participant_data.get("item3", 0),
                "item4": participant_data.get("item4", 0),
                "item5": participant_data.get("item5", 0),
                "item6": participant_data.get("item6", 0),  # Trinket
            },
            
            # Store complete raw data for future analysis
            raw_data=participant_data
        )
        
        db.add(participant)
        return participant
    
    @staticmethod
    async def fetch_and_store_recent_matches(
        db: AsyncSession,
        puuid: str,
        region: str,
        count: int = 10
    ) -> List[Match]:
        """
        Fetch recent matches from Riot API and store them in database
        
        Args:
            db: Database session
            puuid: Player PUUID
            region: Region for API calls
            count: Number of recent matches to fetch
        
        Returns:
            List of stored Match objects
        """
        riot_client = RiotClient()
        
        # Get match IDs from Riot API
        match_ids = await riot_client.get_match_history(puuid, region, count)
        
        stored_matches = []
        for match_id in match_ids:
            # Check if we already have this match
            existing_match = await MatchService.get_match_by_id(db, match_id)
            if existing_match:
                stored_matches.append(existing_match)
                continue
            
            # Fetch match details from API
            match_data = await riot_client.get_match_details(match_id, region)
            if match_data:
                # Store match in database
                stored_match = await MatchService.store_match_data(db, match_data, region)
                stored_matches.append(stored_match)
        
        return stored_matches
