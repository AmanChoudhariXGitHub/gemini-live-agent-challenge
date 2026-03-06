#!/bin/bash

# LivePair Backend Cloud Run Deployment Script
# Usage: ./deploy-backend.sh <project-id> <gemini-api-key>

set -e

PROJECT_ID=${1:-}
GEMINI_API_KEY=${2:-}
REGION="us-central1"
SERVICE_NAME="livepair-backend"
IMAGE_NAME="livepair-backend"

if [ -z "$PROJECT_ID" ] || [ -z "$GEMINI_API_KEY" ]; then
  echo "Usage: ./deploy-backend.sh <project-id> <gemini-api-key>"
  exit 1
fi

echo "[v0] Deploying LivePair backend to Cloud Run"
echo "[v0] Project: $PROJECT_ID"
echo "[v0] Region: $REGION"
echo "[v0] Service: $SERVICE_NAME"

# Set Google Cloud project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "[v0] Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable container.googleapis.com

# Build Docker image
echo "[v0] Building Docker image..."
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/$IMAGE_NAME

# Deploy to Cloud Run
echo "[v0] Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=$GEMINI_API_KEY \
  --memory 512Mi \
  --cpu 1 \
  --timeout 600

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo ""
echo "[v0] Deployment complete!"
echo "[v0] Service URL: $SERVICE_URL"
echo "[v0] WebSocket URL: ${SERVICE_URL/https:/wss:}"
echo ""
echo "[v0] Next steps:"
echo "    1. Update frontend WebSocket URL to: ${SERVICE_URL/https:/wss:}"
echo "    2. Deploy frontend to Vercel or Cloud Run"
echo "    3. Test at: $SERVICE_URL/health"
