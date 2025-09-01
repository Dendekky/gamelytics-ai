from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.services.live_game_service import LiveGameService
from app.services.build_recommendations_service import BuildRecommendationsService
from app.services.cache_service import cache_manager
from app.models.summoner import Summoner
from sqlalchemy import select

router = APIRouter()


@router.get("/status/{puuid}")
async def get_live_game_status(
    puuid: str,
    region: str = "na1",
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a player is currently in a live game and provide analysis
    
    Args:
        puuid: Player PUUID
        region: Region for API calls (na1, euw1, etc.)
        
    Returns:
        Live game status with enemy analysis and recommendations if in game
    """
    try:
        # Check if summoner exists in our database
        result = await db.execute(
            select(Summoner).where(Summoner.puuid == puuid)
        )
        summoner = result.scalar_one_or_none()
        
        if not summoner:
            raise HTTPException(
                status_code=404, 
                detail="Summoner not found. Please sync summoner data first."
            )
        
        # Get live game status with caching
        live_status = await LiveGameService.get_live_game_status(db, puuid, region)
        
        return {
            "success": True,
            "data": live_status,
            "region": region,
            "summoner": {
                "puuid": summoner.puuid,
                "game_name": summoner.game_name,
                "tag_line": summoner.tag_line,
                "riot_id": summoner.riot_id,
                "region": summoner.region
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking live game status: {str(e)}")


@router.get("/monitor")
async def monitor_multiple_players(
    puuids: str,  # Comma-separated list of PUUIDs
    region: str = "na1",
    db: AsyncSession = Depends(get_db)
):
    """
    Monitor multiple players for live games (useful for teams/friends)
    
    Args:
        puuids: Comma-separated list of PUUIDs to monitor
        region: Region for API calls
        
    Returns:
        Dictionary with live game status for each player
    """
    try:
        puuid_list = [puuid.strip() for puuid in puuids.split(",") if puuid.strip()]
        
        if not puuid_list:
            raise HTTPException(status_code=400, detail="No valid PUUIDs provided")
        
        if len(puuid_list) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 players can be monitored at once")
        
        # Monitor all players
        results = await LiveGameService.monitor_player_games(db, puuid_list, region)
        
        return {
            "success": True,
            "data": results,
            "region": region,
            "monitored_count": len(puuid_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error monitoring players: {str(e)}")


@router.get("/featured-games")
async def get_featured_games(
    region: str = "na1",
    db: AsyncSession = Depends(get_db)
):
    """
    Get featured games (high MMR/streamer games) from Riot API
    
    Args:
        region: Region for API calls
        
    Returns:
        List of featured games
    """
    try:
        from app.services.riot_client import RiotClient
        
        riot_client = RiotClient()
        featured_games = await riot_client.get_featured_games(region)
        
        if not featured_games:
            return {
                "success": True,
                "data": {
                    "gameList": [],
                    "clientRefreshInterval": 300000
                },
                "message": "No featured games available"
            }
        
        return {
            "success": True,
            "data": featured_games,
            "region": region
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching featured games: {str(e)}")


@router.post("/analyze-enemy/{puuid}")
async def analyze_enemy_team(
    puuid: str,
    region: str = "na1",
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Perform detailed enemy team analysis for a player in a live game
    
    Args:
        puuid: Player PUUID
        region: Region for API calls
        
    Returns:
        Detailed enemy team analysis with counter strategies
    """
    try:
        # First check if player is in a live game
        live_status = await LiveGameService.get_live_game_status(db, puuid, region)
        
        if not live_status or not live_status.get("is_in_game"):
            raise HTTPException(
                status_code=404, 
                detail="Player is not currently in a live game"
            )
        
        # Return the enemy analysis from the live status
        enemy_analysis = live_status.get("enemy_analysis", {})
        recommendations = live_status.get("recommendations", {})
        
        return {
            "success": True,
            "data": {
                "enemy_analysis": enemy_analysis,
                "recommendations": recommendations,
                "game_info": live_status.get("game_info"),
                "team_composition": live_status.get("team_composition")
            },
            "region": region
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing enemy team: {str(e)}")


@router.get("/recommendations/{puuid}")
async def get_live_game_recommendations(
    puuid: str,
    region: str = "na1",
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time game recommendations for a player in a live game
    
    Args:
        puuid: Player PUUID
        region: Region for API calls
        
    Returns:
        Real-time recommendations for items, strategy, warding, etc.
    """
    try:
        # Check if player is in live game
        live_status = await LiveGameService.get_live_game_status(db, puuid, region)
        
        if not live_status or not live_status.get("is_in_game"):
            raise HTTPException(
                status_code=404, 
                detail="Player is not currently in a live game"
            )
        
        recommendations = live_status.get("recommendations", {})
        game_info = live_status.get("game_info", {})
        
        # Add time-based context
        game_length_minutes = (game_info.get("game_length", 0)) // 60
        
        return {
            "success": True,
            "data": {
                "recommendations": recommendations,
                "game_time_minutes": game_length_minutes,
                "game_phase": (
                    "early" if game_length_minutes < 15 
                    else "mid" if game_length_minutes < 30 
                    else "late"
                ),
                "next_major_objective": (
                    "First Dragon" if game_length_minutes < 5
                    else "Herald/Dragon" if game_length_minutes < 20
                    else "Baron/Elder Dragon"
                )
            },
            "region": region
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recommendations: {str(e)}")


@router.post("/clear-cache")
async def clear_live_game_cache(
    puuid: Optional[str] = None
):
    """
    Clear live game cache (for debugging or forcing fresh data)
    
    Args:
        puuid: Optional - clear cache for specific player, or all if not provided
    """
    try:
        if puuid:
            await cache_manager.invalidate_user_cache(puuid)
            message = f"Cleared cache for player {puuid[:8]}..."
        else:
            from app.services.cache_service import cache
            await cache.clear()
            message = "Cleared all live game cache"
        
        return {
            "success": True,
            "message": message
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")


@router.get("/cache-status")
async def get_cache_status():
    """
    Get live game cache status for monitoring
    """
    try:
        cache_status = await cache_manager.get_cache_status()
        
        return {
            "success": True,
            "data": cache_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting cache status: {str(e)}")


@router.get("/build-recommendations/{puuid}")
async def get_build_recommendations(
    puuid: str,
    region: str = "na1",
    db: AsyncSession = Depends(get_db)
):
    """
    Get intelligent build recommendations for a player in a live game
    
    Args:
        puuid: Player PUUID
        region: Region for API calls
        
    Returns:
        Build recommendations based on enemy team composition and game state
    """
    try:
        # First check if player is in a live game
        live_status = await LiveGameService.get_live_game_status(db, puuid, region)
        
        if not live_status or not live_status.get("is_in_game"):
            raise HTTPException(
                status_code=404, 
                detail="Player is not currently in a live game"
            )
        
        game_id = live_status.get("game_info", {}).get("game_id")
        if not game_id:
            raise HTTPException(
                status_code=400,
                detail="Could not determine game ID"
            )
        
        # Get build recommendations
        recommendations = await BuildRecommendationsService.get_cached_build_recommendations(
            db, puuid, game_id
        )
        
        return {
            "success": True,
            "data": recommendations,
            "region": region,
            "game_id": game_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting build recommendations: {str(e)}")


# WebSocket endpoint for real-time updates (future enhancement)
# @router.websocket("/ws/{puuid}")
# async def live_game_websocket(websocket: WebSocket, puuid: str):
#     """
#     WebSocket endpoint for real-time live game updates
#     """
#     await websocket.accept()
#     try:
#         while True:
#             # Send live game updates every 30 seconds
#             await asyncio.sleep(30)
#             # Implementation would go here
#     except Exception as e:
#         print(f"WebSocket error: {e}")
#     finally:
#         await websocket.close()
