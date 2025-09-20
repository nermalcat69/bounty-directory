import Redis from "ioredis";

// Global Redis instance to prevent connection leaks
declare global {
  var __redis: Redis | undefined;
}

// Singleton Redis connection with connection pooling
function createRedisInstance(): Redis {
  return new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    // Connection pooling settings for free tier
    maxRetriesPerRequest: 2, // Reduced retries
    enableReadyCheck: true,
    lazyConnect: true, // Only connect when needed
    commandTimeout: 8000, // Reduced timeout
    enableOfflineQueue: true, // Allow queuing when disconnected
    
    // Connection pool settings optimized for free tier
    family: 4, // Use IPv4
    keepAlive: 30000, // Keep connections alive for 30s
    
    // Connection limits for free tier
    connectTimeout: 8000,
    
    // Disable auto pipelining to reduce connection overhead
    enableAutoPipelining: false,
  });
}

// Use global variable in development to prevent hot reload connection leaks
export const redis = globalThis.__redis ?? createRedisInstance();

// Store in global for development hot reloading
if (process.env.NODE_ENV === 'development') {
  globalThis.__redis = redis;
}

// Add connection event listeners for monitoring
redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('ready', () => {
  console.log('Redis ready for commands');
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  redis.disconnect();
});

process.on('SIGINT', () => {
  redis.disconnect();
});
