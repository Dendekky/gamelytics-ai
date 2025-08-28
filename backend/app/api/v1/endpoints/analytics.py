from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    AnalyticsRequest,
    PlayerOverviewStats,
    ChampionPerformance,
    PerformanceTrends,
    GPIMetrics,
    RecentMatchPerformance,
    ComprehensiveAnalytics
)

router = APIRouter()


@router.get("/overview/{puuid}", response_model=PlayerOverviewStats)
async def get_player_overview(
    puuid: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get overview statistics for a player"""
    try:
        stats = await AnalyticsService.get_player_overview_stats(db, puuid, days)
        return PlayerOverviewStats(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get overview stats: {str(e)}")


@router.get("/champions/{puuid}", response_model=List[ChampionPerformance])
async def get_champion_performance(
    puuid: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get per-champion performance statistics"""
    try:
        performance = await AnalyticsService.get_champion_performance(db, puuid, days)
        return [ChampionPerformance(**champ) for champ in performance]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get champion performance: {str(e)}")


@router.get("/gpi/{puuid}", response_model=GPIMetrics)
async def get_gpi_metrics(
    puuid: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get GPI-style performance metrics (0-10 scale)"""
    try:
        metrics = await AnalyticsService.get_gpi_metrics(db, puuid, days)
        return GPIMetrics(**metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get GPI metrics: {str(e)}")


@router.get("/comprehensive/{puuid}", response_model=ComprehensiveAnalytics)
async def get_comprehensive_analytics(
    puuid: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive analytics combining all metrics"""
    try:
        # Fetch all analytics data
        overview_stats = await AnalyticsService.get_player_overview_stats(db, puuid, days)
        champion_performance = await AnalyticsService.get_champion_performance(db, puuid, days)
        performance_trends = await AnalyticsService.get_performance_trends(db, puuid, days)
        gpi_metrics = await AnalyticsService.get_gpi_metrics(db, puuid, days)
        recent_matches = await AnalyticsService.get_recent_match_performance(db, puuid, 10)
        
        return ComprehensiveAnalytics(
            puuid=puuid,
            overview_stats=PlayerOverviewStats(**overview_stats),
            champion_performance=[ChampionPerformance(**champ) for champ in champion_performance],
            performance_trends=PerformanceTrends(**performance_trends),
            gpi_metrics=GPIMetrics(**gpi_metrics),
            recent_matches=[RecentMatchPerformance(**match) for match in recent_matches],
            generated_at=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get comprehensive analytics: {str(e)}")