from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.schemas.champion_mastery import (
    ChampionMasteryResponse, 
    ChampionMasteryListResponse, 
    ChampionMasterySummaryResponse,
    ChampionMasteryEnhancedResponse,
    ChampionMasteryWithPerformance
)
from app.services.champion_mastery_service import ChampionMasteryService
from app.services.summoner_service import SummonerService
from app.services.analytics_service import AnalyticsService
from app.services.champion_data_service import ChampionDataService

router = APIRouter()


@router.get("/{puuid}", response_model=ChampionMasteryListResponse)
async def get_champion_masteries(
    puuid: str,
    limit: Optional[int] = Query(None, description="Limit number of masteries returned"),
    db: AsyncSession = Depends(get_db)
):
    """Get champion masteries for a summoner"""
    try:
        masteries = await ChampionMasteryService.get_top_masteries(db, puuid, limit or 50)
        
        return ChampionMasteryListResponse(
            masteries=[ChampionMasteryResponse(**mastery) for mastery in masteries],
            total_count=len(masteries)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch champion masteries: {str(e)}")


@router.get("/{puuid}/summary", response_model=ChampionMasterySummaryResponse)
async def get_mastery_summary(
    puuid: str,
    db: AsyncSession = Depends(get_db)
):
    """Get champion mastery summary statistics"""
    try:
        summary = await ChampionMasteryService.get_mastery_stats_summary(db, puuid)
        return ChampionMasterySummaryResponse(**summary)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch mastery summary: {str(e)}")


@router.post("/{puuid}/sync")
async def sync_champion_masteries(
    puuid: str,
    region: str = Query("na1", description="Region for API calls"),
    db: AsyncSession = Depends(get_db)
):
    """Fetch and store latest champion masteries from Riot API"""
    try:
        # Get summoner info to get summoner_id
        summoner = await SummonerService.get_summoner_by_puuid(db, puuid)
        if not summoner:
            raise HTTPException(status_code=404, detail="Summoner not found")
        
        
        # Fetch and store masteries
        masteries = await ChampionMasteryService.fetch_and_store_masteries(
            db, puuid, region
        )
        
        return {
            "message": f"Successfully synced {len(masteries)} champion masteries",
            "count": len(masteries),
            "puuid": puuid
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync masteries: {str(e)}")


@router.get("/{puuid}/enhanced", response_model=ChampionMasteryEnhancedResponse)
async def get_enhanced_masteries(
    puuid: str,
    limit: Optional[int] = Query(10, description="Limit number of masteries returned"),
    days: Optional[int] = Query(30, description="Days to look back for performance data"),
    db: AsyncSession = Depends(get_db)
):
    """Get champion masteries enhanced with performance data from recent matches"""
    try:
        # Get mastery data
        masteries = await ChampionMasteryService.get_top_masteries(db, puuid, limit)
        summary = await ChampionMasteryService.get_mastery_stats_summary(db, puuid)
        
        # Get champion performance data
        try:
            champion_performance = await AnalyticsService.get_champion_performance(db, puuid, days)
        except Exception:
            # Return empty performance data to continue
            champion_performance = []
        
        # Create a lookup for champion performance
        try:
            performance_lookup = {cp["champion_id"]: cp for cp in champion_performance}
        except Exception:
            performance_lookup = {}
        
        # Enhance masteries with performance data
        enhanced_masteries = []
        for mastery in masteries:
            try:
                perf_data = performance_lookup.get(mastery["champion_id"], {})
                
                # Get champion name from performance data or dynamically fetch it
                champion_name = perf_data.get("champion_name")
                if not champion_name:
                    champion_name = await ChampionDataService.get_champion_name_by_id(mastery["champion_id"])
                
                enhanced_mastery = ChampionMasteryWithPerformance(
                        champion_id=mastery["champion_id"],
                        champion_name=champion_name,
                        mastery_level=mastery["mastery_level"],
                        mastery_points=mastery["mastery_points"],
                        points_until_next_level=mastery["points_until_next_level"],
                        chest_granted=mastery["chest_granted"],
                        tokens_earned=mastery["tokens_earned"],
                        last_play_time=mastery["last_play_time"],
                        mastery_progress_percentage=mastery["mastery_progress_percentage"],
                        total_games_played=perf_data.get("total_games", 0),
                        wins=perf_data.get("wins", 0),
                        losses=perf_data.get("losses", 0),
                        win_rate=perf_data.get("win_rate", 0.0),
                        avg_kda=perf_data.get("avg_kda", 0.0),
                        avg_cs_per_min=perf_data.get("avg_cs_per_min", 0.0),
                        last_played_match=perf_data.get("last_played").isoformat() if perf_data.get("last_played") else None
                )
                enhanced_masteries.append(enhanced_mastery)
            except Exception:
                continue
        
        response = ChampionMasteryEnhancedResponse(
            masteries=enhanced_masteries,
            summary=ChampionMasterySummaryResponse(**summary),
            total_count=len(enhanced_masteries)
        )
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch enhanced masteries: {str(e)}")


@router.get("/{puuid}/champion/{champion_id}", response_model=ChampionMasteryResponse)
async def get_champion_mastery(
    puuid: str,
    champion_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get mastery for a specific champion"""
    try:
        mastery = await ChampionMasteryService.get_mastery_by_champion(db, puuid, champion_id)
        
        if not mastery:
            raise HTTPException(status_code=404, detail="Champion mastery not found")
        
        return ChampionMasteryResponse(
            champion_id=mastery.champion_id,
            mastery_level=mastery.mastery_level,
            mastery_points=mastery.mastery_points,
            points_until_next_level=mastery.points_until_next_level,
            chest_granted=mastery.chest_granted,
            tokens_earned=mastery.tokens_earned,
            last_play_time=mastery.last_play_time.isoformat() if mastery.last_play_time else None,
            mastery_progress_percentage=mastery.mastery_progress_percentage,
            updated_at=mastery.updated_at.isoformat() if mastery.updated_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch champion mastery: {str(e)}")
