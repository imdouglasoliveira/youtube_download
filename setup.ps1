# YouTube Downloader Setup Script for Windows
# This script sets up the complete development environment with locked versions

Write-Host "🚀 YouTube Downloader - Complete Setup Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check prerequisites
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

    if ([version]($nodeVersion -replace "v", "") -lt [version]"18.0.0") {
        Write-Host "❌ Node.js version must be >= 18.0.0" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js >= 18.0.0" -ForegroundColor Red
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm: $pnpmVersion" -ForegroundColor Green

    if ([version]$pnpmVersion -lt [version]"8.0.0") {
        Write-Host "❌ pnpm version must be >= 8.0.0" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ pnpm not found. Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm@8.15.0
    Write-Host "✅ pnpm installed" -ForegroundColor Green
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green

    if ([version]($pythonVersion -replace "Python ", "") -lt [version]"3.9.0") {
        Write-Host "❌ Python version must be >= 3.9.0" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Python not found. Please install Python >= 3.9.0" -ForegroundColor Red
    exit 1
}

# Check Poetry
try {
    $poetryVersion = poetry --version
    Write-Host "✅ Poetry: $poetryVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Poetry not found. Installing Poetry..." -ForegroundColor Yellow
    (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python
    Write-Host "✅ Poetry installed" -ForegroundColor Green
    Write-Host "⚠️  Please restart your terminal and run this script again" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow

# Install Node.js dependencies with locked versions
Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
    exit 1
}

# Install Python dependencies with Poetry
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
poetry install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Python dependencies" -ForegroundColor Red
    exit 1
}

# Verify yt-dlp installation
Write-Host "`n🔍 Verifying yt-dlp installation..." -ForegroundColor Yellow
$ytdlpVersion = poetry run python -m yt_dlp --version
Write-Host "✅ yt-dlp: $ytdlpVersion" -ForegroundColor Green

# Build the project
Write-Host "`n🔨 Building the project..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "🚀 To start the development servers:" -ForegroundColor Cyan
Write-Host "   Backend:  cd apps/backend && pnpm dev" -ForegroundColor White
Write-Host "   Frontend: cd apps/frontend && pnpm dev" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "   Or use: pnpm dev (starts both)" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Green