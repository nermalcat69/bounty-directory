# GitHub Webhook Setup Guide

This guide explains how to set up GitHub webhooks to automatically detect issue state changes and update the Redis cache in real-time.

## Overview

The bounty directory uses GitHub webhooks to:
- Detect when bounty issues are opened, closed, or updated
- Automatically update Redis cache without waiting for cron jobs
- Invalidate stale cache data when issues are closed
- Keep the hero section total rewards up-to-date

## Prerequisites

1. GitHub repository with admin access
2. Deployed application with webhook endpoint
3. Redis instance configured
4. Environment variables set up

## Environment Variables

Add these environment variables to your deployment:

```bash
# Required for webhook verification
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Required for GitHub API access
GITHUB_TOKEN=your_github_token_here

# Redis configuration (if not already set)
REDIS_URL=your_redis_url_here
```

## GitHub Webhook Configuration

### 1. Create Webhook Secret

Generate a secure random string for webhook verification:

```bash
# Generate a secure secret
openssl rand -hex 32
```

Save this as your `GITHUB_WEBHOOK_SECRET` environment variable.

### 2. Configure Repository Webhook

For each repository you want to monitor:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks**
3. Click **Add webhook**
4. Configure the webhook:

   - **Payload URL**: `https://your-domain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Use the secret you generated above
   - **Which events would you like to trigger this webhook?**: Select "Let me select individual events"
   - **Events to select**:
     - ✅ Issues
     - ✅ Issue comments
     - ✅ Pull requests
   - **Active**: ✅ Checked

5. Click **Add webhook**

### 3. Organization-Level Webhook (Optional)

For monitoring multiple repositories in an organization:

1. Go to your GitHub organization
2. Navigate to **Settings** → **Webhooks**
3. Follow the same configuration as above
4. This will monitor all repositories in the organization

## Webhook Events Handled

The webhook endpoint (`/api/webhooks/github`) handles these events:

### Issues Events
- `opened` - New bounty issue created
- `edited` - Issue title/body updated
- `labeled` - Labels added (bounty amount changes)
- `unlabeled` - Labels removed
- `closed` - Issue closed (removes from cache)
- `reopened` - Issue reopened (adds back to cache)

### Issue Comments Events
- `created` - New comment added (updates comment count)

### Pull Request Events
- `opened` - New PR created (for notification system)

## Cache Update Behavior

### When Issues are Closed
- Removes issue from `bounties:latest` cache
- Invalidates `snapshots:latest` and `snapshots:top100`
- Invalidates `bounty:total` for recalculation
- Revalidates homepage and bounties page

### When Issues are Updated
- Updates issue data in `bounties:latest` cache
- Invalidates `bounty:total` for recalculation
- Revalidates homepage

### When Issues are Opened
- Adds new issue to `bounties:latest` cache
- Triggers notification system
- Revalidates homepage

## Fallback Systems

Even with webhooks configured, the system has fallback mechanisms:

1. **30-Minute Cron Job** (`/api/cron/30min-bounty-update`)
   - Incremental bounty updates every 30 minutes
   - Merges new data with existing cache
   - Focuses on recent activity (7-day window)
   - Ensures fresh bounty data even if webhooks fail

2. **Hourly Cron Job** (`/api/cron/hourly-total-update`)
   - Updates total rewards every hour
   - Runs independently of webhooks
   - Lightweight total amount calculations

## Testing the Webhook

### 1. Check Webhook Delivery

1. Go to your repository's webhook settings
2. Click on your webhook
3. Check the **Recent Deliveries** tab
4. Verify successful deliveries (200 status codes)

### 2. Test with Issue Actions

1. Create a test issue with bounty labels
2. Check application logs for webhook processing
3. Verify cache updates in Redis
4. Test closing/reopening the issue

### 3. Manual Webhook Testing

You can manually trigger cache updates:

```bash
# Test the webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issues" \
  -d '{"action": "opened", "issue": {...}}'
```

## Monitoring and Debugging

### Application Logs

Monitor these log messages:

```
Received GitHub webhook: issues
Bounty issue opened: https://github.com/...
Redis cache updated successfully: [...]
```

### Redis Cache Keys

Monitor these Redis keys:

- `bounties:latest` - Latest bounty issues
- `bounty:total` - Total bounty amount
- `snapshots:latest` - Full bounty snapshots
- `snapshots:top100` - Top 100 bounties

### Health Check

Create a simple health check endpoint:

```bash
# Check if webhook endpoint is accessible
curl https://your-domain.com/api/webhooks/github
```

## Security Considerations

1. **Always verify webhook signatures** - The endpoint validates GitHub signatures
2. **Use HTTPS** - Never expose webhook endpoints over HTTP
3. **Rotate secrets regularly** - Update webhook secrets periodically
4. **Monitor for abuse** - Watch for unusual webhook traffic
5. **Rate limiting** - Consider implementing rate limiting for webhook endpoints

## Troubleshooting

### Common Issues

1. **Webhook not triggering**
   - Check webhook URL is accessible
   - Verify SSL certificate is valid
   - Check GitHub webhook delivery logs

2. **Signature verification failing**
   - Ensure `GITHUB_WEBHOOK_SECRET` matches webhook configuration
   - Check for trailing whitespace in environment variables

3. **Cache not updating**
   - Verify Redis connection
   - Check application logs for errors
   - Ensure bounty detection logic is working

4. **Performance issues**
   - Monitor webhook response times
   - Consider async processing for heavy operations
   - Implement proper error handling

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

This will provide more detailed logs for troubleshooting.

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Webhook secret generated and set
- [ ] GitHub webhooks configured for all relevant repositories
- [ ] SSL certificate valid and accessible
- [ ] Redis connection working
- [ ] Cron jobs scheduled as fallback
- [ ] Monitoring and alerting set up
- [ ] Test webhook with sample issue events

## Support

If you encounter issues:

1. Check the application logs
2. Verify webhook delivery in GitHub
3. Test Redis connectivity
4. Review environment variable configuration
5. Check the fallback cron jobs are running