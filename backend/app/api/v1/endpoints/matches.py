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
        print(f"🔍 Fetching match details for match_id: {match_id}")
        match = await MatchService.get_match_with_participants(db, match_id)
        if not match:
            print(f"❌ Match not found in database: {match_id}")
            raise HTTPException(status_code=404, detail="Match not found")
        
        print(f"✅ Found match: {match.match_id}")
        
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
            try:
                # Fetch participants using the service method to avoid async issues
                participant_list = await MatchService.get_participants_by_match_id(db, match_id)
                print(f"🔍 Found {len(participant_list)} participants for match {match_id}")
                
                for participant in participant_list:
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
                
                print(f"✅ Successfully processed {len(participants)} participants")
                match_response.participants = participants
                
            except Exception as participant_error:
                print(f"❌ Error processing participants: {str(participant_error)}")
                import traceback
                traceback.print_exc()
                # If participants fail, still return the match without participants
                print("⚠️ Returning match without participants due to error")
        
        return match_response
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        print(f"❌ Unexpected error in get_match_detail: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving match details: {str(e)}")


@router.get("/debug/list-matches", response_model=List[str])
async def list_all_matches(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100, description="Number of matches to list")
):
    """
    Debug endpoint to list all match IDs in the database
    """
    try:
        from sqlalchemy import select
        from app.models.match import Match
        
        result = await db.execute(
            select(Match.match_id)
            .order_by(Match.game_creation.desc())
            .limit(limit)
        )
        match_ids = result.scalars().all()
        print(f"🔍 Found {len(match_ids)} matches in database: {match_ids}")
        return match_ids
        
    except Exception as e:
        print(f"❌ Error listing matches: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing matches: {str(e)}")


@router.get("/debug/match-participants/{match_id}")
async def debug_match_participants(
    match_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Debug endpoint to check participants for a specific match
    """
    try:
        # Check if match exists
        match = await MatchService.get_match_by_id(db, match_id)
        if not match:
            return {"error": "Match not found", "match_id": match_id}
        
        # Get participants separately
        participants = await MatchService.get_participants_by_match_id(db, match_id)
        
        return {
            "match_id": match_id,
            "match_exists": True,
            "participants_count": len(participants),
            "participants": [
                {
                    "puuid": p.puuid,
                    "champion_name": p.champion_name,
                    "team_id": p.team_id,
                    "participant_id": p.participant_id
                } for p in participants
            ]
        }
        
    except Exception as e:
        print(f"❌ Error debugging match participants: {str(e)}")
        return {"error": str(e), "match_id": match_id} 