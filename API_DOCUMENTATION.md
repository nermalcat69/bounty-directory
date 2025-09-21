# Bounty Directory API Documentation

This document provides comprehensive documentation for all API endpoints in the Bounty Directory application.

## Table of Contents

- [Authentication](#authentication)
- [Public Endpoints](#public-endpoints)
- [User Endpoints](#user-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Cron Jobs](#cron-jobs)
- [Webhook Endpoints](#webhook-endpoints)
- [Debug Endpoints](#debug-endpoints)
- [Cache Behavior](#cache-behavior)

## Authentication

The application uses Better Auth for authentication. Most user-specific endpoints require authentication via session cookies.

### Auth Endpoints

#### `POST/GET/PUT/DELETE /api/auth/[...all]`
- **Description**: Better Auth catch-all route for authentication
- **Methods**: All HTTP methods
- **Authentication**: None (handles authentication itself)
- **Purpose**: Handles login, logout, registration, and other auth operations

---

## Public Endpoints

### Bounties

#### `GET /api/bounties`
- **Description**: Fetch paginated bounty listings with filtering and sorting
- **Authentication**: None
- **Query Parameters**:
  - `page` (number, default: 1): Page number
  - `limit` (number, default: 20, max: 50): Items per page
  - `sort` (string, default: 'amount'): Sort field
  - `order` (string, default: 'desc'): Sort order (asc/desc)
  - `language` (string): Filter by programming language
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "total": { "count": 150, "amount": 25000 },
      "bounties": [...],
      "pagination": {
        "page": 1,
        "limit": 20,
        "hasMore": true,
        "totalPages": 8
      }
    },
    "cached": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

#### `POST /api/bounties/refresh`
- **Description**: Manual bounty data refresh (hard refresh - clears cache by default)
- **Authentication**: None (consider adding auth for production)
- **Body**:
  ```json
  {
    "force": false,
    "clearCache": true
  }
  ```
- **Cache Behavior**: **DESTRUCTIVE** - Clears all cache by default for hard refresh
- **Response**:
  ```json
  {
    "success": true,
    "message": "Bounty refresh completed",
    "result": {
      "action": "force_refresh",
      "bountyCount": 150,
      "totalAmount": 25000,
      "formattedTotal": "$25,000",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "cacheCleared": true
    }
  }
  ```

#### `GET /api/snapshots`
- **Description**: Get paginated bounty snapshots with advanced filtering
- **Authentication**: None
- **Query Parameters**:
  - `page` (number, default: 1): Page number
  - `per_page` (number, default: 20, max: 100): Items per page
  - `language` (string): Filter by programming language
  - `repo` (string): Filter by repository
  - `search` (string): Search in title and body
  - `sort` (string): Sort by 'recent', 'oldest', or 'comments'
- **Response**:
  ```json
  {
    "bounties": [...],
    "total_count": 150,
    "page": 1,
    "per_page": 20,
    "has_more": true,
    "cached": false,
    "cache_timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

#### `GET /api/antiwork-bounties`
- **Description**: Get bounties specifically from the antiwork organization
- **Authentication**: None
- **Cache**: 5 minutes
- **Response**:
  ```json
  {
    "issues": [...],
    "total": 25,
    "errors": []
  }
  ```

### Notifications

#### `POST /api/notifications`
- **Description**: Process notifications for bounty alerts
- **Authentication**: None
- **Body**:
  ```json
  {
    "action": "process_bounty",
    "bountyData": { ... }
  }
  ```

#### `GET/POST /api/notifications/process`
- **Description**: Process pending notifications and get stats
- **Authentication**: None (consider adding auth)
- **GET Response**:
  ```json
  {
    "success": true,
    "stats": { ... },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### Revalidation

#### `POST /api/revalidate`
- **Description**: On-demand revalidation of ISR pages
- **Authentication**: Requires `REVALIDATION_SECRET`
- **Body**:
  ```json
  {
    "secret": "your-secret",
    "tags": ["bounties", "homepage"],
    "paths": ["/", "/bounties"]
  }
  ```

#### `GET /api/revalidate`
- **Description**: Get revalidation status and available tags
- **Authentication**: None

---

## User Endpoints

### Alerts

#### `GET /api/alerts`
- **Description**: Fetch user's bounty alerts
- **Authentication**: Required
- **Response**:
  ```json
  {
    "alerts": [
      {
        "id": "alert-id",
        "repo": "owner/repo",
        "query": "search terms",
        "delivery_method": "discord",
        "destination": "webhook-url",
        "active": true,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/alerts`
- **Description**: Create a new bounty alert
- **Authentication**: Required
- **Body**:
  ```json
  {
    "repo": "owner/repo",
    "query": "search terms",
    "delivery_method": "discord",
    "destination": "webhook-url"
  }
  ```

#### `PATCH /api/alerts`
- **Description**: Update an existing alert
- **Authentication**: Required
- **Body**:
  ```json
  {
    "id": "alert-id",
    "repo": "owner/repo",
    "active": false
  }
  ```

#### `DELETE /api/alerts?id=alert-id`
- **Description**: Delete an alert
- **Authentication**: Required
- **Query Parameters**:
  - `id` (string, required): Alert ID to delete

### Subscriptions

#### `GET /api/subscriptions`
- **Description**: Get user's subscription status
- **Authentication**: Required
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "isSubscribed": true,
      "plan": "premium",
      "expiresAt": "2024-12-31T23:59:59.000Z"
    }
  }
  ```

#### `POST /api/subscriptions`
- **Description**: Create subscription checkout session
- **Authentication**: Required
- **Body**:
  ```json
  {
    "action": "create_checkout"
  }
  ```

---

## Admin Endpoints

### Bounty Management

#### `POST /api/admin/fetch-bounties-direct`
- **Description**: Direct bounty fetch for admin use
- **Authentication**: Consider adding admin auth
- **Purpose**: Manual bounty data fetching with admin privileges

#### `POST /api/admin/cleanup-spam`
- **Description**: Clean up spam issues from known spam users
- **Authentication**: Consider adding admin auth
- **Response**:
  ```json
  {
    "success": true,
    "message": "Successfully removed 5 spam issues",
    "deletedIssues": [
      { "id": "123", "user": "spam-user" }
    ]
  }
  ```

#### `POST /api/admin/trigger-worker`
- **Description**: Manually trigger the bounty worker
- **Authentication**: Consider adding admin auth

---

## Cron Jobs

All cron jobs are configured in `vercel.json` and run automatically.

### Cache Behavior for Cron Jobs
**ADDITIVE CACHING**: All cron jobs preserve existing cache entries and only add/update new data. They do NOT remove older entries.

#### `GET /api/cron/30min-bounty-update`
- **Schedule**: Every 30 minutes (`*/30 * * * *`)
- **Description**: Incremental bounty updates focusing on recent activity
- **Cache Behavior**: **ADDITIVE** - Merges new data with existing cache
- **Features**:
  - Focuses on 7-day window for recent updates
  - Limited to 5 pages per query for efficiency
  - Merges with existing cached data
  - Updates existing bounties, adds new ones
- **Response**:
  ```json
  {
    "success": true,
    "message": "30-minute bounty update completed successfully",
    "result": {
      "newOrUpdated": 25,
      "totalBounties": 150,
      "totalAmount": 25000,
      "formattedTotal": "$25,000",
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### `GET /api/cron/daily-bounty-update`
- **Schedule**: Daily at 6 AM (`0 6 * * *`)
- **Description**: Comprehensive daily bounty data refresh
- **Cache Behavior**: **ADDITIVE** - Comprehensive update while preserving existing data
- **Features**:
  - More comprehensive search (10 pages for main queries)
  - Multiple search strategies (bounty labels, dollar signs, keywords)
  - Includes antiwork, gitcoin, hackathon bounties

#### `GET /api/cron/daily-total-update`
- **Schedule**: Daily at 7 AM (`0 7 * * *`)
- **Description**: Update total bounty amounts
- **Cache Behavior**: **ADDITIVE** - Updates totals based on all cached data

#### `GET /api/cron/hourly-total-update`
- **Schedule**: Every hour (implied from filename)
- **Description**: Hourly total rewards calculation
- **Cache Behavior**: **ADDITIVE** - Lightweight total calculations
- **Features**:
  - 365-day comprehensive data window
  - Independent of other cron jobs
  - Focuses on total amount calculations

---

## Webhook Endpoints

#### `POST /api/webhooks/github`
- **Description**: GitHub webhook handler for real-time bounty updates
- **Authentication**: GitHub webhook signature verification
- **Headers**:
  - `X-GitHub-Event`: Event type (issues, etc.)
  - `X-Hub-Signature-256`: GitHub signature
- **Events Handled**:
  - `issues.opened`: Adds new bounty to cache
  - `issues.closed`: Removes bounty from cache
  - `issues.edited`: Updates bounty in cache
- **Cache Behavior**: **SELECTIVE** - Updates specific entries without full refresh

#### `POST /api/webhook/polar`
- **Description**: Polar webhook handler for subscription events
- **Authentication**: Polar webhook signature verification

---

## Debug Endpoints

#### `GET /api/debug/bounties`
- **Description**: Debug information about cached bounty data
- **Authentication**: None (consider adding auth for production)
- **Response**:
  ```json
  {
    "bountyCount": 150,
    "sampleBounties": [...],
    "labelAnalysis": [...],
    "totalBountyResult": { ... },
    "cacheStatus": "healthy"
  }
  ```

---

## Cache Behavior

### Cache Types

1. **Redis Cache Keys**:
   - `snapshots:latest`: Main bounty data cache
   - `snapshots:top100`: Top 100 bounties cache
   - `bounty:total`: Total bounty amount cache
   - `bounties:latest`: Latest bounties cache

2. **Next.js ISR Cache**:
   - Tagged with: `bounties`, `homepage`, `total-bounty-amount`, etc.
   - Revalidated automatically and on-demand

### Cache Strategies

#### Hard Refresh (Destructive)
- **Endpoint**: `POST /api/bounties/refresh`
- **Behavior**: Clears ALL cache by default
- **Use Case**: When you need completely fresh data
- **Default**: `clearCache: true`

#### Additive Caching (Preservative)
- **Endpoints**: All cron jobs (`/api/cron/*`)
- **Behavior**: Preserves existing entries, adds/updates new ones
- **Use Case**: Regular updates without losing historical data
- **Benefits**: Maintains data continuity, faster updates

#### Selective Updates
- **Endpoints**: Webhook handlers (`/api/webhooks/*`)
- **Behavior**: Updates specific entries based on events
- **Use Case**: Real-time updates from GitHub events

### Cache TTL (Time To Live)

- **Snapshots**: 30 minutes (1800 seconds)
- **API responses**: 5-10 minutes with stale-while-revalidate
- **Debug data**: 5 minutes
- **ISR pages**: Varies by page type

### Rate Limiting Considerations

- GitHub API rate limits are monitored
- Cron jobs stop when rate limit is low (< 10 requests remaining)
- Incremental updates reduce API usage

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

---

## Environment Variables

Required environment variables:
- `GITHUB_TOKEN`: GitHub API access
- `REVALIDATION_SECRET`: For revalidation endpoint
- `CRON_SECRET`: For cron job authentication
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `BETTER_AUTH_SECRET`: Authentication secret

---

## Monitoring and Observability

- All endpoints log operations and errors
- Rate limit monitoring for GitHub API
- Cache hit/miss tracking
- Performance metrics for large operations
- Spam filtering with logging

---

## Best Practices

1. **Use appropriate cache strategy**:
   - Hard refresh for complete data reset
   - Additive caching for regular updates
   - Selective updates for real-time changes

2. **Monitor rate limits**: GitHub API has strict limits

3. **Handle errors gracefully**: All endpoints include error handling

4. **Use pagination**: Large datasets are paginated for performance

5. **Leverage caching**: Multiple cache layers for optimal performance

6. **Security**: Add authentication to admin endpoints in production