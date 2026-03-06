#!/bin/bash

# LivePair Frontend Deployment Script
# Can deploy to either Vercel or Cloud Run

set -e

DEPLOY_TARGET=${1:-vercel}
BACKEND_URL=${2:-}

if [ "$DEPLOY_TARGET" != "vercel" ] && [ "$DEPLOY_TARGET" != "cloud-run" ]; then
  echo "Usage: ./deploy-frontend.sh [vercel|cloud-run] <backend-url>"
  echo ""
  echo "Examples:"
  echo "  ./deploy-frontend.sh vercel wss://livepair-backend-xxx.run.app"
  echo "  ./deploy-frontend.sh cloud-run wss://livepair-backend-xxx.run.app"
  exit 1
fi

echo "[v0] Deploying LivePair frontend to $DEPLOY_TARGET"

if [ "$DEPLOY_TARGET" = "vercel" ]; then
  echo "[v0] Deploying to Vercel..."
  cd frontend
  
  # Build
  npm run build
  
  # Deploy with Vercel CLI
  # Note: Requires 'vercel' CLI to be installed: npm i -g vercel
  if command -v vercel &> /dev/null; then
    vercel --prod
    echo "[v0] Frontend deployed to Vercel"
    echo "[v0] Check your Vercel dashboard for the live URL"
  else
    echo "[v0] Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
  fi

elif [ "$DEPLOY_TARGET" = "cloud-run" ]; then
  echo "[v0] Building frontend Docker image..."
  
  cd frontend
  npm run build
  
  # Read project ID from gcloud config
  PROJECT_ID=$(gcloud config get-value project)
  REGION="us-central1"
  SERVICE_NAME="livepair-frontend"
  IMAGE_NAME="livepair-frontend"
  
  echo "[v0] Project: $PROJECT_ID"
  echo "[v0] Region: $REGION"
  
  # Build and push image
  gcloud builds submit --tag gcr.io/$PROJECT_ID/$IMAGE_NAME
  
  # Deploy to Cloud Run
  gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 256Mi \
    --cpu 1
  
  # Get service URL
  SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
  
  echo "[v0] Frontend deployed to Cloud Run"
  echo "[v0] URL: $SERVICE_URL"
fi

echo ""
echo "[v0] Deployment complete!"
