import Redis from "ioredis";

// Optimized Redis configuration for better performance
export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  commandTimeout: 15000, // Increased timeout for large payloads
  enableOfflineQueue: true
});

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
