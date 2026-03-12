"""
Rate Limiting Module for DDoS Protection

This module provides multiple layers of rate limiting:
1. Global rate limiting - limits total requests per IP across all endpoints
2. Endpoint-specific rate limiting - different limits for different endpoint types
3. Burst protection - prevents sudden spikes in requests
4. Slowloris protection - limits connection duration
"""

import time
import asyncio
from collections import defaultdict
from typing import Dict, Tuple, Optional, Callable
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from threading import Lock
import re

from app.core.logging_config import logger


class RateLimitConfig:
    """Configuration for rate limiting."""

    # Global rate limits (per IP)
    GLOBAL_REQUESTS_PER_SECOND = 50  # Max requests per second (increased from 20)
    GLOBAL_REQUESTS_PER_MINUTE = 500  # Max requests per minute (increased from 200)
    GLOBAL_REQUESTS_PER_HOUR = 10000  # Max requests per hour (increased from 5000)

    # Endpoint-specific limits
    AUTH_REQUESTS_PER_MINUTE = 20  # Stricter for auth endpoints (login, register) (increased from 10)
    WRITE_REQUESTS_PER_MINUTE = 100  # POST, PUT, DELETE operations (increased from 50)
    READ_REQUESTS_PER_MINUTE = 200  # GET operations (increased from 100)

    # Burst protection
    BURST_SIZE = 30  # Max concurrent requests in burst window (increased from 10)
    BURST_WINDOW_SECONDS = 1  # Burst window duration

    # Block duration
    BLOCK_DURATION_SECONDS = 60  # 1 minute block for violating rate limits (reduced from 5 minutes)

    # Request size limits
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB max request body

    # Whitelist paths (no rate limiting)
    WHITELIST_PATHS = [
        r"^/$",
        r"^/docs$",
        r"^/redoc$",
        r"^/openapi\.json$",
        r"^/health$",
    ]

    # Trusted proxies (can be configured for reverse proxy setups)
    TRUSTED_PROXIES = []  # Add your proxy IPs here


class TokenBucket:
    """Token bucket algorithm for rate limiting."""
    
    def __init__(self, rate: float, capacity: int):
        """
        Initialize token bucket.
        
        Args:
            rate: Tokens added per second
            capacity: Maximum tokens in bucket
        """
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()
        self.lock = Lock()
    
    def consume(self, tokens: int = 1) -> bool:
        """
        Try to consume tokens from bucket.
        
        Returns:
            True if tokens were consumed, False if not enough tokens
        """
        with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_update = now
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False
    
    def get_wait_time(self, tokens: int = 1) -> float:
        """Get time to wait before tokens are available."""
        with self.lock:
            if self.tokens >= tokens:
                return 0
            return (tokens - self.tokens) / self.rate


class SlidingWindowCounter:
    """Sliding window counter for rate limiting."""
    
    def __init__(self, window_seconds: int, max_requests: int):
        """
        Initialize sliding window counter.
        
        Args:
            window_seconds: Window duration in seconds
            max_requests: Maximum requests allowed in window
        """
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.requests: Dict[str, list] = defaultdict(list)
        self.lock = Lock()
    
    def is_allowed(self, key: str) -> Tuple[bool, int, int]:
        """
        Check if request is allowed.
        
        Returns:
            Tuple of (is_allowed, current_count, remaining)
        """
        with self.lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            # Clean old requests
            self.requests[key] = [
                ts for ts in self.requests[key] if ts > window_start
            ]
            
            current_count = len(self.requests[key])
            remaining = max(0, self.max_requests - current_count)
            
            if current_count < self.max_requests:
                self.requests[key].append(now)
                return True, current_count + 1, remaining - 1
            
            return False, current_count, 0
    
    def get_retry_after(self, key: str) -> int:
        """Get seconds until oldest request expires."""
        with self.lock:
            if not self.requests[key]:
                return 0
            oldest = min(self.requests[key])
            return int(oldest + self.window_seconds - time.time()) + 1


