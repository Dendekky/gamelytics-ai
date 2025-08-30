from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.services.analytics_service import AnalyticsService
from app.services.rate_limiter import rate_limiter
from app.services.cache_service import cache_manager, cache
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


@router.get("/activity/{puuid}")
async def get_activity_heatmap(
    puuid: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get activity heatmap data showing gaming patterns by day and hour"""
    try:
        activity_data = await AnalyticsService.get_activity_heatmap(db, puuid, days)
        return activity_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get activity heatmap: {str(e)}")


@router.get("/roles/{puuid}")
async def get_role_performance(
    puuid: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get performance statistics broken down by role/position"""
    try:
        role_data = await AnalyticsService.get_role_performance(db, puuid, days)
        return role_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get role performance: {str(e)}")


@router.get("/roles/{puuid}/{role}")
async def get_role_benchmarks(
    puuid: str,
    role: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed benchmarks and recommendations for a specific role"""
    try:
        # Validate role
        valid_roles = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"]
        if role.upper() not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
        
        benchmark_data = await AnalyticsService.get_role_benchmarks(db, puuid, role.upper(), days)
        return benchmark_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get role benchmarks: {str(e)}")


@router.get("/rate-limit-status")
async def get_rate_limit_status():
    """Get current rate limit status for monitoring"""
    try:
        status = rate_limiter.get_rate_limit_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get rate limit status: {str(e)}")


@router.get("/cache-status")
async def get_cache_status():
    """Get current cache status for monitoring"""
    try:
        status = await cache_manager.get_cache_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache status: {str(e)}")


@router.post("/cache/clear")
async def clear_cache():
    """Clear all cache entries"""
    try:
        await cache.clear()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.post("/cache/clear-analytics")
async def clear_analytics_cache():
    """Clear only analytics cache entries"""
    try:
        # For now, clear all cache since we don't have pattern-based deletion
        # In production with Redis, you'd use pattern matching
        await cache.clear()
        return {"message": "Analytics cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear analytics cache: {str(e)}")


@router.post("/cache/cleanup")
async def cleanup_cache():
    """Manually trigger cache cleanup"""
    try:
        removed_count = await cache.cleanup_expired()
        return {"message": f"Cleaned up {removed_count} expired cache entries"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup cache: {str(e)}")


@router.post("/cache/invalidate/{puuid}")
async def invalidate_user_cache(puuid: str):
    """Invalidate cache for a specific user"""
    try:
        await cache_manager.invalidate_user_cache(puuid)
        return {"message": f"Cache invalidated for user {puuid}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to invalidate cache: {str(e)}")