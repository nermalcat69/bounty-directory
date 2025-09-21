import "server-only";
import { createClient } from "redis";

// Create Redis client with connection pooling and retry logic
const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis connection failed after 10 retries");
        return new Error("Redis connection failed");
      }
      return Math.min(retries * 50, 1000);
    },
    connectTimeout: 10000,
  },
  // Enable command timeout
  commandsQueueMaxLength: 1000,
});

// Handle Redis connection events
redis.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redis.on("connect", () => {
  console.log("Redis Client Connected");
});

redis.on("ready", () => {
  console.log("Redis Client Ready");
});

redis.on("end", () => {
  console.log("Redis Client Disconnected");
});

// Connect to Redis
let isConnecting = false;
let isConnected = false;

async function ensureConnection() {
  if (isConnected) return;
  if (isConnecting) {
    // Wait for existing connection attempt
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  isConnecting = true;
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    isConnected = true;
    console.log("Redis connection established");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    throw error;
  } finally {
    isConnecting = false;
  }
}

// Wrapper to ensure connection before operations
const redisWithConnection = {
  async get(key: string) {
    await ensureConnection();
    return redis.get(key);
  },

  async set(key: string, value: string, options?: any) {
    await ensureConnection();
    return redis.set(key, value, options);
  },

  async setex(key: string, seconds: number, value: string) {
    await ensureConnection();
    return redis.setEx(key, seconds, value);
  },

  async del(...keys: string[]) {
    await ensureConnection();
    return redis.del(keys);
  },

  async setnx(key: string, value: string) {
    await ensureConnection();
    return redis.setNX(key, value);
  },

  async sadd(key: string, ...members: string[]) {
    await ensureConnection();
    return redis.sAdd(key, members);
  },

  async sismember(key: string, member: string) {
    await ensureConnection();
    return redis.sIsMember(key, member);
  },

  async incr(key: string) {
    await ensureConnection();
    return redis.incr(key);
  },

  async decr(key: string) {
    await ensureConnection();
    return redis.decr(key);
  },

  async ping() {
    await ensureConnection();
    return redis.ping();
  },

  async info(section?: string) {
    await ensureConnection();
    return redis.info(section);
  },

  async quit() {
    if (redis.isOpen) {
      await redis.quit();
    }
    isConnected = false;
  },

  // Graceful shutdown
  async disconnect() {
    if (redis.isOpen) {
      await redis.disconnect();
    }
    isConnected = false;
  }
};

// Handle process termination
process.on("SIGINT", async () => {
  console.log("Closing Redis connection...");
  await redisWithConnection.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Closing Redis connection...");
  await redisWithConnection.quit();
  process.exit(0);
});

export { redisWithConnection as redis };