class IPRateLimiter:
    """Rate limiter for IP addresses."""
    
    def __init__(self):
        self.config = RateLimitConfig()
        
        # Token buckets for burst protection
        self.burst_buckets: Dict[str, TokenBucket] = {}
        
        # Sliding windows for different time periods
        self.second_windows = SlidingWindowCounter(1, self.config.GLOBAL_REQUESTS_PER_SECOND)
        self.minute_windows = SlidingWindowCounter(60, self.config.GLOBAL_REQUESTS_PER_MINUTE)
        self.hour_windows = SlidingWindowCounter(3600, self.config.GLOBAL_REQUESTS_PER_HOUR)
        
        # Endpoint-specific windows
        self.auth_windows = SlidingWindowCounter(60, self.config.AUTH_REQUESTS_PER_MINUTE)
        self.write_windows = SlidingWindowCounter(60, self.config.WRITE_REQUESTS_PER_MINUTE)
        self.read_windows = SlidingWindowCounter(60, self.config.READ_REQUESTS_PER_MINUTE)
        
        # Blocked IPs
        self.blocked_ips: Dict[str, float] = {}
        
        # Lock for burst buckets
        self.burst_lock = Lock()
    
    def _get_burst_bucket(self, ip: str) -> TokenBucket:
        """Get or create burst bucket for IP."""
        with self.burst_lock:
            if ip not in self.burst_buckets:
                self.burst_buckets[ip] = TokenBucket(
                    rate=self.config.BURST_SIZE / self.config.BURST_WINDOW_SECONDS,
                    capacity=self.config.BURST_SIZE
                )
            return self.burst_buckets[ip]
    
    def _is_path_whitelisted(self, path: str) -> bool:
        """Check if path is whitelisted."""
        for pattern in self.config.WHITELIST_PATHS:
            if re.match(pattern, path):
                return True
        return False
    
    def _is_auth_endpoint(self, path: str) -> bool:
        """Check if endpoint is an auth endpoint."""
        auth_patterns = [
            r"^/api/v1/auth/login",
            r"^/api/v1/auth/register",
            r"^/api/v1/auth/token",
            r"^/api/v1/auth/refresh",
        ]
        for pattern in auth_patterns:
            if re.match(pattern, path):
                return True
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        # Check X-Forwarded-For header (for reverse proxy setups)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first IP (original client)
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def is_blocked(self, ip: str) -> bool:
        """Check if IP is blocked."""
        if ip in self.blocked_ips:
            if time.time() < self.blocked_ips[ip]:
                return True
            else:
                del self.blocked_ips[ip]
        return False
    
    def block_ip(self, ip: str, duration: Optional[int] = None):
        """Block an IP for a duration."""
        duration = duration or self.config.BLOCK_DURATION_SECONDS
        self.blocked_ips[ip] = time.time() + duration
        logger.warning(f"IP {ip} blocked for {duration} seconds due to rate limit violation")
    
    def check_rate_limit(self, request: Request) -> Tuple[bool, Optional[Dict]]:
        """
        Check if request should be rate limited.
        
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        path = request.url.path
        
        # Skip whitelisted paths
        if self._is_path_whitelisted(path):
            return True, None
        
        ip = self._get_client_ip(request)
        
        # Check if IP is blocked
        if self.is_blocked(ip):
            retry_after = int(self.blocked_ips[ip] - time.time())
            return False, {
                "error": "IP blocked due to rate limit violation",
                "retry_after": retry_after
            }
        
        method = request.method
        
        # Check burst protection
        burst_bucket = self._get_burst_bucket(ip)
        if not burst_bucket.consume():
            self.block_ip(ip)
            return False, {
                "error": "Too many requests (burst limit exceeded)",
                "retry_after": self.config.BLOCK_DURATION_SECONDS
            }
        
        # Check global rate limits
        allowed, count, remaining = self.second_windows.is_allowed(f"{ip}:second")
        if not allowed:
            self.block_ip(ip)
            return False, {
                "error": "Rate limit exceeded (too many requests per second)",
                "retry_after": self.second_windows.get_retry_after(f"{ip}:second")
            }
        
        allowed, count, remaining = self.minute_windows.is_allowed(f"{ip}:minute")
        if not allowed:
            self.block_ip(ip)
            return False, {
                "error": "Rate limit exceeded (too many requests per minute)",
                "retry_after": self.minute_windows.get_retry_after(f"{ip}:minute")
            }
        
        allowed, count, remaining = self.hour_windows.is_allowed(f"{ip}:hour")
        if not allowed:
            self.block_ip(ip)
            return False, {
                "error": "Rate limit exceeded (too many requests per hour)",
                "retry_after": self.hour_windows.get_retry_after(f"{ip}:hour")
            }
        
        # Check endpoint-specific limits
        if self._is_auth_endpoint(path):
            allowed, count, remaining = self.auth_windows.is_allowed(f"{ip}:auth")
            if not allowed:
                logger.warning(f"Auth rate limit exceeded for IP {ip}")
                return False, {
                    "error": "Too many authentication attempts",
                    "retry_after": self.auth_windows.get_retry_after(f"{ip}:auth")
                }
        elif method in ["POST", "PUT", "DELETE", "PATCH"]:
            allowed, count, remaining = self.write_windows.is_allowed(f"{ip}:write")
            if not allowed:
                return False, {
                    "error": "Rate limit exceeded for write operations",
                    "retry_after": self.write_windows.get_retry_after(f"{ip}:write")
                }
        else:  # GET, HEAD, OPTIONS
            allowed, count, remaining = self.read_windows.is_allowed(f"{ip}:read")
            if not allowed:
                return False, {
                    "error": "Rate limit exceeded for read operations",
                    "retry_after": self.read_windows.get_retry_after(f"{ip}:read")
                }
        
        # Return rate limit headers info
        return True, {
            "x-ratelimit-limit": self.config.GLOBAL_REQUESTS_PER_MINUTE,
            "x-ratelimit-remaining": remaining
        }


class SlowlorisProtector:
    """Protection against Slowloris attacks."""
    
    def __init__(self, timeout_seconds: int = 30):
        self.timeout_seconds = timeout_seconds
    
    async def check_request_timeout(self, request: Request):
        """Check if request is taking too long."""
        # This is handled by uvicorn's --timeout-keep-alive option
        # But we can add additional checks here
        pass


# Global rate limiter instance
rate_limiter = IPRateLimiter()
slowloris_protector = SlowlorisProtector()


async def rate_limit_middleware(request: Request, call_next):
    """FastAPI middleware for rate limiting."""
    
    # Check request size for methods with body
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > RateLimitConfig.MAX_REQUEST_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": f"Request body too large. Maximum size is {RateLimitConfig.MAX_REQUEST_SIZE // (1024 * 1024)} MB"
                }
            )
    
    # Check rate limit
    is_allowed, rate_limit_info = rate_limiter.check_rate_limit(request)
    
    if not is_allowed:
        retry_after = rate_limit_info.get("retry_after", 60)
        return JSONResponse(
            status_code=429,
            content={
                "detail": rate_limit_info.get("error", "Rate limit exceeded"),
                "retry_after": retry_after
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Reset": str(int(time.time()) + retry_after)
            }
        )
    
    # Process request
    response = await call_next(request)
    
    # Add rate limit headers
    if rate_limit_info:
        response.headers["X-RateLimit-Limit"] = str(rate_limit_info.get("x-ratelimit-limit", 0))
        response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.get("x-ratelimit-remaining", 0))
    
    return response


def get_rate_limiter() -> IPRateLimiter:
    """Get the global rate limiter instance."""
    return rate_limiter
