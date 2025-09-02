# 🎮 GG-Sync: League of Legends Performance Engine

A personal League of Legends performance analysis engine inspired by **mobalytics.gg** and **blitz.gg**, built as a desktop application using **Tauri** + **React** with a **FastAPI** backend.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (for Bun package manager)
- **Python 3.11+** (for FastAPI backend)
- **Rust** (for Tauri desktop wrapper)
- **uv** (for Python dependency management) - Install with: `pip install uv` or `winget install AstralSoftware.uv`

### 🏗️ Project Structure
```
gg-sync/
├── sync-ui/          # Frontend (Tauri + React)
├── backend/          # Backend (FastAPI + Python)
├── architecture.md   # System architecture
├── tech-stack.md    # Technology decisions
└── progress.md      # Development progress
```

## 🎯 Running the Application

### 1. Set Up the Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies and create virtual environment (first time only)
uv sync

# Set up the database (REQUIRED - first time only)
uv run alembic upgrade head

# Start the FastAPI server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 2. Start the Frontend Application

```bash
# Navigate to frontend directory
cd sync-ui

# Install dependencies (first time only)
bun install

# Start the Tauri development server
bun run tauri dev
```

The desktop application will launch automatically with hot reload enabled.

## 🎮 Features

### ✅ Currently Working
- **🏠 Welcome Dashboard** - Professional landing page
- **🔍 Account Connection** - Summoner lookup with region selection
- **📊 Feature Preview** - Cards showing upcoming analytics features
- **🔄 Real-time Integration** - Frontend-backend communication
- **🎨 Modern UI** - Clean, responsive design with shadcn/ui

### 🚧 Coming Soon
- **📈 Performance Analytics** - GPI-style radar charts
- **🏆 Champion Mastery** - Per-champion statistics
- **📜 Match History** - Detailed match breakdowns
- **🧠 AI Insights** - Performance recommendations

## 🛠️ Development

### Frontend Development
```bash
cd sync-ui
bun run dev          # Web development server
bun run tauri dev    # Desktop app with hot reload
bun run build        # Build for production
```

### Backend Development
```bash
cd backend

# Install dependencies and create virtual environment (first time only)
uv sync

# Start development server
uv run uvicorn app.main:app --reload  # Development server
```

### Managing Dependencies with uv

This project uses `pyproject.toml` for dependency management. Here are the most common commands:

#### Adding & Removing Packages
```bash
# Add a new production dependency
uv add fastapi uvicorn

# Add a development dependency
uv add --dev pytest black

# Remove a package
uv remove package-name
```

#### Updating Dependencies
```bash
# Install/sync all dependencies (run this after git pull)
uv sync

# Update all dependencies to latest versions
uv sync --upgrade

# Update a specific package
uv add package-name --upgrade
```

#### Environment Information
```bash
# Show installed packages
uv pip list

# Show package information
uv pip show package-name

# Check for dependency conflicts
uv pip check
```

### API Testing
```bash
# Test the summoner lookup API
curl -X POST http://localhost:8000/api/v1/summoners/lookup \
  -H "Content-Type: application/json" \
  -d '{"name":"TestSummoner","region":"na1"}'
```

## 🔧 Technology Stack

### Frontend
- **React 18** + **TypeScript**
- **Tauri** (Desktop wrapper)
- **Tailwind CSS** + **shadcn/ui**
- **TanStack Query** (Server state)
- **Bun** (Package manager)

### Backend
- **FastAPI** (Python web framework)
- **SQLAlchemy** (Database ORM)
- **Pydantic** (Data validation)
- **SQLite** (Development database)
- **Uvicorn** (ASGI server)

## 📁 Project Structure

```
gg-sync/
├── sync-ui/                    # Frontend (Tauri + React)
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   └── Dashboard.tsx  # Main dashboard
│   │   ├── lib/               # Utilities
│   │   └── main.tsx           # App entry point
│   ├── src-tauri/             # Tauri desktop wrapper
│   └── package.json           # Frontend dependencies
├── backend/                   # Backend (FastAPI)
│   ├── app/
│   │   ├── api/v1/           # API endpoints
│   │   ├── core/             # Configuration
│   │   ├── schemas/          # Data validation
│   │   └── services/         # Business logic
│   ├── pyproject.toml        # Python dependencies and project config
│   ├── requirements.txt      # Legacy requirements (deprecated)
│   └── .venv/                # Python virtual environment (managed by uv)
└── docs/                     # Documentation
```

## 🎯 Architecture

The application follows a **desktop-first** architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Tauri App     │───▶│  FastAPI Backend │───▶│   Riot Games     │
│   (React UI)    │    │   (Python)       │    │      API         │
└─────────────────┘    └──────────────────┘    └──────────────────┘
                               │
                               ▼
                       ┌──────────────────┐
                       │   SQLite DB      │
                       │  (Local Storage) │
                       └──────────────────┘
```

## 🔐 Environment Setup

### Backend Environment
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=sqlite+aiosqlite:///./gg_sync.db
RIOT_API_KEY=your_riot_api_key_here
DEBUG=true
```

### Frontend Configuration
The frontend is configured to connect to `http://localhost:8000` by default.

## 🚀 Deployment

### Development
Both frontend and backend run in development mode with hot reload.

### Production (Future)
- **Frontend**: Build with `bun run tauri build`
- **Backend**: Deploy to cloud service (AWS, Vercel, etc.)
- **Database**: Migrate from SQLite to PostgreSQL

## 🔧 Troubleshooting

### Installing uv
If you don't have `uv` installed:
```bash
# Using pip
pip install uv

# Using winget (Windows)
winget install AstralSoftware.uv

# Using curl (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Project Dependencies
This project has been converted to use `pyproject.toml` for modern Python dependency management. The dependencies are organized as:

**Production Dependencies:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `sqlalchemy` - Database ORM
- `httpx` - HTTP client for Riot API
- `python-dotenv` - Environment variables

**Development Dependencies:**
- `pytest` - Testing framework
- `black` - Code formatting
- `isort` - Import sorting

### Common Issues
- **"uv command not found"**: Install uv using one of the methods above
- **"Permission denied"**: Run terminal as Administrator (Windows) or use `sudo` (macOS/Linux)
- **"Rust not found"**: uv will automatically handle Rust compilation for packages like pydantic-core
- **"No pyproject.toml found"**: uv will use requirements.txt automatically, or run `uv init` to create a modern project structure

## 📚 Documentation

- [Architecture Overview](./architecture.md)
- [Technology Stack](./tech-stack.md)
- [Development Progress](./progress.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both frontend and backend
5. Submit a pull request

## 📄 License

This project is for personal use and educational purposes.

---

**Built with ❤️ for the League of Legends community** 
