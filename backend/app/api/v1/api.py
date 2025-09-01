from fastapi import APIRouter

from app.api.v1.endpoints import summoners, matches, analytics, champion_mastery, live_games

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(summoners.router, prefix="/summoners", tags=["summoners"])
api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(champion_mastery.router, prefix="/champion-mastery", tags=["champion-mastery"])
api_router.include_router(live_games.router, prefix="/live-games", tags=["live-games"]) 