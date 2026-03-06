# LivePair Deployment Guide

This guide covers deploying LivePair to Google Cloud Run.

## Prerequisites

- Google Cloud project with billing enabled
- `gcloud` CLI installed and configured
- Docker installed (for local testing)
- Gemini API key (from Google AI Studio)

## Quick Start (5 minutes)

### 1. Set Up Environment

```bash
export PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your-gemini-api-key"
export REGION="us-central1"
```

### 2. Deploy Backend to Cloud Run

```bash
cd backend

# Build and push Docker image
gcloud builds submit \
  --project=$PROJECT_ID \
  --tag gcr.io/$PROJECT_ID/livepair-backend

# Deploy to Cloud Run
gcloud run deploy livepair-backend \
  --project=$PROJECT_ID \
  --image gcr.io/$PROJECT_ID/livepair-backend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=$GEMINI_API_KEY \
  --memory 512Mi \
  --cpu 1 \
  --timeout 600
```

The Cloud Run deployment will show you the service URL.

### 3. Update Frontend Configuration

Update the WebSocket URL in `frontend/src/lib/websocket-client.ts`:

```typescript
// Change from:
const url = 'ws://localhost:8080'

// To:
const url = 'wss://livepair-backend-xxx.run.app'
```

### 4. Deploy Frontend to Vercel

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or deploy to Cloud Run:

```bash
gcloud builds submit \
  --project=$PROJECT_ID \
  --tag gcr.io/$PROJECT_ID/livepair-frontend

gcloud run deploy livepair-frontend \
  --project=$PROJECT_ID \
  --image gcr.io/$PROJECT_ID/livepair-frontend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 256Mi
```

## Using Deploy Scripts

Use the provided scripts for automated deployment:

```bash
# Make scripts executable
chmod +x scripts/deploy-backend.sh
chmod +x scripts/deploy-frontend.sh

# Deploy backend
./scripts/deploy-backend.sh $PROJECT_ID $GEMINI_API_KEY

# Deploy frontend to Vercel
./scripts/deploy-frontend.sh vercel wss://livepair-backend-xxx.run.app

# Or deploy frontend to Cloud Run
./scripts/deploy-frontend.sh cloud-run wss://livepair-backend-xxx.run.app
```

## Local Testing with Docker Compose

Test locally before cloud deployment:

```bash
# Set environment variables
export GOOGLE_API_KEY="your-gemini-api-key"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# Start services
docker-compose up

# Access:
# Frontend: http://localhost:3000
# Backend: ws://localhost:8080
# Health: http://localhost:8080/health
```

## Configuration

### Backend Environment Variables

```env
# Required
GOOGLE_API_KEY=your-gemini-api-key
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Optional
PORT=8080
NODE_ENV=production
```

### Cloud Run Resource Allocation

**Backend:**
- Memory: 512 MB (sufficient for WebSocket + Gemini)
- CPU: 1 (adequate for agent processing)
- Timeout: 600s (10 minutes for long-running tasks)

**Frontend:**
- Memory: 256 MB (static files only)
- CPU: 1
- Timeout: 60s (standard for web requests)

## Monitoring

### View Logs

```bash
# Backend logs
gcloud run logs read livepair-backend --region $REGION --limit 50

# Frontend logs (if deployed to Cloud Run)
gcloud run logs read livepair-frontend --region $REGION --limit 50
```

### Check Service Health

```bash
# Backend health check
curl https://livepair-backend-xxx.run.app/health

# Should return:
# {"status":"ok","timestamp":"2024-03-06T..."}
```

### Monitor WebSocket Connections

View real-time logs:

```bash
gcloud run logs read livepair-backend --region $REGION --follow
```

Look for:
- `[v0] New WebSocket connection` - Client connected
- `[v0] Gemini Live connected` - Agent initialized
- `[v0] Tool executed` - MCP tool called
- `[v0] Patch applied` - Code modification completed

## Troubleshooting

### WebSocket Connection Fails

**Issue**: `WebSocket closed: Unable to connect`

**Solutions**:
1. Check backend is deployed: `curl https://livepair-backend-xxx.run.app/health`
2. Verify WebSocket URL in frontend: Should be `wss://` not `ws://`
3. Check CORS in backend: Should allow frontend domain
4. View backend logs: `gcloud run logs read livepair-backend`

### Gemini API Errors

**Issue**: `Gemini API key invalid` or `Authentication failed`

**Solutions**:
1. Verify API key: `echo $GEMINI_API_KEY`
2. Check API key is set in Cloud Run environment
3. Ensure Gemini API is enabled in Google Cloud
4. Generate new API key from Google AI Studio

### High Latency

**Issue**: Agent responses are slow (>2s)

**Solutions**:
1. Increase Cloud Run memory: `--memory 1Gi`
2. Check Gemini API latency: View logs for response times
3. Verify network latency: `curl -w "@curl-format.txt" https://livepair-backend-xxx.run.app/health`
4. Monitor Cloud Run metrics in Cloud Console

### Out of Memory

**Issue**: Cloud Run service keeps restarting

**Solutions**:
1. Increase memory allocation: `--memory 1Gi` (default 512Mi)
2. Check for memory leaks: View logs for error messages
3. Reduce max concurrent connections: Add rate limiting

## Security Considerations

### API Key Protection

- **Never** commit API keys to git
- Use Cloud Run environment variables (secrets)
- Or use Cloud Secret Manager:

```bash
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

gcloud run deploy livepair-backend \
  --update-secrets GOOGLE_API_KEY=gemini-api-key:latest
```

### CORS Configuration

Currently allows all origins. For production:

```typescript
// backend/src/server.ts
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### WebSocket Security

- Use `wss://` (secure WebSocket) in production
- Cloud Run handles TLS automatically
- Consider adding authentication tokens

## Cost Estimate

**Google Cloud Pricing (us-central1)**
- Cloud Run: ~$0.00001 per request, $0.00000625 per CPU-second
- Example: 1000 users × 10min sessions × 100 requests = ~$0.10/month
- First 2M requests/month are free
- First 180,000 CPU-seconds/month are free

Typical monthly cost: $0-5 (within free tier for most use cases)

## Production Checklist

- [ ] API keys stored in Cloud Secret Manager
- [ ] CORS configured for frontend domain
- [ ] Monitoring and alerting configured
- [ ] Error handling and recovery tested
- [ ] Load testing completed
- [ ] Logs monitored for errors
- [ ] Database backups configured (if applicable)
- [ ] Rate limiting implemented
- [ ] SSL/TLS enabled (automatic with Cloud Run)
- [ ] Emergency rollback plan documented

## Rollback

If deployment has issues:

```bash
# View previous revisions
gcloud run revisions list --service livepair-backend --region $REGION

# Rollback to previous revision
gcloud run deploy livepair-backend \
  --region $REGION \
  --no-traffic \
  --image gcr.io/$PROJECT_ID/livepair-backend:previous-tag

# Route traffic back
gcloud run traffic-split livepair-backend \
  --region $REGION \
  --to-revisions LATEST=0,<previous-revision>=100
```

## Need Help?

- Check Cloud Run documentation: https://cloud.google.com/run/docs
- Gemini API docs: https://ai.google.dev/gemini-api
- Cloud Run logs: `gcloud run logs read <service-name>`
