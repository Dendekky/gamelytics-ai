# GG-Sync Backend

FastAPI backend for the GG-Sync League of Legends performance analysis engine.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Poetry (for dependency management)

### Installation

1. **Install dependencies:**
   ```bash
   poetry install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your Riot API key
   ```

3. **Run the development server:**
   ```bash
   poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access the API:**
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/v1/
│   │   ├── endpoints/     # API endpoints
│   │   └── api.py         # Main API router
│   ├── core/
│   │   ├── config.py      # Settings configuration
│   │   └── database.py    # Database setup
│   ├── models/            # SQLAlchemy models (TODO)
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   └── main.py           # FastAPI app entry point
├── alembic/              # Database migrations (TODO)
├── tests/                # Test files (TODO)
├── pyproject.toml        # Poetry configuration
└── env.example          # Environment variables template
```

## 🔧 Development

### Code Quality
```bash
# Format code
poetry run black .
poetry run isort .

# Lint code
poetry run ruff check .

# Type checking
poetry run mypy .
```

### Testing
```bash
# Run tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app
```

## 🔌 API Endpoints

### Summoners
- `POST /api/v1/summoners/lookup` - Look up summoner by name
- `GET /api/v1/summoners/{puuid}` - Get summoner details

### Matches
- `GET /api/v1/matches/{puuid}` - Get match history

### Analytics
- `GET /api/v1/analytics/{puuid}` - Get performance analytics

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database URL | `sqlite+aiosqlite:///./gg_sync.db` |
| `RIOT_API_KEY` | Riot Games API key | `None` |
| `DEBUG` | Enable debug mode | `true` |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | `http://localhost:1420` |

## 🎯 Next Steps

1. **Database Models**: Create SQLAlchemy models for matches and players
2. **Riot API Integration**: Implement real API calls with rate limiting
3. **Analytics Engine**: Build performance calculation logic
4. **Testing**: Add comprehensive test coverage
5. **Documentation**: Expand API documentation 