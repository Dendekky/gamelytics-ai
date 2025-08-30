import asyncio
import time
from typing import Dict, List, Optional
from collections import defaultdict, deque
from datetime import datetime, timedelta


class RateLimiter:
    """
    Rate limiter for Riot API calls that respects both personal and application rate limits
    
    Riot API Rate Limits (Development Key):
    - Personal rate limits: 100 requests every 2 minutes
    - Application rate limits: 20 requests every 1 second
    
    Production keys have different limits that can be configured
    """
    
    def __init__(self, 
                 requests_per_second: int = 20, 
                 requests_per_2min: int = 100):
        self.requests_per_second = requests_per_second
        self.requests_per_2min = requests_per_2min
        
        # Track requests for different time windows
        self.requests_1s: deque = deque()  # Track requests in last 1 second
        self.requests_2min: deque = deque()  # Track requests in last 2 minutes
        
        # Track API-specific rate limits (some endpoints have specific limits)
        self.endpoint_limits: Dict[str, List[float]] = defaultdict(list)
        
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
    
    async def acquire(self, endpoint: Optional[str] = None) -> bool:
        """
        Acquire permission to make an API request
        
        Args:
            endpoint: Optional specific endpoint for per-endpoint rate limiting
            
        Returns:
            True when permission is granted (may involve waiting)
        """
        async with self._lock:
            current_time = time.time()
            
            # Clean up old requests
            self._cleanup_old_requests(current_time)
            
            # Check if we need to wait
            wait_time = self._calculate_wait_time(current_time)
            
            if wait_time > 0:
                print(f"⏱️ Rate limit reached, waiting {wait_time:.2f} seconds...")
                await asyncio.sleep(wait_time)
                current_time = time.time()
                self._cleanup_old_requests(current_time)
            
            # Record the request
            self.requests_1s.append(current_time)
            self.requests_2min.append(current_time)
            
            if endpoint:
                self.endpoint_limits[endpoint].append(current_time)
            
            return True
    
    def _cleanup_old_requests(self, current_time: float) -> None:
        """Remove requests older than the rate limit windows"""
        # Remove requests older than 1 second
        while self.requests_1s and current_time - self.requests_1s[0] > 1.0:
            self.requests_1s.popleft()
        
        # Remove requests older than 2 minutes (120 seconds)
        while self.requests_2min and current_time - self.requests_2min[0] > 120.0:
            self.requests_2min.popleft()
        
        # Clean up endpoint-specific tracking (keep last 2 minutes)
        for endpoint in self.endpoint_limits:
            while (self.endpoint_limits[endpoint] and 
                   current_time - self.endpoint_limits[endpoint][0] > 120.0):
                self.endpoint_limits[endpoint].pop(0)
    
    def _calculate_wait_time(self, current_time: float) -> float:
        """Calculate how long to wait before making the next request"""
        wait_times = []
        
        # Check 1-second rate limit
        if len(self.requests_1s) >= self.requests_per_second:
            oldest_request = self.requests_1s[0]
            wait_time_1s = 1.0 - (current_time - oldest_request)
            if wait_time_1s > 0:
                wait_times.append(wait_time_1s)
        
        # Check 2-minute rate limit
        if len(self.requests_2min) >= self.requests_per_2min:
            oldest_request = self.requests_2min[0]
            wait_time_2min = 120.0 - (current_time - oldest_request)
            if wait_time_2min > 0:
                wait_times.append(wait_time_2min)
        
        return max(wait_times) if wait_times else 0.0
    
    def get_rate_limit_status(self) -> Dict[str, any]:
        """Get current rate limit status for monitoring"""
        current_time = time.time()
        self._cleanup_old_requests(current_time)
        
        return {
            "requests_last_second": len(self.requests_1s),
            "requests_last_2min": len(self.requests_2min),
            "limit_per_second": self.requests_per_second,
            "limit_per_2min": self.requests_per_2min,
            "available_requests_1s": max(0, self.requests_per_second - len(self.requests_1s)),
            "available_requests_2min": max(0, self.requests_per_2min - len(self.requests_2min))
        }


class AdaptiveRateLimiter(RateLimiter):
    """
    Advanced rate limiter that adapts to actual API response headers
    and handles 429 (rate limit exceeded) responses
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.backoff_multiplier = 1.0
        self.last_429_time: Optional[float] = None
        self.retry_after: Optional[float] = None
    
    async def handle_rate_limit_response(self, status_code: int, headers: Dict[str, str]) -> None:
        """
        Handle rate limit information from API response headers
        
        Args:
            status_code: HTTP status code
            headers: Response headers from Riot API
        """
        if status_code == 429:  # Rate limit exceeded
            self.last_429_time = time.time()
            
            # Check for Retry-After header
            retry_after = headers.get('Retry-After') or headers.get('retry-after')
            if retry_after:
                self.retry_after = float(retry_after)
                print(f"🚫 Rate limit exceeded! Retry after {self.retry_after} seconds")
            else:
                # Default backoff if no Retry-After header
                self.backoff_multiplier = min(self.backoff_multiplier * 2, 60.0)
                print(f"🚫 Rate limit exceeded! Backing off for {self.backoff_multiplier} seconds")
        
        elif status_code == 200:
            # Successful request, reset backoff
            self.backoff_multiplier = 1.0
            self.retry_after = None
    
    async def acquire(self, endpoint: Optional[str] = None) -> bool:
        """Enhanced acquire that considers 429 backoff"""
        # Check if we're in a backoff period from a 429 response
        if self.retry_after:
            wait_time = self.retry_after
            print(f"⏱️ Waiting {wait_time} seconds due to 429 response...")
            await asyncio.sleep(wait_time)
            self.retry_after = None
        
        # Apply exponential backoff if we recently got a 429
        if self.last_429_time and self.backoff_multiplier > 1.0:
            time_since_429 = time.time() - self.last_429_time
            if time_since_429 < self.backoff_multiplier:
                wait_time = self.backoff_multiplier - time_since_429
                print(f"⏱️ Backoff period active, waiting {wait_time:.2f} seconds...")
                await asyncio.sleep(wait_time)
        
        # Use parent class logic for normal rate limiting
        return await super().acquire(endpoint)


# Global rate limiter instance
rate_limiter = AdaptiveRateLimiter()


async def rate_limited_request(endpoint: Optional[str] = None):
    """Decorator-like function to ensure rate limiting before API requests"""
    await rate_limiter.acquire(endpoint)


def update_rate_limiter_from_response(status_code: int, headers: Dict[str, str]):
    """Update rate limiter based on API response"""
    asyncio.create_task(rate_limiter.handle_rate_limit_response(status_code, headers))
