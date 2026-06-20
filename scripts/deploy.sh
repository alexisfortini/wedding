#!/bin/bash
# Exit on error
set -e

PROJECT_ID="wedding-497923"
REGION="us-central1"

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  echo "Loading variables from .env.local..."
  export $(grep -v '^#' .env.local | xargs)
fi

# Validate required environment variables are present
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ -z "$NEXT_PUBLIC_MAPBOX_TOKEN" ] || [ -z "$GEMINI_API_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing required environment variables. Please check your .env.local file or current shell session."
  exit 1
fi

echo "1. Setting Google Cloud active project to: $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "2. Enabling required Google Cloud APIs (Run, Artifact Registry, Build)..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudresourcemanager.googleapis.com

echo "3. Deploying Next.js website to Google Cloud Run..."
gcloud run deploy wedding-website \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-build-env-vars="NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN" \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN,GEMINI_API_KEY=$GEMINI_API_KEY,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"

echo "--------------------------------------------------------"
echo "Deployment successful!"
echo "--------------------------------------------------------"
