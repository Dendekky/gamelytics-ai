import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.models.live_game import LiveGame, LiveGameParticipant, LiveGameSnapshot, PlayerLiveGameHistory
from app.models.summoner import Summoner
from app.services.riot_client import RiotClient
from app.services.cache_service import cache_live_data
from app.services.analytics_service import AnalyticsService


class LiveGameService:
    """Service for managing live game detection, analysis, and enemy scouting"""
    
    @staticmethod
    async def check_player_live_status(
        db: AsyncSession, 
        puuid: str, 
        region: str
    ) -> Optional[Dict[str, Any]]:
        """
        Check if a player is currently in a live game
        
        Args:
            db: Database session
            puuid: Player PUUID
            region: Region for API calls
            
        Returns:
            Live game data with analysis if player is in game, None otherwise
        """
        riot_client = RiotClient()
        
        # Check for active game using Riot API
        active_game = await riot_client.check_if_in_game(puuid, region)
        
        if not active_game:
            return None
        
        # Store or update live game in database
        live_game = await LiveGameService._store_live_game_data(db, active_game, region)
        
        # Perform enemy team analysis
        enemy_analysis = await LiveGameService._analyze_enemy_team(db, live_game, puuid, region)
        
        # Create comprehensive response
        return {
            "is_in_game": True,
            "game_info": {
                "game_id": live_game.game_id,
                "game_mode": live_game.game_mode,
                "game_type": live_game.game_type,
                "map_id": live_game.map_id,
                "queue_id": live_game.queue_id,
                "game_length": live_game.game_length,
                "spectator_delay": live_game.spectator_delay
            },
            "team_composition": {
                "your_team": await LiveGameService._get_team_composition(db, live_game, puuid, "ally"),
                "enemy_team": await LiveGameService._get_team_composition(db, live_game, puuid, "enemy")
            },
            "enemy_analysis": enemy_analysis,
            "recommendations": await LiveGameService._generate_game_recommendations(db, live_game, puuid)
        }
    
    @staticmethod
    async def _store_live_game_data(
        db: AsyncSession, 
        active_game_data: Dict[str, Any], 
        region: str
    ) -> LiveGame:
        """Store live game data in database"""
        
        game_id = str(active_game_data.get("gameId"))
        
        # Check if live game already exists
        result = await db.execute(
            select(LiveGame).where(LiveGame.game_id == game_id)
        )
        live_game = result.scalar_one_or_none()
        
        if not live_game:
            # Create new live game record
            live_game = LiveGame(
                game_id=game_id,
                platform_id=active_game_data.get("platformId"),
                game_type=active_game_data.get("gameType"),
                game_mode=active_game_data.get("gameMode"),
                map_id=active_game_data.get("mapId"),
                queue_id=active_game_data.get("gameQueueConfigId"),
                game_start_time=datetime.fromtimestamp(active_game_data.get("gameStartTime", 0) / 1000),
                game_length=active_game_data.get("gameLength", 0),
                spectator_delay=active_game_data.get("observers", {}).get("encryptionKey"),
                raw_data=active_game_data
            )
            db.add(live_game)
        else:
            # Update existing game with latest data
            live_game.game_length = active_game_data.get("gameLength", 0)
            live_game.last_updated = datetime.utcnow()
            live_game.raw_data = active_game_data
        
        # Store/update participants
        participants_data = active_game_data.get("participants", [])
        for participant_data in participants_data:
            await LiveGameService._store_participant_data(db, live_game, participant_data)
        
        await db.commit()
        return live_game
    
    @staticmethod
    async def _store_participant_data(
        db: AsyncSession, 
        live_game: LiveGame, 
        participant_data: Dict[str, Any]
    ) -> LiveGameParticipant:
        """Store participant data for live game"""
        
        summoner_id = participant_data.get("summonerId")
        
        # Check if participant already exists
        result = await db.execute(
            select(LiveGameParticipant).where(
                and_(
                    LiveGameParticipant.game_id == live_game.game_id,
                    LiveGameParticipant.summoner_id == summoner_id
                )
            )
        )
        participant = result.scalar_one_or_none()
        
        if not participant:
            participant = LiveGameParticipant(
                game_id=live_game.game_id,
                summoner_id=summoner_id
            )
            db.add(participant)
        
        # Update participant data
        participant.summoner_name = participant_data.get("summonerName")
        participant.summoner_level = participant_data.get("summonerLevel")
        participant.team_id = participant_data.get("teamId")
        participant.champion_id = participant_data.get("championId")
        participant.spell1_id = participant_data.get("spell1Id")
        participant.spell2_id = participant_data.get("spell2Id")
        participant.perk_main_style = participant_data.get("perks", {}).get("perkStyle")
        participant.perk_sub_style = participant_data.get("perks", {}).get("perkSubStyle")
        participant.perks = participant_data.get("perks")
        participant.raw_data = participant_data
        
        return participant
    
    @staticmethod
    async def _analyze_enemy_team(
        db: AsyncSession, 
        live_game: LiveGame, 
        target_puuid: str, 
        region: str
    ) -> Dict[str, Any]:
        """Analyze enemy team for scouting and strategy recommendations"""
        
        # Get target player's team ID
        target_team_id = await LiveGameService._get_player_team_id(db, live_game, target_puuid)
        if not target_team_id:
            return {"error": "Could not determine player's team"}
        
        enemy_team_id = 200 if target_team_id == 100 else 100
        
        # Get enemy team participants
        result = await db.execute(
            select(LiveGameParticipant).where(
                and_(
                    LiveGameParticipant.game_id == live_game.game_id,
                    LiveGameParticipant.team_id == enemy_team_id
                )
            )
        )
        enemy_participants = result.scalars().all()
        
        enemy_analysis = {
            "team_threats": [],
            "team_composition": {
                "damage_types": {"physical": 0, "magical": 0, "true": 0},
                "roles": {"tank": 0, "damage": 0, "support": 0},
                "crowd_control": "low"  # low, medium, high
            },
            "individual_analysis": [],
            "recommended_strategies": []
        }
        
        for participant in enemy_participants:
            # Analyze individual enemy players
            player_analysis = await LiveGameService._analyze_enemy_player(
                db, participant, region
            )
            enemy_analysis["individual_analysis"].append(player_analysis)
            
            # Determine threat level
            if player_analysis.get("threat_level") == "high":
                enemy_analysis["team_threats"].append({
                    "summoner_name": participant.summoner_name,
                    "champion_id": participant.champion_id,
                    "reason": player_analysis.get("threat_reason"),
                    "counter_strategy": player_analysis.get("counter_strategy")
                })
        
        # Generate team-wide strategies
        enemy_analysis["recommended_strategies"] = await LiveGameService._generate_counter_strategies(
            enemy_participants
        )
        
        return enemy_analysis
    
    @staticmethod
    async def _analyze_enemy_player(
        db: AsyncSession, 
        participant: LiveGameParticipant, 
        region: str
    ) -> Dict[str, Any]:
        """Analyze individual enemy player for threat assessment"""
        
        # Try to find summoner in our database for historical analysis
        summoner_result = await db.execute(
            select(Summoner).where(Summoner.summoner_id == participant.summoner_id)
        )
        summoner = summoner_result.scalar_one_or_none()
        
        analysis = {
            "summoner_name": participant.summoner_name,
            "champion_id": participant.champion_id,
            "summoner_level": participant.summoner_level,
            "threat_level": "medium",  # low, medium, high
            "threat_reason": "",
            "counter_strategy": "",
            "estimated_rank": "Unknown",
            "win_rate_estimate": None,
            "main_role": "Unknown"
        }
        
        if summoner:
            # We have historical data - use it for analysis
            try:
                # Get player analytics for threat assessment
                analytics = await AnalyticsService.get_overview_stats(db, summoner.puuid)
                
                if analytics:
                    win_rate = analytics.get("win_rate", 0)
                    avg_kda = analytics.get("avg_kda", 0)
                    
                    # Determine threat level based on performance
                    if win_rate > 65 and avg_kda > 2.0:
                        analysis["threat_level"] = "high"
                        analysis["threat_reason"] = f"High win rate ({win_rate:.1f}%) and strong KDA ({avg_kda:.1f})"
                    elif win_rate > 55 and avg_kda > 1.5:
                        analysis["threat_level"] = "medium"
                        analysis["threat_reason"] = f"Good performance (WR: {win_rate:.1f}%, KDA: {avg_kda:.1f})"
                    else:
                        analysis["threat_level"] = "low"
                        analysis["threat_reason"] = f"Average performance (WR: {win_rate:.1f}%, KDA: {avg_kda:.1f})"
                    
                    analysis["win_rate_estimate"] = win_rate
                    
            except Exception as e:
                print(f"Error analyzing player {participant.summoner_name}: {e}")
        
        # Champion-specific threat assessment
        analysis["counter_strategy"] = await LiveGameService._get_champion_counter_strategy(
            participant.champion_id
        )
        
        return analysis
    
    @staticmethod
    async def _get_champion_counter_strategy(champion_id: int) -> str:
        """Get counter strategy for specific champion"""
        
        # Basic champion counter strategies (can be expanded with a full database)
        counter_strategies = {
            # Assassins
            7: "Yasuo - Build armor early, avoid fighting in minion waves, CC when tornado is down",
            238: "Zed - Rush Zhonya's/armor, avoid 1v1s post-6, ward flanks",
            91: "Talon - Ward jungle routes, group early, build armor",
            
            # ADCs
            22: "Ashe - Engage when arrow is on CD, avoid long-range poke",
            51: "Caitlyn - Close distance quickly, avoid headshot range",
            119: "Draven - Interrupt axe catches, force team fights",
            
            # Supports
            555: "Pyke - Avoid low health skirmishes, ward deep, stay grouped",
            412: "Thresh - Dodge hooks, pressure when abilities down",
            
            # Tanks
            86: "Garen - Kite and poke, avoid extended trades",
            54: "Malphite - Spread out, avoid grouping for ult",
        }
        
        return counter_strategies.get(champion_id, "Focus in team fights, avoid 1v1s if behind")
    
    @staticmethod
    async def _generate_counter_strategies(
        enemy_participants: List[LiveGameParticipant]
    ) -> List[str]:
        """Generate team-wide counter strategies"""
        
        strategies = []
        
        # Analyze team composition
        champions = [p.champion_id for p in enemy_participants]
        
        # Check for common team compositions
        assassin_champions = {7, 238, 91, 121}  # Yasuo, Zed, Talon, Kha'Zix
        tank_champions = {86, 54, 32, 57}       # Garen, Malphite, Amumu, Maokai
        poke_champions = {22, 51, 61}           # Ashe, Caitlyn, Orianna
        
        assassin_count = len(set(champions) & assassin_champions)
        tank_count = len(set(champions) & tank_champions)
        poke_count = len(set(champions) & poke_champions)
        
        if assassin_count >= 2:
            strategies.append("Enemy has multiple assassins - group tightly, ward flanks, build defensive")
        
        if tank_count >= 2:
            strategies.append("Enemy is tank-heavy - build % damage, avoid extended fights")
        
        if poke_count >= 2:
            strategies.append("Enemy has poke comp - engage quickly, avoid long sieges")
        
        # Default strategies
        if not strategies:
            strategies.extend([
                "Focus enemy carries in team fights",
                "Ward objectives and jungle entrances", 
                "Group for objectives after 15 minutes"
            ])
        
        return strategies
    
    @staticmethod
    async def _get_team_composition(
        db: AsyncSession, 
        live_game: LiveGame, 
        target_puuid: str, 
        team_type: str  # "ally" or "enemy"
    ) -> List[Dict[str, Any]]:
        """Get team composition for specified team"""
        
        target_team_id = await LiveGameService._get_player_team_id(db, live_game, target_puuid)
        if not target_team_id:
            return []
        
        if team_type == "ally":
            team_id = target_team_id
        else:  # enemy
            team_id = 200 if target_team_id == 100 else 100
        
        result = await db.execute(
            select(LiveGameParticipant).where(
                and_(
                    LiveGameParticipant.game_id == live_game.game_id,
                    LiveGameParticipant.team_id == team_id
                )
            )
        )
        participants = result.scalars().all()
        
        team_comp = []
        for participant in participants:
            team_comp.append({
                "summoner_name": participant.summoner_name,
                "summoner_level": participant.summoner_level,
                "champion_id": participant.champion_id,
                "spell1_id": participant.spell1_id,
                "spell2_id": participant.spell2_id,
                "perks": participant.perks
            })
        
        return team_comp
    
    @staticmethod
    async def _get_player_team_id(
        db: AsyncSession, 
        live_game: LiveGame, 
        target_puuid: str
    ) -> Optional[int]:
        """Get the team ID for the target player"""
        
        # First, try to find by PUUID if we have it stored
        result = await db.execute(
            select(LiveGameParticipant).where(
                and_(
                    LiveGameParticipant.game_id == live_game.game_id,
                    LiveGameParticipant.puuid == target_puuid
                )
            )
        )
        participant = result.scalar_one_or_none()
        
        if participant:
            return participant.team_id
        
        # If not found by PUUID, try to match by summoner data
        summoner_result = await db.execute(
            select(Summoner).where(Summoner.puuid == target_puuid)
        )
        summoner = summoner_result.scalar_one_or_none()
        
        if summoner:
            result = await db.execute(
                select(LiveGameParticipant).where(
                    and_(
                        LiveGameParticipant.game_id == live_game.game_id,
                        LiveGameParticipant.summoner_id == summoner.summoner_id
                    )
                )
            )
            participant = result.scalar_one_or_none()
            
            if participant:
                return participant.team_id
        
        return None
    
    @staticmethod
    async def _generate_game_recommendations(
        db: AsyncSession, 
        live_game: LiveGame, 
        target_puuid: str
    ) -> Dict[str, Any]:
        """Generate real-time game recommendations"""
        
        recommendations = {
            "immediate_actions": [],
            "item_builds": [],
            "macro_strategy": [],
            "warding_spots": []
        }
        
        # Get game time to provide time-sensitive recommendations
        game_length_minutes = (live_game.game_length or 0) // 60
        
        if game_length_minutes < 5:
            recommendations["immediate_actions"].extend([
                "Focus on farming and avoiding trades",
                "Ward river bushes for jungle tracking",
                "Look for level 2-3 power spikes"
            ])
        elif game_length_minutes < 15:
            recommendations["immediate_actions"].extend([
                "Contest scuttle crabs for vision",
                "Coordinate with jungler for ganks",
                "Prepare for dragon fights"
            ])
        else:
            recommendations["immediate_actions"].extend([
                "Group with team for objectives",
                "Ward baron and dragon pits",
                "Look for picks on isolated enemies"
            ])
        
        # Basic macro strategy
        recommendations["macro_strategy"] = [
            "Prioritize objectives over kills",
            "Maintain vision control around objectives",
            "Group when you have item advantages"
        ]
        
        return recommendations
    
    @staticmethod
    @cache_live_data(ttl_seconds=30)  # Cache for 30 seconds for real-time updates
    async def get_live_game_status(
        db: AsyncSession, 
        puuid: str, 
        region: str
    ) -> Dict[str, Any]:
        """
        Cached method to get live game status with minimal API calls
        """
        return await LiveGameService.check_player_live_status(db, puuid, region)
    
    @staticmethod
    async def monitor_player_games(
        db: AsyncSession, 
        puuid_list: List[str], 
        region: str
    ) -> Dict[str, Any]:
        """
        Monitor multiple players for live games (useful for friends/teams)
        """
        results = {}
        
        # Check all players concurrently
        tasks = []
        for puuid in puuid_list:
            tasks.append(LiveGameService.get_live_game_status(db, puuid, region))
        
        live_statuses = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, puuid in enumerate(puuid_list):
            status = live_statuses[i]
            if isinstance(status, Exception):
                results[puuid] = {"error": str(status)}
            else:
                results[puuid] = status or {"is_in_game": False}
        
        return results
