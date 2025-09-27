#!/bin/bash
# YouTube Downloader Setup Script for Linux/macOS
# This script sets up the complete development environment with locked versions

set -e

echo "🚀 YouTube Downloader - Complete Setup Script"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n📋 Checking prerequisites..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | sed 's/v//')
    echo -e "✅ Node.js: v${NODE_VERSION}"

    if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
        echo -e "${RED}❌ Node.js version must be >= 18.0.0${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js >= 18.0.0${NC}"
    exit 1
fi

# Check pnpm
if command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "✅ pnpm: ${PNPM_VERSION}"

    if [ "$(printf '%s\n' "8.0.0" "$PNPM_VERSION" | sort -V | head -n1)" != "8.0.0" ]; then
        echo -e "${RED}❌ pnpm version must be >= 8.0.0${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}❌ pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm@8.15.0
    echo -e "✅ pnpm installed"
fi

# Check Python
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version | sed 's/Python //')
    echo -e "✅ Python: ${PYTHON_VERSION}"

    if [ "$(printf '%s\n' "3.9.0" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.9.0" ]; then
        echo -e "${RED}❌ Python version must be >= 3.9.0${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Python not found. Please install Python >= 3.9.0${NC}"
    exit 1
fi

# Check Poetry
if command -v poetry >/dev/null 2>&1; then
    POETRY_VERSION=$(poetry --version | sed 's/Poetry (version //' | sed 's/)//')
    echo -e "✅ Poetry: ${POETRY_VERSION}"
else
    echo -e "${YELLOW}❌ Poetry not found. Installing Poetry...${NC}"
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
    echo -e "✅ Poetry installed"
    echo -e "${YELLOW}⚠️  Please restart your terminal and run this script again${NC}"
    exit 0
fi

echo -e "\n📦 Installing dependencies..."

# Install Node.js dependencies with locked versions
echo -e "${CYAN}Installing Node.js dependencies...${NC}"
pnpm install --frozen-lockfile

# Install Python dependencies with Poetry
echo -e "${CYAN}Installing Python dependencies...${NC}"
poetry install

# Verify yt-dlp installation
echo -e "\n🔍 Verifying yt-dlp installation..."
YTDLP_VERSION=$(poetry run python -m yt_dlp --version)
echo -e "✅ yt-dlp: ${YTDLP_VERSION}"

# Build the project
echo -e "\n🔨 Building the project..."
pnpm build

echo -e "\n✅ Setup completed successfully!"
echo "================================================"
echo -e "${CYAN}🚀 To start the development servers:${NC}"
echo -e "${WHITE}   Backend:  cd apps/backend && pnpm dev${NC}"
echo -e "${WHITE}   Frontend: cd apps/frontend && pnpm dev${NC}"
echo ""
echo -e "${WHITE}   Or use: pnpm dev (starts both)${NC}"
echo "================================================"