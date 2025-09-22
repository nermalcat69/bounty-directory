# Build & Cache Strategy

This document outlines the cache management strategy for the bounty directory application.

## Overview

The application uses a **dual cache strategy**:

1. **Hard Refresh on Build** (Destructive)
2. **Additive Cron Jobs** (Preserves existing data)

## 🔄 Manual Cache Refresh

### When it happens:
- **Manual trigger only** via `npm run cache:clear` or `pnpm cache:clear`
- No longer automatically triggered on build

### What it does:
- Clears **ALL** existing cache
- Forces fresh data fetch from GitHub API
- Ensures clean state when manually requested

### Implementation:
- **Script**: `scripts/post-build-refresh.js`
- **Endpoint**: `POST /api/bounties/refresh` with `clearCache: true`
- **Triggered by**: Manual execution of `cache:clear` script

### Usage:
```bash
# Clear cache manually when needed
npm run cache:clear
# or
pnpm cache:clear
```

### Cache keys cleared:
- `snapshots:latest`
- `snapshots:top100` 
- `bounty:total`
- `bounties:latest`

## ⏰ Additive Cron Jobs

### Purpose:
Keep cache fresh with **incremental updates** without losing historical data.

### Cron Schedule:

| Job | Frequency | Time | Purpose |
|-----|-----------|------|---------|
| 30min-bounty-update | Every 30 minutes | `*/30 * * * *` | Recent bounty updates (last 7 days) |
| hourly-total-update | Every hour | `0 * * * *` | Total amount recalculation |
| daily-bounty-update | Daily | `0 2 * * *` | Comprehensive bounty scan |
| daily-total-update | Daily | `0 3 * * *` | Language/repo totals |

### Additive Behavior:
- **Preserves** all existing cache entries
- **Updates** existing bounties with new data
- **Adds** newly discovered bounties
- **Never removes** older entries unless being updated

### Implementation Details:

#### 30-Minute Updates
- Searches for bounties updated in last 7 days
- Merges with existing cache using `Map` for deduplication
- Limited to 5 pages per query for efficiency
- TTL: 30 minutes (1800 seconds)

#### Daily Updates  
- Comprehensive search across multiple query types
- Merges with existing data additively
- Up to 10 pages for thorough coverage
- TTL: 24 hours (86400 seconds)

## 🏗️ Build Process

```bash
# Standard build
npm run build

# What happens:
1. next build          # Build the application
2. npm run post-build  # Trigger hard refresh
3. POST /api/bounties/refresh { clearCache: true, force: true }
```

## 🚀 Deployment Strategy

### On Zerops:
1. **Build phase**: Runs `pnpm build` → triggers hard refresh
2. **Runtime**: Cron jobs maintain fresh cache additively
3. **Zero downtime**: Cache is rebuilt immediately after deployment

### Environment Variables:
- `VERCEL_URL` or `NEXT_PUBLIC_APP_URL`: Used by post-build script
- `GITHUB_TOKEN`: Required for API access
- `CRON_SECRET`: Optional security for cron endpoints

## 🔍 Monitoring

### Build Logs:
```
🔄 Triggering hard refresh after build...
📍 Target URL: https://your-app.com/api/bounties/refresh
✅ Hard refresh completed successfully
🎯 Total bounties refreshed: 1,234
```

### Cron Logs:
```
Starting 30-minute bounty update...
Found 45 existing cached bounties for additive update
Completed bounty labels: found 12 total issues
30-minute bounty update complete: 12 new/updated bounties
```

## 🛠️ Manual Operations

### Force Hard Refresh:
```bash
curl -X POST https://your-app.com/api/bounties/refresh \
  -H "Content-Type: application/json" \
  -d '{"clearCache": true, "force": true}'
```

### Manual Cron Trigger:
```bash
# 30-minute update
curl -X GET https://your-app.com/api/cron/30min-bounty-update

# Daily update  
curl -X GET https://your-app.com/api/cron/daily-bounty-update
```

## 📊 Cache Keys

| Key | Purpose | TTL | Updated By |
|-----|---------|-----|------------|
| `snapshots:latest` | All bounties | 30min/24h | Cron jobs |
| `snapshots:top100` | Top 100 bounties | 30min/24h | Cron jobs |
| `bounty:total` | Total amount | 30min/24h | Cron jobs |
| `bounty:total:language:*` | Per-language totals | 24h | Daily cron |
| `bounty:total:repo:*` | Per-repo totals | 24h | Daily cron |

## 🎯 Benefits

1. **Fresh deployments**: Every build starts with clean cache
2. **Continuous updates**: Cron jobs keep data current
3. **Performance**: Additive updates are faster than full rebuilds
4. **Reliability**: Fallback to API if cache fails
5. **Scalability**: Efficient use of GitHub API rate limits