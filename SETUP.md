# YouTube Downloader - Setup Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Python**: >= 3.9.0
- **Poetry**: Latest version

### Automated Setup

#### Windows (PowerShell)
```powershell
.\setup.ps1
```

#### Linux/macOS (Bash)
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. **Install Dependencies**
   ```bash
   # Install Node.js dependencies (locked versions)
   pnpm install --frozen-lockfile

   # Install Python dependencies with Poetry
   poetry install
   ```

2. **Build Project**
   ```bash
   pnpm build
   ```

3. **Start Development**
   ```bash
   # Start both servers
   pnpm dev

   # Or start individually
   pnpm dev:backend   # Port 5000
   pnpm dev:frontend  # Port 3000
   ```

## 📋 Version Management

### Locked Versions
- **Node.js**: 18.19.0 (see `.nvmrc`)
- **pnpm**: 8.15.0 (see `packageManager` in package.json)
- **Python**: 3.13.1 (see `.python-version`)
- **yt-dlp**: 2025.9.23 (managed by Poetry)

### Dependency Management
- **JavaScript/TypeScript**: pnpm with `--frozen-lockfile`
- **Python**: Poetry with `poetry.lock`

## 🏗️ Project Structure

```
youtube_download/
├── apps/
│   ├── backend/           # Node.js Express API
│   └── frontend/          # React + Vite SPA
├── packages/
│   └── shared/           # Shared TypeScript types
├── tools/               # Build tools & configs
├── pyproject.toml      # Python Poetry configuration
├── .python-version     # Python version lock
├── .nvmrc             # Node version lock
└── pnpm-lock.yaml     # JavaScript dependencies lock
```

## 🔧 Available Scripts

### Root Level
- `pnpm dev` - Start both frontend and backend
- `pnpm build` - Build entire project
- `pnpm setup` - Install all deps + build
- `pnpm install:all` - Install Node.js + Python deps
- `pnpm install:python` - Install only Python deps

### Backend (`apps/backend/`)
- `pnpm dev` - Start development server
- `pnpm build` - TypeScript compilation
- `pnpm start` - Start production server

### Frontend (`apps/frontend/`)
- `pnpm dev` - Start Vite dev server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

## 🐍 Python Environment

### Poetry Commands
```bash
# Install dependencies
poetry install

# Add new dependency
poetry add package-name

# Add dev dependency
poetry add --group dev package-name

# Run commands in Poetry environment
poetry run python -m yt_dlp --version

# Activate virtual environment
poetry shell
```

### yt-dlp Integration
The backend uses yt-dlp via Poetry's virtual environment:
```bash
# In .env file
YT_DLP_PATH=poetry run python -m yt_dlp
```

## 🔒 Security & Dependencies

### Dependency Security
- All dependencies are locked to specific versions
- Use `pnpm audit` and `poetry audit` for security scanning
- Update dependencies carefully with version testing

### Environment Variables
Create `.env` files in:
- `apps/backend/.env` - Backend configuration
- `apps/frontend/.env` - Frontend configuration (VITE_* prefixed)

### Example Backend .env
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DEFAULT_DOWNLOAD_PATH=C:\\Users\\username\\Videos\\YouTube_Downloads
YT_DLP_PATH=poetry run python -m yt_dlp
```

### Example Frontend .env
```env
VITE_API_URL=http://localhost:5000
```

## 🚨 Troubleshooting

### Common Issues

1. **Port 5000 already in use**
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F

   # Linux/macOS
   lsof -ti:5000 | xargs kill -9
   ```

2. **Poetry not found**
   ```bash
   # Install Poetry
   curl -sSL https://install.python-poetry.org | python3 -
   # or
   pip install poetry
   ```

3. **pnpm not found**
   ```bash
   npm install -g pnpm@8.15.0
   ```

4. **Build failures**
   ```bash
   # Clean and rebuild
   pnpm clean
   rm -rf node_modules poetry.lock
   pnpm install --frozen-lockfile
   poetry install
   pnpm build
   ```

5. **yt-dlp not working**
   ```bash
   # Test yt-dlp installation
   poetry run python -m yt_dlp --version

   # Update yt-dlp
   poetry update yt-dlp
   ```

## 📝 Development Workflow

1. **Start Development**
   ```bash
   pnpm dev  # Starts both servers
   ```

2. **Make Changes**
   - Backend: `apps/backend/src/`
   - Frontend: `apps/frontend/src/`
   - Shared: `packages/shared/src/`

3. **Test Changes**
   ```bash
   pnpm build  # Verify everything compiles
   ```

4. **Code Quality**
   ```bash
   pnpm lint    # Run linting
   pnpm format  # Format code
   ```

## 🎯 Production Deployment

1. **Build for Production**
   ```bash
   pnpm build
   ```

2. **Environment Setup**
   - Set production environment variables
   - Configure proper CORS origins
   - Set secure download paths

3. **Start Production Servers**
   ```bash
   # Backend
   cd apps/backend && pnpm start

   # Frontend (serve static files)
   cd apps/frontend && serve -s dist -l 3000
   ```

## 📊 Monitoring & Logs

- Backend logs: Winston logger (see `apps/backend/src/utils/logger.ts`)
- Frontend errors: Browser console + error boundaries
- Build logs: Turbo cache in `.turbo/`
- Python logs: Poetry virtual environment

## 🔄 Updates & Maintenance

### Updating Dependencies
```bash
# Update Node.js dependencies
pnpm update

# Update Python dependencies
poetry update

# Update specific packages
pnpm update package-name
poetry update package-name
```

### Version Bumps
1. Update `.nvmrc` for Node.js version
2. Update `.python-version` for Python version
3. Update `packageManager` in `package.json` for pnpm
4. Update versions in `pyproject.toml` for Python packages