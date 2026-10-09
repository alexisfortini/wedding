# PowerShell deployment script for Alexis & Kelsey's Wedding Website on Google Cloud Run
$ErrorActionPreference = "Stop"

$ProjectId = "wedding-497923"
$Region = "us-central1"
$ServiceName = "wedding-website"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Wedding Website Cloud Run Deployment (PowerShell)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure PATH includes gcloud and nodejs if installed in default locations
$LocalPrograms = "$env:LOCALAPPDATA\Programs"
$GcloudBin = "$LocalPrograms\google-cloud-sdk\bin"
$NodejsBin = "$LocalPrograms\nodejs"

if (Test-Path $GcloudBin) {
    if ($env:PATH -notlike "*$GcloudBin*") {
        $env:PATH = "$GcloudBin;$env:PATH"
    }
}
if (Test-Path $NodejsBin) {
    if ($env:PATH -notlike "*$NodejsBin*") {
        $env:PATH = "$NodejsBin;$env:PATH"
    }
}

# Verify gcloud is installed and available
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI not found in PATH. Please install Google Cloud SDK or run 'gcloud' in your environment."
    exit 1
}

# Load environment variables from .env.local if present
$EnvFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $EnvFile) {
    Write-Host "Loading environment variables from .env.local..." -ForegroundColor Yellow
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $varName = $parts[0].Trim()
            $varVal = $parts[1].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($varName, $varVal, "Process")
        }
    }
}

# Validate required variables
$RequiredVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_MAPBOX_TOKEN",
    "GEMINI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
)

$MissingVars = @()
foreach ($var in $RequiredVars) {
    $val = [System.Environment]::GetEnvironmentVariable($var, "Process")
    if (-not $val) {
        $MissingVars += $var
    }
}

if ($MissingVars.Count -gt 0) {
    Write-Warning "The following environment variables are not set in .env.local or process:"
    foreach ($m in $MissingVars) {
        Write-Host "  - $m" -ForegroundColor Red
    }
    Write-Host "`nPlease update your .env.local file with these values before deploying to Cloud Run." -ForegroundColor Yellow
    exit 1
}

$ExportSecret = [System.Environment]::GetEnvironmentVariable("EXPORT_SECRET_KEY", "Process")
if (-not $ExportSecret) {
    $ExportSecret = "ap_sec_63b2120c11dccdc10159ae284379b01d"
}

Write-Host "1. Setting Google Cloud active project to: $ProjectId..." -ForegroundColor Green
& gcloud config set project $ProjectId

Write-Host "2. Enabling required Google Cloud APIs (Run, Artifact Registry, Build)..." -ForegroundColor Green
& gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com cloudresourcemanager.googleapis.com

$BuildEnvVars = "NEXT_PUBLIC_SUPABASE_URL=$($env:NEXT_PUBLIC_SUPABASE_URL),NEXT_PUBLIC_SUPABASE_ANON_KEY=$($env:NEXT_PUBLIC_SUPABASE_ANON_KEY),NEXT_PUBLIC_MAPBOX_TOKEN=$($env:NEXT_PUBLIC_MAPBOX_TOKEN)"
$RunEnvVars = "NEXT_PUBLIC_SUPABASE_URL=$($env:NEXT_PUBLIC_SUPABASE_URL),NEXT_PUBLIC_SUPABASE_ANON_KEY=$($env:NEXT_PUBLIC_SUPABASE_ANON_KEY),NEXT_PUBLIC_MAPBOX_TOKEN=$($env:NEXT_PUBLIC_MAPBOX_TOKEN),GEMINI_API_KEY=$($env:GEMINI_API_KEY),SUPABASE_SERVICE_ROLE_KEY=$($env:SUPABASE_SERVICE_ROLE_KEY),EXPORT_SECRET_KEY=$ExportSecret"

Write-Host "3. Deploying Next.js website to Google Cloud Run ($ServiceName in $Region)..." -ForegroundColor Green
& gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --allow-unauthenticated `
    --set-build-env-vars=$BuildEnvVars `
    --set-env-vars=$RunEnvVars

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Deployment successful!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
