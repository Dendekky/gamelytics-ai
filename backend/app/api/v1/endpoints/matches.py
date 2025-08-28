from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.match import (
    MatchHistoryResponse, 
    MatchResponse, 
    MatchDetailRequest,
    MatchParticipantResponse,
    PlayerMatchPerformance
)
from app.services.match_service import MatchService
from app.services.summoner_service import SummonerService

router = APIRouter()


@router.get("/{puuid}", response_model=MatchHistoryResponse)
async def get_match_history(
    puuid: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50, description="Number of matches to return"),
    fetch_new: bool = Query(False, description="Fetch new matches from Riot API"),
    region: str = Query("na1", description="Region for API calls")
):
    """
    Get match history for a summoner by PUUID
    
    Parameters:
    - puuid: Player PUUID
    - limit: Number of matches to return (1-50)
    - fetch_new: Whether to fetch new matches from Riot API
    - region: Region for API calls (required if fetch_new=True)
    """
    try:
        # Verify summoner exists
        summoner = await SummonerService.get_summoner_by_puuid(db, puuid)
        if not summoner:
            raise HTTPException(status_code=404, detail="Summoner not found")
        
        # Fetch new matches if requested
        if fetch_new:
            print(f"🔄 Fetching new matches for {puuid} from Riot API...")
            await MatchService.fetch_and_store_recent_matches(db, puuid, region, limit)
        
        # Get matches from database
        matches = await MatchService.get_matches_by_puuid(db, puuid, limit)
        
        # Convert to response format
        match_responses = []
        for match in matches:
            match_response = MatchResponse(
                match_id=match.match_id,
                game_creation=match.game_creation,
                game_duration=match.game_duration,
                duration_minutes=match.duration_minutes,
                game_mode=match.game_mode,
                game_type=match.game_type,
                map_id=match.map_id,
                queue_id=match.queue_id,
                winning_team=match.winning_team
            )
            match_responses.append(match_response)
        
        return MatchHistoryResponse(
            puuid=puuid,
            total_matches=len(match_responses),
            matches=match_responses
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving match history: {str(e)}")


@router.get("/{puuid}/performance", response_model=List[PlayerMatchPerformance])
async def get_player_match_performance(
    puuid: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50, description="Number of matches to return")
):
    """
    Get detailed match performance for a player
    """
    try:
        # Verify summoner exists
        summoner = await SummonerService.get_summoner_by_puuid(db, puuid)
        if not summoner:
            raise HTTPException(status_code=404, detail="Summoner not found")
        
        # Get matches with participant data
        matches = await MatchService.get_matches_by_puuid(db, puuid, limit)
        
        performance_data = []
        for match in matches:
            # Get participant data for this player in this match
            participant = await MatchService.get_match_participant(db, match.match_id, puuid)
            if participant:
                performance = PlayerMatchPerformance(
                    match_id=match.match_id,
                    champion_name=participant.champion_name,
                    kills=participant.kills,
                    deaths=participant.deaths,
                    assists=participant.assists,
                    kda_ratio=participant.kda_ratio,
                    cs=participant.total_minions_killed,
                    gold_earned=participant.gold_earned,
                    damage_to_champions=participant.total_damage_dealt_to_champions,
                    vision_score=participant.vision_score,
                    win=participant.win,
                    game_duration_minutes=match.duration_minutes,
                    game_creation=match.game_creation
                )
                performance_data.append(performance)
        
        return performance_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving player performance: {str(e)}")


@router.get("/detail/{match_id}", response_model=MatchResponse)
async def get_match_detail(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    include_participants: bool = Query(True, description="Include participant data")
):
    """
    Get detailed information about a specific match
    """
    try:
        match = await MatchService.get_match_by_id(db, match_id)
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Create base response
        match_response = MatchResponse(
            match_id=match.match_id,
            game_creation=match.game_creation,
            game_duration=match.game_duration,
            duration_minutes=match.duration_minutes,
            game_mode=match.game_mode,
            game_type=match.game_type,
            map_id=match.map_id,
            queue_id=match.queue_id,
            winning_team=match.winning_team
        )
        
        # Add participants if requested
        if include_participants:
            participants = []
            for participant in match.participants:
                participant_response = MatchParticipantResponse(
                    puuid=participant.puuid,
                    participant_id=participant.participant_id,
                    team_id=participant.team_id,
                    champion_id=participant.champion_id,
                    champion_name=participant.champion_name,
                    champion_level=participant.champion_level,
                    kills=participant.kills,
                    deaths=participant.deaths,
                    assists=participant.assists,
                    kda_ratio=participant.kda_ratio,
                    total_damage_dealt_to_champions=participant.total_damage_dealt_to_champions,
                    gold_earned=participant.gold_earned,
                    total_minions_killed=participant.total_minions_killed,
                    vision_score=participant.vision_score,
                    win=participant.win,
                    items=participant.items
                )
                participants.append(participant_response)
            
            match_response.participants = participants
        
        return match_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving match details: {str(e)}") 