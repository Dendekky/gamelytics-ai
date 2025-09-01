import json
import hashlib
from typing import Any, Optional, Dict, Union
from datetime import datetime, timedelta
import asyncio
from functools import wraps


class InMemoryCache:
    """
    Simple in-memory cache with TTL (Time To Live) support
    
    In production, this would be replaced with Redis, but for development
    this provides basic caching functionality
    """
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        async with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if datetime.now() < entry['expires_at']:
                    return entry['value']
                else:
                    # Expired, remove it
                    del self._cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Set value in cache with TTL"""
        async with self._lock:
            expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
            self._cache[key] = {
                'value': value,
                'expires_at': expires_at
            }
    
    async def delete(self, key: str) -> None:
        """Delete key from cache"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    async def clear(self) -> None:
        """Clear all cache entries"""
        async with self._lock:
            self._cache.clear()
    
    async def cleanup_expired(self) -> int:
        """Remove expired entries and return count of removed items"""
        async with self._lock:
            now = datetime.now()
            expired_keys = [
                key for key, entry in self._cache.items() 
                if now >= entry['expires_at']
            ]
            for key in expired_keys:
                del self._cache[key]
            return len(expired_keys)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        now = datetime.now()
        total_entries = len(self._cache)
        expired_entries = sum(
            1 for entry in self._cache.values() 
            if now >= entry['expires_at']
        )
        active_entries = total_entries - expired_entries
        
        return {
            "total_entries": total_entries,
            "active_entries": active_entries,
            "expired_entries": expired_entries
        }


# Global cache instance
cache = InMemoryCache()


def generate_cache_key(*args, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    # Create a string representation of all arguments
    key_data = {
        'args': args,
        'kwargs': kwargs
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    
    # Create a hash for a consistent, short key
    return hashlib.md5(key_string.encode()).hexdigest()


def cache_result(ttl_seconds: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    
    Args:
        ttl_seconds: Time to live for cached results
        key_prefix: Prefix for cache keys to avoid collisions
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                print(f"📦 Cache hit for {func.__name__}")
                return cached_result
            
            # Not in cache, call the function
            print(f"🔄 Cache miss for {func.__name__}, computing...")
            result = await func(*args, **kwargs)
            
            # Store in cache
            await cache.set(cache_key, result, ttl_seconds)
            
            return result
        return wrapper
    return decorator


class CacheManager:
    """Manages cache operations and cleanup"""
    
    def __init__(self):
        self.cleanup_task: Optional[asyncio.Task] = None
    
    async def start_cleanup_task(self, interval_seconds: int = 300):
        """Start background task to clean up expired cache entries"""
        if self.cleanup_task and not self.cleanup_task.done():
            return  # Already running
        
        self.cleanup_task = asyncio.create_task(self._cleanup_loop(interval_seconds))
    
    async def stop_cleanup_task(self):
        """Stop the cleanup task"""
        if self.cleanup_task and not self.cleanup_task.done():
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
    
    async def _cleanup_loop(self, interval_seconds: int):
        """Background loop to clean up expired entries"""
        while True:
            try:
                await asyncio.sleep(interval_seconds)
                removed_count = await cache.cleanup_expired()
                if removed_count > 0:
                    print(f"🧹 Cleaned up {removed_count} expired cache entries")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Error in cache cleanup: {e}")
    
    async def invalidate_user_cache(self, puuid: str):
        """Invalidate all cache entries for a specific user"""
        # This is a simple implementation - in production with Redis,
        # you'd use pattern matching to delete keys
        await cache.clear()  # For now, clear all cache
        print(f"🗑️ Invalidated cache for user {puuid[:8]}...")
    
    async def get_cache_status(self) -> Dict[str, Any]:
        """Get comprehensive cache status"""
        stats = cache.get_cache_stats()
        return {
            **stats,
            "cleanup_task_running": self.cleanup_task and not self.cleanup_task.done(),
        }


# Global cache manager
cache_manager = CacheManager()


# Cache decorators with different TTLs for different data types
def cache_analytics(ttl_seconds: int = 600):  # 10 minutes for analytics
    return cache_result(ttl_seconds, "analytics")

def cache_match_data(ttl_seconds: int = 1800):  # 30 minutes for match data
    return cache_result(ttl_seconds, "matches")

def cache_champion_data(ttl_seconds: int = 3600):  # 1 hour for champion data
    return cache_result(ttl_seconds, "champions")

def cache_live_data(ttl_seconds: int = 30):  # 30 seconds for live game data
    return cache_result(ttl_seconds, "live_games")

def cache_enemy_analysis(ttl_seconds: int = 300):  # 5 minutes for enemy analysis
    return cache_result(ttl_seconds, "enemy_analysis")

def cache_summoner_data(ttl_seconds: int = 900):  # 15 minutes for summoner data
    return cache_result(ttl_seconds, "summoner")
