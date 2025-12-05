const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');
const logger = require('../utils/logger');

// Create Redis client
// Create Redis client
const redisUrl = process.env.REDIS_URL;
const clientOptions = redisUrl 
  ? { url: redisUrl } 
  : {
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined
    };

const redisClient = createClient(clientOptions);

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect().catch(console.error);

// Helper to create store
const createStore = (prefix) => new RedisStore({
  sendCommand: (...args) => redisClient.sendCommand(args),
  prefix: `rl:${prefix}:`
});

// Global rate limiter
const globalLimiter = rateLimit({
  // store: createStore('global'), // Use MemoryStore (default) to save Redis commands
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  store: createStore('auth'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only limit failed attempts
  message: { message: 'Too many login attempts, please try again later.' }
});

// Score submission limiter
const scoreLimiter = rateLimit({
  store: createStore('score'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many score submissions, please slow down.' }
});

// Profile update limiter
const profileLimiter = rateLimit({
  store: createStore('profile'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many profile updates, please try again later.' }
});

// Image extraction limiter (900/month)
const imageExtractionLimiter = rateLimit({
  store: createStore('image_extraction'),
  windowMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  max: 900,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => 'global_image_extraction', // Global limit for all users
  message: { message: 'Monthly image extraction limit reached.' }
});

module.exports = { globalLimiter, authLimiter, scoreLimiter, profileLimiter, imageExtractionLimiter, redisClient };
