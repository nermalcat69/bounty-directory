#!/usr/bin/env node

/**
 * Post-build script that triggers a hard refresh to clear all cache
 * This ensures every build starts with fresh cache
 */

const https = require('https');
const http = require('http');

async function triggerHardRefresh() {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const url = `${baseUrl}/api/bounties/refresh`;
  
  console.log('🔄 Triggering hard refresh after build...');
  console.log(`📍 Target URL: ${url}`);
  
  const postData = JSON.stringify({
    clearCache: true,  // Hard refresh - clear all cache
    force: true        // Force refresh even if data exists
  });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Post-Build-Script/1.0'
    }
  };
  
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Hard refresh completed successfully');
          console.log(`📊 Response: ${res.statusCode} ${res.statusMessage}`);
          try {
            const response = JSON.parse(data);
            if (response.message) {
              console.log(`💬 Message: ${response.message}`);
            }
            if (response.totalBounties) {
              console.log(`🎯 Total bounties refreshed: ${response.totalBounties}`);
            }
          } catch (e) {
            // Response might not be JSON, that's ok
          }
          resolve(data);
        } else {
          console.error(`❌ Hard refresh failed: ${res.statusCode} ${res.statusMessage}`);
          console.error(`📄 Response: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Network error during hard refresh:', err.message);
      // Don't fail the build for network errors - cache will be refreshed on first request
      console.log('⚠️  Build will continue, cache will be refreshed on first request');
      resolve('Network error - continuing build');
    });
    
    req.on('timeout', () => {
      console.error('❌ Timeout during hard refresh');
      console.log('⚠️  Build will continue, cache will be refreshed on first request');
      req.destroy();
      resolve('Timeout - continuing build');
    });
    
    // Set timeout to 30 seconds
    req.setTimeout(30000);
    
    req.write(postData);
    req.end();
  });
}

// Only run if this script is executed directly (not imported)
if (require.main === module) {
  triggerHardRefresh()
    .then(() => {
      console.log('🎉 Post-build refresh completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Post-build refresh failed:', err.message);
      // Don't fail the build - cache will be refreshed on first request
      console.log('⚠️  Build completed successfully, cache will be refreshed on first request');
      process.exit(0);
    });
}

module.exports = { triggerHardRefresh };