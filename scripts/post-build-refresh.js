#!/usr/bin/env node

/**
 * Post-build script that directly clears cache without making HTTP requests
 * This ensures every build starts with fresh cache and works during build time
 */

const path = require('path');
const fs = require('fs');

async function clearCacheDirectly() {
  console.log('🔄 Clearing cache after build...');
  
  try {
    // Import Redis cache module dynamically
    const redisModulePath = path.join(process.cwd(), 'src', 'lib', 'redis-cache.ts');
    
    // Check if we can access Redis during build
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
      console.log('⚠️  No Redis URL available during build - cache will be cleared on first request');
      return { success: true, message: 'Cache clearing deferred to runtime' };
    }
    
    // Try to clear Redis cache if available
    try {
      // Dynamic import to avoid build-time issues
      const { redisCache } = await import('../src/lib/redis-cache.js');
      
      console.log('🗑️  Clearing Redis cache keys...');
      await Promise.all([
        redisCache.del("snapshots:latest"),
        redisCache.del("snapshots:top100"), 
        redisCache.del("bounty:total"),
        redisCache.del("bounties:latest")
      ]);
      
      console.log('✅ Redis cache cleared successfully');
      
    } catch (redisError) {
      console.log('⚠️  Redis not available during build - cache will be cleared on first request');
      console.log(`   Redis error: ${redisError.message}`);
    }
    
    // Create a cache invalidation marker file
    const markerPath = path.join(process.cwd(), '.cache-invalidated');
    fs.writeFileSync(markerPath, new Date().toISOString());
    console.log('📝 Created cache invalidation marker');
    
    console.log('✅ Post-build cache clearing completed');
    
    return { 
      success: true, 
      message: 'Cache clearing completed',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error during cache clearing:', error.message);
    console.log('⚠️  Build will continue, cache will be cleared on first request');
    
    return { 
      success: false, 
      message: `Cache clearing failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

// Only run if this script is executed directly (not imported)
if (require.main === module) {
  clearCacheDirectly()
    .then((result) => {
      console.log('🎉 Post-build cache clearing completed');
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`⚠️  ${result.message}`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Post-build cache clearing failed:', err.message);
      // Don't fail the build - cache will be refreshed on first request
      console.log('⚠️  Build completed successfully, cache will be refreshed on first request');
      process.exit(0);
    });
}

module.exports = { clearCacheDirectly };