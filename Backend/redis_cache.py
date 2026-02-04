import redis
import json
import os
import functools
from datetime import timedelta
from flask import request, jsonify
from logging_config import logger

# Redis configuration from environment
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    # Test connection
    redis_client.ping()
    logger.info(f"Connected to Redis at {REDIS_URL}")
except Exception as e:
    if "localhost" in REDIS_URL or "127.0.0.1" in REDIS_URL:
        logger.warning(f"Redis not available locally ({str(e)}). Caching disabled.")
    else:
        logger.error(f"Failed to connect to Redis: {str(e)}")
    redis_client = None

def cache_response(timeout=300, key_prefix="api_cache"):
    """
    Decorator to cache JSON responses.
    Timeout in seconds (default 5 minutes).
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            if redis_client is None:
                return f(*args, **kwargs)

            # Generate cache key based on path and query parameters
            # For student-specific stats, the student_id in kwargs will make the key unique
            cache_key = f"{key_prefix}:{request.path}"
            if kwargs:
                # Sort kwargs to ensure consistent keys
                kwargs_str = ":".join([f"{k}={v}" for k, v in sorted(kwargs.items())])
                cache_key += f":{kwargs_str}"
            
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    logger.info(f"Cache hit for key: {cache_key}")
                    return jsonify(json.loads(cached_data))
                
                logger.info(f"Cache miss for key: {cache_key}")
                response = f(*args, **kwargs)
                
                # Only cache successful responses (200 OK)
                if isinstance(response, tuple):
                    res_obj, status_code = response
                else:
                    res_obj = response
                    status_code = 200

                if status_code == 200:
                    # Get JSON data from response object
                    data = res_obj.get_json()
                    redis_client.setex(cache_key, timeout, json.dumps(data))
                
                return response
            except Exception as e:
                logger.error(f"Redis cache error: {str(e)}")
                return f(*args, **kwargs)
        return decorated_function
    return decorator

def invalidate_cache(key_pattern=None):
    """
    Invalidate cache keys matching a certain pattern.
    Useful when attendance is marked, to refresh stats.
    """
    if redis_client is None:
        return
    
    try:
        if key_pattern:
            keys = redis_client.keys(f"api_cache:{key_pattern}*")
            if keys:
                redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} keys with pattern: {key_pattern}")
        else:
            # Clear all API cache
            keys = redis_client.keys("api_cache:*")
            if keys:
                redis_client.delete(*keys)
                logger.info(f"Invalidated all {len(keys)} API cache keys")
    except Exception as e:
        logger.error(f"Redis invalidation error: {str(e)}")
