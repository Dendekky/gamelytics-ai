from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import statistics

from app.models.match import Match, MatchParticipant
from app.models.summoner import Summoner


class AnalyticsService:
    """Service for calculating performance analytics from match data"""
    
    @staticmethod
    async def get_player_overview_stats(
        db: AsyncSession, 
        puuid: str, 
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate overview statistics for a player
        
        Args:
            db: Database session
            puuid: Player PUUID
            days: Number of days to look back (default 30)
            
        Returns:
            Dictionary containing overview statistics
        """
        # Get date threshold
        date_threshold = datetime.now() - timedelta(days=days)
        
        # Get matches within the timeframe
        result = await db.execute(
            select(Match, MatchParticipant)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(
                and_(
                    MatchParticipant.puuid == puuid,
                    Match.game_creation >= date_threshold
                )
            )
            .order_by(Match.game_creation.desc())
        )
        
        matches_data = result.all()
        
        if not matches_data:
            return {
                "total_games": 0,
                "wins": 0,
                "losses": 0,
                "win_rate": 0.0,
                "avg_kda": 0.0,
                "avg_cs_per_min": 0.0,
                "avg_vision_score": 0.0,
                "total_playtime_hours": 0.0,
                "timeframe_days": days
            }
        
        # Extract data for calculations
        total_games = len(matches_data)
        wins = sum(1 for _, participant in matches_data if participant.win)
        losses = total_games - wins
        
        # Calculate averages
        total_kills = sum(participant.kills for _, participant in matches_data)
        total_deaths = sum(participant.deaths for _, participant in matches_data)
        total_assists = sum(participant.assists for _, participant in matches_data)
        
        # Calculate KDA
        avg_kills = total_kills / total_games
        avg_deaths = total_deaths / total_games if total_deaths > 0 else 0
        avg_assists = total_assists / total_games
        avg_kda = (avg_kills + avg_assists) / avg_deaths if avg_deaths > 0 else float(avg_kills + avg_assists)
        
        # Calculate CS per minute
        cs_per_min_values = []
        total_playtime_seconds = 0
        
        for match, participant in matches_data:
            if match.game_duration > 0:
                cs_per_min = participant.total_minions_killed / (match.game_duration / 60)
                cs_per_min_values.append(cs_per_min)
                total_playtime_seconds += match.game_duration
        
        avg_cs_per_min = statistics.mean(cs_per_min_values) if cs_per_min_values else 0.0
        avg_vision_score = statistics.mean([p.vision_score for _, p in matches_data])
        total_playtime_hours = total_playtime_seconds / 3600
        
        return {
            "total_games": total_games,
            "wins": wins,
            "losses": losses,
            "win_rate": round((wins / total_games) * 100, 1) if total_games > 0 else 0.0,
            "avg_kda": round(avg_kda, 2),
            "avg_kills": round(avg_kills, 1),
            "avg_deaths": round(avg_deaths, 1),
            "avg_assists": round(avg_assists, 1),
            "avg_cs_per_min": round(avg_cs_per_min, 1),
            "avg_vision_score": round(avg_vision_score, 1),
            "total_playtime_hours": round(total_playtime_hours, 1),
            "timeframe_days": days
        }
    
    @staticmethod
    async def get_champion_performance(
        db: AsyncSession, 
        puuid: str, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Calculate per-champion performance statistics
        
        Args:
            db: Database session
            puuid: Player PUUID
            days: Number of days to look back
            
        Returns:
            List of champion performance dictionaries
        """
        date_threshold = datetime.now() - timedelta(days=days)
        
        # Get matches within timeframe
        result = await db.execute(
            select(Match, MatchParticipant)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(
                and_(
                    MatchParticipant.puuid == puuid,
                    Match.game_creation >= date_threshold
                )
            )
        )
        
        matches_data = result.all()
        
        # Group by champion
        champion_stats = defaultdict(list)
        for match, participant in matches_data:
            champion_stats[participant.champion_name].append((match, participant))
        
        # Calculate stats for each champion
        champion_performance = []
        for champion_name, champion_matches in champion_stats.items():
            total_games = len(champion_matches)
            wins = sum(1 for _, p in champion_matches if p.win)
            
            # Calculate averages
            avg_kills = statistics.mean([p.kills for _, p in champion_matches])
            avg_deaths = statistics.mean([p.deaths for _, p in champion_matches])
            avg_assists = statistics.mean([p.assists for _, p in champion_matches])
            avg_kda = (avg_kills + avg_assists) / avg_deaths if avg_deaths > 0 else float(avg_kills + avg_assists)
            
            # CS per minute
            cs_per_min_values = []
            for match, participant in champion_matches:
                if match.game_duration > 0:
                    cs_per_min = participant.total_minions_killed / (match.game_duration / 60)
                    cs_per_min_values.append(cs_per_min)
            
            avg_cs_per_min = statistics.mean(cs_per_min_values) if cs_per_min_values else 0.0
            avg_damage = statistics.mean([p.total_damage_dealt_to_champions for _, p in champion_matches])
            avg_vision = statistics.mean([p.vision_score for _, p in champion_matches])
            
            champion_performance.append({
                "champion_name": champion_name,
                "champion_id": champion_matches[0][1].champion_id,  # Get from first match
                "total_games": total_games,
                "wins": wins,
                "losses": total_games - wins,
                "win_rate": round((wins / total_games) * 100, 1),
                "avg_kda": round(avg_kda, 2),
                "avg_kills": round(avg_kills, 1),
                "avg_deaths": round(avg_deaths, 1),
                "avg_assists": round(avg_assists, 1),
                "avg_cs_per_min": round(avg_cs_per_min, 1),
                "avg_damage_to_champions": round(avg_damage, 0),
                "avg_vision_score": round(avg_vision, 1),
                "last_played": max([m.game_creation for m, _ in champion_matches])
            })
        
        # Sort by total games played (most played first)
        champion_performance.sort(key=lambda x: x["total_games"], reverse=True)
        
        return champion_performance
    
    @staticmethod
    async def get_performance_trends(
        db: AsyncSession, 
        puuid: str, 
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate performance trends over time
        
        Args:
            db: Database session
            puuid: Player PUUID
            days: Number of days to analyze
            
        Returns:
            Dictionary containing trend data
        """
        date_threshold = datetime.now() - timedelta(days=days)
        
        # Get matches ordered by date
        result = await db.execute(
            select(Match, MatchParticipant)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(
                and_(
                    MatchParticipant.puuid == puuid,
                    Match.game_creation >= date_threshold
                )
            )
            .order_by(Match.game_creation.asc())
        )
        
        matches_data = result.all()
        
        if len(matches_data) < 5:  # Need at least 5 matches for meaningful trends
            return {
                "trend_data": [],
                "win_rate_trend": "insufficient_data",
                "kda_trend": "insufficient_data",
                "cs_trend": "insufficient_data"
            }
        
        # Group matches by day
        daily_stats = defaultdict(lambda: {
            "matches": [],
            "date": None
        })
        
        for match, participant in matches_data:
            date_key = match.game_creation.date()
            daily_stats[date_key]["matches"].append((match, participant))
            daily_stats[date_key]["date"] = date_key
        
        # Calculate daily aggregates
        trend_data = []
        for date_key in sorted(daily_stats.keys()):
            day_data = daily_stats[date_key]
            matches = day_data["matches"]
            
            if not matches:
                continue
            
            wins = sum(1 for _, p in matches if p.win)
            total_games = len(matches)
            
            # Calculate daily averages
            avg_kda_values = []
            avg_cs_values = []
            
            for match, participant in matches:
                kda = (participant.kills + participant.assists) / participant.deaths if participant.deaths > 0 else float(participant.kills + participant.assists)
                avg_kda_values.append(kda)
                
                if match.game_duration > 0:
                    cs_per_min = participant.total_minions_killed / (match.game_duration / 60)
                    avg_cs_values.append(cs_per_min)
            
            trend_data.append({
                "date": date_key.isoformat(),
                "total_games": total_games,
                "wins": wins,
                "win_rate": round((wins / total_games) * 100, 1),
                "avg_kda": round(statistics.mean(avg_kda_values), 2),
                "avg_cs_per_min": round(statistics.mean(avg_cs_values), 1) if avg_cs_values else 0.0
            })
        
        # Calculate overall trends
        if len(trend_data) >= 2:
            # Simple trend analysis (compare first half vs second half)
            mid_point = len(trend_data) // 2
            first_half = trend_data[:mid_point]
            second_half = trend_data[mid_point:]
            
            # Win rate trend
            first_half_wr = statistics.mean([d["win_rate"] for d in first_half])
            second_half_wr = statistics.mean([d["win_rate"] for d in second_half])
            wr_trend = "improving" if second_half_wr > first_half_wr else "declining" if second_half_wr < first_half_wr else "stable"
            
            # KDA trend
            first_half_kda = statistics.mean([d["avg_kda"] for d in first_half])
            second_half_kda = statistics.mean([d["avg_kda"] for d in second_half])
            kda_trend = "improving" if second_half_kda > first_half_kda else "declining" if second_half_kda < first_half_kda else "stable"
            
            # CS trend
            first_half_cs = statistics.mean([d["avg_cs_per_min"] for d in first_half if d["avg_cs_per_min"] > 0])
            second_half_cs = statistics.mean([d["avg_cs_per_min"] for d in second_half if d["avg_cs_per_min"] > 0])
            cs_trend = "improving" if second_half_cs > first_half_cs else "declining" if second_half_cs < first_half_cs else "stable"
        else:
            wr_trend = kda_trend = cs_trend = "insufficient_data"
        
        return {
            "trend_data": trend_data,
            "win_rate_trend": wr_trend,
            "kda_trend": kda_trend,
            "cs_trend": cs_trend
        }
    
    @staticmethod
    async def get_gpi_metrics(
        db: AsyncSession, 
        puuid: str, 
        days: int = 30
    ) -> Dict[str, float]:
        """
        Calculate GPI-style performance metrics
        
        Args:
            db: Database session
            puuid: Player PUUID
            days: Number of days to analyze
            
        Returns:
            Dictionary with GPI-style metrics (0-10 scale)
        """
        date_threshold = datetime.now() - timedelta(days=days)
        
        # Get matches
        result = await db.execute(
            select(Match, MatchParticipant)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(
                and_(
                    MatchParticipant.puuid == puuid,
                    Match.game_creation >= date_threshold
                )
            )
        )
        
        matches_data = result.all()
        
        if not matches_data:
            return {
                "aggression": 0.0,
                "farming": 0.0,
                "survivability": 0.0,
                "vision": 0.0,
                "versatility": 0.0,
                "consistency": 0.0
            }
        
        # Calculate metrics
        total_games = len(matches_data)
        
        # 1. Aggression (based on kills, damage, and combat participation)
        kills_per_game = statistics.mean([p.kills for _, p in matches_data])
        damage_values = [p.total_damage_dealt_to_champions for _, p in matches_data]
        avg_damage = statistics.mean(damage_values)
        # Normalize aggression score (assuming average damage around 15000 for scaling)
        aggression_score = min(10.0, (kills_per_game * 1.5 + (avg_damage / 2000)) / 2)
        
        # 2. Farming (CS per minute)
        cs_per_min_values = []
        for match, participant in matches_data:
            if match.game_duration > 0:
                cs_per_min = participant.total_minions_killed / (match.game_duration / 60)
                cs_per_min_values.append(cs_per_min)
        
        avg_cs_per_min = statistics.mean(cs_per_min_values) if cs_per_min_values else 0.0
        # Scale CS per minute (6+ CS/min = good, 8+ = excellent)
        farming_score = min(10.0, (avg_cs_per_min / 8.0) * 10)
        
        # 3. Survivability (inverse of deaths per game)
        deaths_per_game = statistics.mean([p.deaths for _, p in matches_data])
        # Scale survivability (fewer deaths = higher score, 3 deaths avg = 7 score)
        survivability_score = max(0.0, min(10.0, 10 - (deaths_per_game - 2) * 1.5))
        
        # 4. Vision (vision score)
        avg_vision_score = statistics.mean([p.vision_score for _, p in matches_data])
        # Scale vision score (30+ vision = good, 50+ = excellent)
        vision_score = min(10.0, (avg_vision_score / 50.0) * 10)
        
        # 5. Versatility (champion pool diversity)
        unique_champions = len(set(p.champion_name for _, p in matches_data))
        # Scale versatility (5+ champions = good versatility)
        versatility_score = min(10.0, (unique_champions / 5.0) * 10)
        
        # 6. Consistency (win rate and performance variance)
        win_rate = (sum(1 for _, p in matches_data if p.win) / total_games) * 100
        
        # Calculate KDA variance for consistency
        kda_values = []
        for _, participant in matches_data:
            kda = (participant.kills + participant.assists) / participant.deaths if participant.deaths > 0 else float(participant.kills + participant.assists)
            kda_values.append(kda)
        
        kda_std_dev = statistics.stdev(kda_values) if len(kda_values) > 1 else 0
        
        # Consistency based on win rate and low variance
        consistency_base = (win_rate / 100) * 10  # Win rate component
        consistency_penalty = min(3.0, kda_std_dev * 0.5)  # Penalty for high variance
        consistency_score = max(0.0, consistency_base - consistency_penalty)
        
        return {
            "aggression": round(aggression_score, 1),
            "farming": round(farming_score, 1),
            "survivability": round(survivability_score, 1),
            "vision": round(vision_score, 1),
            "versatility": round(versatility_score, 1),
            "consistency": round(consistency_score, 1)
        }
    
    @staticmethod
    async def get_recent_match_performance(
        db: AsyncSession, 
        puuid: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get detailed performance data for recent matches
        
        Args:
            db: Database session
            puuid: Player PUUID
            limit: Number of recent matches to analyze
            
        Returns:
            List of detailed match performance data
        """
        result = await db.execute(
            select(Match, MatchParticipant)
            .join(MatchParticipant, Match.match_id == MatchParticipant.match_id)
            .where(MatchParticipant.puuid == puuid)
            .order_by(Match.game_creation.desc())
            .limit(limit)
        )
        
        matches_data = result.all()
        
        performance_data = []
        for match, participant in matches_data:
            # Calculate derived metrics
            cs_per_min = participant.total_minions_killed / (match.game_duration / 60) if match.game_duration > 0 else 0
            damage_per_min = participant.total_damage_dealt_to_champions / (match.game_duration / 60) if match.game_duration > 0 else 0
            
            # Calculate performance score (simple heuristic)
            performance_score = 0
            performance_score += participant.kills * 3
            performance_score += participant.assists * 1.5
            performance_score -= participant.deaths * 2
            performance_score += (cs_per_min - 5) * 2  # Bonus for CS above 5/min
            performance_score += (participant.vision_score - 20) * 0.1  # Bonus for vision above 20
            
            # Win bonus
            if participant.win:
                performance_score += 10
            
            performance_data.append({
                "match_id": match.match_id,
                "game_creation": match.game_creation,
                "duration_minutes": round(match.game_duration / 60, 1),
                "champion_name": participant.champion_name,
                "champion_id": participant.champion_id,
                "kills": participant.kills,
                "deaths": participant.deaths,
                "assists": participant.assists,
                "kda_ratio": participant.kda_ratio,
                "cs": participant.total_minions_killed,
                "cs_per_min": round(cs_per_min, 1),
                "damage_to_champions": participant.total_damage_dealt_to_champions,
                "damage_per_min": round(damage_per_min, 0),
                "vision_score": participant.vision_score,
                "gold_earned": participant.gold_earned,
                "win": participant.win,
                "performance_score": round(performance_score, 1),
                "queue_id": match.queue_id,
                "game_mode": match.game_mode
            })
        
        return performance_data
