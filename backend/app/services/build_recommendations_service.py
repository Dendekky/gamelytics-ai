from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.live_game import LiveGame, LiveGameParticipant
from app.models.summoner import Summoner
from app.services.cache_service import cache_live_data


class BuildRecommendationsService:
    """Service for generating intelligent build recommendations during live games"""
    
    # Champion role mappings for build recommendations
    CHAMPION_ROLES = {
        # ADCs
        22: "adc", 51: "adc", 119: "adc", 202: "adc", 145: "adc", 429: "adc", 222: "adc",
        18: "adc", 81: "adc", 15: "adc", 236: "adc", 21: "adc", 133: "adc", 498: "adc",
        
        # Supports
        555: "support", 412: "support", 40: "support", 267: "support", 25: "support",
        16: "support", 37: "support", 43: "support", 89: "support", 117: "support",
        201: "support", 350: "support", 223: "support", 78: "support", 526: "support",
        
        # Tanks
        86: "tank", 54: "tank", 32: "tank", 57: "tank", 111: "tank", 516: "tank",
        79: "tank", 113: "tank", 33: "tank", 72: "tank", 58: "tank", 14: "tank",
        
        # Assassins
        7: "assassin", 238: "assassin", 91: "assassin", 121: "assassin", 245: "assassin",
        55: "assassin", 28: "assassin", 105: "assassin", 84: "assassin", 157: "assassin",
        
        # Mages
        1: "mage", 61: "mage", 34: "mage", 69: "mage", 45: "mage", 115: "mage",
        268: "mage", 99: "mage", 90: "mage", 127: "mage", 13: "mage", 134: "mage",
        
        # Fighters/Bruisers
        24: "fighter", 122: "fighter", 266: "fighter", 75: "fighter", 80: "fighter",
        92: "fighter", 2: "fighter", 23: "fighter", 39: "fighter", 59: "fighter",
        
        # Junglers (can overlap with other roles)
        104: "jungler", 5: "jungler", 120: "jungler", 203: "jungler", 76: "jungler",
        19: "jungler", 421: "jungler", 48: "jungler", 77: "jungler", 11: "jungler"
    }
    
    # Build recommendations by role and game situation
    BUILD_RECOMMENDATIONS = {
        "adc": {
            "early": {
                "core_items": ["Doran's Blade", "Berserker's Greaves", "Mythic Item"],
                "vs_assassins": ["Guardian Angel", "Phantom Dancer", "Immortal Shieldbow"],
                "vs_tanks": ["Lord Dominik's Regards", "Blade of the Ruined King", "Kraken Slayer"],
                "vs_poke": ["Bloodthirster", "Mercurial Scimitar", "Fleet Footwork rune"]
            },
            "mid": {
                "core_items": ["Infinity Edge", "Zeal Item", "Last Whisper Item"],
                "vs_assassins": ["Stopwatch", "Maw of Malmortius", "Sterak's Gage"],
                "vs_tanks": ["Lord Dominik's Regards", "Blade of the Ruined King"],
                "vs_poke": ["Bloodthirster", "Hexdrinker"]
            },
            "late": {
                "core_items": ["Full Build", "Elixir of Wrath", "Control Wards"],
                "vs_assassins": ["Guardian Angel", "Mercurial Scimitar"],
                "vs_tanks": ["Lord Dominik's Regards", "Void Staff if AP"],
                "vs_poke": ["Bloodthirster", "Lifesteal items"]
            }
        },
        "support": {
            "early": {
                "core_items": ["Support Item", "Control Wards", "Boots"],
                "vs_poke": ["Relic Shield", "Guardian Rune", "Heal"],
                "vs_engage": ["Mobility Boots", "Locket", "Redemption"],
                "vs_burst": ["Locket of the Iron Solari", "Knight's Vow"]
            },
            "mid": {
                "core_items": ["Mythic Support Item", "Redemption", "Locket"],
                "vs_poke": ["Moonstone Renewer", "Staff of Flowing Water"],
                "vs_engage": ["Locket of the Iron Solari", "Zeke's Convergence"],
                "vs_burst": ["Locket", "Knight's Vow", "Mikael's Blessing"]
            },
            "late": {
                "core_items": ["Full Support Build", "Pink Wards", "Elixir"],
                "utility": ["Redemption", "Mikael's Blessing", "Shurelya's"],
                "protection": ["Locket", "Knight's Vow", "Frozen Heart"]
            }
        },
        "tank": {
            "early": {
                "core_items": ["Health/Armor", "Boots", "Dorans Shield"],
                "vs_ad": ["Cloth Armor", "Bramble Vest", "Ninja Tabi"],
                "vs_ap": ["Spectre's Cowl", "Mercury Treads", "Magic Resist"],
                "vs_mixed": ["Bami's Cinder", "Kindlegem", "Defensive Boots"]
            },
            "mid": {
                "core_items": ["Mythic Tank Item", "Situational Armor/MR"],
                "vs_ad": ["Thornmail", "Frozen Heart", "Randuin's Omen"],
                "vs_ap": ["Force of Nature", "Abyssal Mask", "Spirit Visage"],
                "vs_mixed": ["Sunfire Aegis", "Gargoyle Stoneplate"]
            },
            "late": {
                "core_items": ["Full Tank Build", "Situational Items"],
                "utility": ["Warmog's Armor", "Righteous Glory", "Knight's Vow"],
                "damage": ["Thornmail", "Sunfire Aegis", "Abyssal Mask"]
            }
        },
        "mage": {
            "early": {
                "core_items": ["Doran's Ring", "Lost Chapter", "Sorc Shoes"],
                "vs_ad": ["Seeker's Armguard", "Zhonya's Hourglass", "Cloth Armor"],
                "vs_ap": ["Null-Magic Mantle", "Banshee's Veil", "Mercury Treads"],
                "vs_assassins": ["Stopwatch", "Barrier Summoner", "Zhonya's"]
            },
            "mid": {
                "core_items": ["Mythic AP Item", "Deathcap", "Void Staff"],
                "vs_ad": ["Zhonya's Hourglass", "Guardian Angel"],
                "vs_ap": ["Banshee's Veil", "Abyssal Mask"],
                "vs_tanks": ["Void Staff", "Liandry's Anguish", "Demonic Embrace"]
            },
            "late": {
                "core_items": ["Full AP Build", "Elixir of Sorcery"],
                "utility": ["Morellonomicon", "Cosmic Drive", "Horizon Focus"],
                "defense": ["Zhonya's", "Banshee's", "Guardian Angel"]
            }
        },
        "assassin": {
            "early": {
                "core_items": ["Long Sword", "Dirk", "Boots"],
                "vs_squishy": ["Dirk items", "Mobility Boots", "Ignite"],
                "vs_tanky": ["Black Cleaver", "Serylda's Grudge"],
                "vs_poke": ["Doran's Shield", "Second Wind", "Lifesteal"]
            },
            "mid": {
                "core_items": ["Mythic Assassin Item", "Situational Lethality"],
                "vs_squishy": ["Youmuu's", "Duskblade", "Collector"],
                "vs_tanky": ["Eclipse", "Black Cleaver", "Serylda's"],
                "vs_grouped": ["Prowler's Claw", "Edge of Night"]
            },
            "late": {
                "core_items": ["Full Assassin Build", "Guardian Angel"],
                "utility": ["Edge of Night", "Mercurial Scimitar"],
                "damage": ["Lord Dominik's", "Serylda's Grudge"]
            }
        },
        "fighter": {
            "early": {
                "core_items": ["Doran's items", "Health/AD", "Boots"],
                "vs_ad": ["Cloth Armor", "Bramble Vest", "Ninja Tabi"],
                "vs_ap": ["Null-Magic Mantle", "Hexdrinker", "Mercury's"],
                "vs_tanks": ["Black Cleaver components", "Conqueror rune"]
            },
            "mid": {
                "core_items": ["Mythic Fighter Item", "Sterak's", "Situational"],
                "vs_ad": ["Sterak's Gage", "Guardian Angel", "Death's Dance"],
                "vs_ap": ["Maw of Malmortius", "Force of Nature"],
                "vs_tanks": ["Black Cleaver", "Blade of the Ruined King"]
            },
            "late": {
                "core_items": ["Full Fighter Build", "Elixir of Wrath"],
                "utility": ["Guardian Angel", "Quicksilver Sash"],
                "damage": ["Black Cleaver", "Serylda's Grudge"]
            }
        }
    }
    
    @staticmethod
    async def get_build_recommendations(
        db: AsyncSession,
        puuid: str,
        game_id: str
    ) -> Dict[str, Any]:
        """
        Generate intelligent build recommendations based on live game state
        
        Args:
            db: Database session
            puuid: Player PUUID
            game_id: Live game ID
            
        Returns:
            Comprehensive build recommendations
        """
        # Get live game data
        result = await db.execute(
            select(LiveGame).where(LiveGame.game_id == game_id)
        )
        live_game = result.scalar_one_or_none()
        
        if not live_game:
            return {"error": "Live game not found"}
        
        # Get player's participant data
        player_participant = await BuildRecommendationsService._get_player_participant(
            db, game_id, puuid
        )
        
        if not player_participant:
            return {"error": "Player not found in live game"}
        
        # Get enemy team composition
        enemy_team = await BuildRecommendationsService._get_enemy_team_composition(
            db, live_game, player_participant.team_id
        )
        
        # Analyze game state
        game_phase = BuildRecommendationsService._determine_game_phase(live_game.game_length or 0)
        player_role = BuildRecommendationsService._get_champion_role(player_participant.champion_id)
        enemy_threats = BuildRecommendationsService._analyze_enemy_threats(enemy_team)
        
        # Generate recommendations
        recommendations = BuildRecommendationsService._generate_build_recommendations(
            player_role, game_phase, enemy_threats, enemy_team
        )
        
        return {
            "player_champion": player_participant.champion_id,
            "player_role": player_role,
            "game_phase": game_phase,
            "game_time_minutes": (live_game.game_length or 0) // 60,
            "enemy_threats": enemy_threats,
            "recommendations": recommendations,
            "situational_advice": BuildRecommendationsService._get_situational_advice(
                player_role, enemy_threats, game_phase
            )
        }
    
    @staticmethod
    async def _get_player_participant(
        db: AsyncSession,
        game_id: str,
        puuid: str
    ) -> Optional[LiveGameParticipant]:
        """Get player's participant data from live game"""
        
        # First try to find by PUUID
        result = await db.execute(
            select(LiveGameParticipant).where(
                LiveGameParticipant.game_id == game_id,
                LiveGameParticipant.puuid == puuid
            )
        )
        participant = result.scalar_one_or_none()
        
        if participant:
            return participant
        
        # If not found by PUUID, try to find by summoner ID
        summoner_result = await db.execute(
            select(Summoner).where(Summoner.puuid == puuid)
        )
        summoner = summoner_result.scalar_one_or_none()
        
        if summoner:
            result = await db.execute(
                select(LiveGameParticipant).where(
                    LiveGameParticipant.game_id == game_id,
                    LiveGameParticipant.summoner_id == summoner.summoner_id
                )
            )
            return result.scalar_one_or_none()
        
        return None
    
    @staticmethod
    async def _get_enemy_team_composition(
        db: AsyncSession,
        live_game: LiveGame,
        player_team_id: int
    ) -> List[LiveGameParticipant]:
        """Get enemy team composition"""
        
        enemy_team_id = 200 if player_team_id == 100 else 100
        
        result = await db.execute(
            select(LiveGameParticipant).where(
                LiveGameParticipant.game_id == live_game.game_id,
                LiveGameParticipant.team_id == enemy_team_id
            )
        )
        
        return list(result.scalars().all())
    
    @staticmethod
    def _determine_game_phase(game_length_seconds: int) -> str:
        """Determine current game phase"""
        minutes = game_length_seconds // 60
        
        if minutes < 15:
            return "early"
        elif minutes < 30:
            return "mid"
        else:
            return "late"
    
    @staticmethod
    def _get_champion_role(champion_id: int) -> str:
        """Get champion's primary role"""
        return BuildRecommendationsService.CHAMPION_ROLES.get(champion_id, "unknown")
    
    @staticmethod
    def _analyze_enemy_threats(enemy_team: List[LiveGameParticipant]) -> Dict[str, Any]:
        """Analyze enemy team threats for build planning"""
        
        threats = {
            "ad_damage": 0,
            "ap_damage": 0,
            "true_damage": 0,
            "burst_potential": 0,
            "sustained_damage": 0,
            "crowd_control": 0,
            "dive_potential": 0,
            "poke_potential": 0,
            "primary_threats": [],
            "damage_types": {"physical": 0, "magical": 0, "mixed": 0}
        }
        
        # Analyze each enemy champion
        for participant in enemy_team:
            champion_id = participant.champion_id
            role = BuildRecommendationsService._get_champion_role(champion_id)
            
            # Categorize damage types and threats
            if role == "adc":
                threats["ad_damage"] += 3
                threats["sustained_damage"] += 3
                threats["damage_types"]["physical"] += 3
                threats["primary_threats"].append({
                    "champion_id": champion_id,
                    "type": "sustained_ad_damage",
                    "priority": "high"
                })
            
            elif role == "mage":
                threats["ap_damage"] += 3
                threats["burst_potential"] += 2
                threats["poke_potential"] += 2
                threats["damage_types"]["magical"] += 3
                threats["primary_threats"].append({
                    "champion_id": champion_id,
                    "type": "burst_ap_damage",
                    "priority": "high"
                })
            
            elif role == "assassin":
                threats["ad_damage"] += 2
                threats["burst_potential"] += 3
                threats["dive_potential"] += 3
                threats["damage_types"]["physical"] += 2
                threats["primary_threats"].append({
                    "champion_id": champion_id,
                    "type": "burst_dive",
                    "priority": "very_high"
                })
            
            elif role == "tank":
                threats["crowd_control"] += 3
                threats["dive_potential"] += 2
                threats["primary_threats"].append({
                    "champion_id": champion_id,
                    "type": "engage_cc",
                    "priority": "medium"
                })
            
            elif role == "support":
                threats["crowd_control"] += 1
                threats["poke_potential"] += 1
                
            elif role == "fighter":
                threats["ad_damage"] += 2
                threats["sustained_damage"] += 2
                threats["dive_potential"] += 2
                threats["damage_types"]["physical"] += 2
        
        return threats
    
    @staticmethod
    def _generate_build_recommendations(
        player_role: str,
        game_phase: str,
        enemy_threats: Dict[str, Any],
        enemy_team: List[LiveGameParticipant]
    ) -> Dict[str, Any]:
        """Generate specific build recommendations"""
        
        if player_role not in BuildRecommendationsService.BUILD_RECOMMENDATIONS:
            return {"error": f"No recommendations available for role: {player_role}"}
        
        role_builds = BuildRecommendationsService.BUILD_RECOMMENDATIONS[player_role]
        phase_builds = role_builds.get(game_phase, {})
        
        recommendations = {
            "priority_items": [],
            "situational_items": [],
            "boots_recommendation": "",
            "rune_adjustments": [],
            "build_order": [],
            "defensive_priority": ""
        }
        
        # Core items for the phase
        if "core_items" in phase_builds:
            recommendations["priority_items"].extend(phase_builds["core_items"])
        
        # Situational recommendations based on threats
        if enemy_threats["ad_damage"] > enemy_threats["ap_damage"]:
            if "vs_ad" in phase_builds:
                recommendations["situational_items"].extend(phase_builds["vs_ad"])
            recommendations["boots_recommendation"] = "Plated Steelcaps (Ninja Tabi)"
            recommendations["defensive_priority"] = "armor"
        
        elif enemy_threats["ap_damage"] > enemy_threats["ad_damage"]:
            if "vs_ap" in phase_builds:
                recommendations["situational_items"].extend(phase_builds["vs_ap"])
            recommendations["boots_recommendation"] = "Mercury's Treads"
            recommendations["defensive_priority"] = "magic_resist"
        
        else:
            if "vs_mixed" in phase_builds:
                recommendations["situational_items"].extend(phase_builds["vs_mixed"])
            recommendations["boots_recommendation"] = "Depends on primary threat"
            recommendations["defensive_priority"] = "health_and_resistances"
        
        # Special threat handling
        if enemy_threats["burst_potential"] >= 6:
            if "vs_burst" in phase_builds:
                recommendations["situational_items"].extend(phase_builds["vs_burst"])
            recommendations["situational_items"].append("Stopwatch/Guardian Angel")
        
        if enemy_threats["dive_potential"] >= 6:
            recommendations["situational_items"].extend(["Flash", "Barrier/Heal", "Peel items"])
        
        if any(threat["type"] == "burst_dive" for threat in enemy_threats["primary_threats"]):
            if "vs_assassins" in phase_builds:
                recommendations["situational_items"].extend(phase_builds["vs_assassins"])
        
        # Build order suggestions
        if game_phase == "early":
            recommendations["build_order"] = [
                "Core damage item",
                "Boots",
                "Defensive component if behind",
                "Complete first item"
            ]
        elif game_phase == "mid":
            recommendations["build_order"] = [
                "Complete mythic",
                "Situational defense",
                "Core damage item",
                "Utility/Defense"
            ]
        else:  # late
            recommendations["build_order"] = [
                "Optimize full build",
                "Situational swaps",
                "Elixirs",
                "Guardian Angel if needed"
            ]
        
        return recommendations
    
    @staticmethod
    def _get_situational_advice(
        player_role: str,
        enemy_threats: Dict[str, Any],
        game_phase: str
    ) -> List[str]:
        """Get situational gameplay advice"""
        
        advice = []
        
        # Role-specific advice
        if player_role == "adc":
            if enemy_threats["dive_potential"] >= 6:
                advice.append("Stay near your team - enemy has high dive potential")
                advice.append("Consider defensive summoners (Barrier/Heal)")
            
            if enemy_threats["burst_potential"] >= 6:
                advice.append("Build defensive items early - enemy has high burst")
                advice.append("Position conservatively in team fights")
        
        elif player_role == "support":
            if enemy_threats["dive_potential"] >= 6:
                advice.append("Ward flanks and prioritize peel items")
                advice.append("Stay close to your ADC")
            
            if enemy_threats["poke_potential"] >= 4:
                advice.append("Build sustain items and play for disengage")
        
        elif player_role in ["mage", "assassin"]:
            if enemy_threats["dive_potential"] >= 6:
                advice.append("Zhonya's/Guardian Angel should be early priority")
                advice.append("Play safe until you have defensive items")
        
        # Game phase advice
        if game_phase == "early":
            advice.append(f"Focus on core items before defensive options")
            if enemy_threats["burst_potential"] >= 6:
                advice.append("Consider early defensive components")
        
        elif game_phase == "mid":
            advice.append("Team fights starting - balance damage and defense")
            if enemy_threats["crowd_control"] >= 6:
                advice.append("QSS/Cleanse becomes valuable")
        
        else:  # late
            advice.append("Full builds - consider situational swaps")
            advice.append("Elixirs and vision control are crucial")
        
        return advice
    
    @staticmethod
    @cache_live_data(ttl_seconds=60)  # Cache build recommendations for 1 minute
    async def get_cached_build_recommendations(
        db: AsyncSession,
        puuid: str,
        game_id: str
    ) -> Dict[str, Any]:
        """Cached version of build recommendations"""
        return await BuildRecommendationsService.get_build_recommendations(db, puuid, game_id)
