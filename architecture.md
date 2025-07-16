# 🛠 GG-Sync: Game Performance Engine Architecture

## 🎯 Project Vision
A personal Game performance analysis engine built as a desktop application using **Tauri** + **React**. This tool will provide comprehensive match analysis, performance insights, and eventually real-time game features.

---

## 🏗️ System Architecture

### Core Application Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Desktop Runtime**: Tauri (Rust - desktop wrapper & local storage)
- **Backend API**: Python + FastAPI + SQLAlchemy
- **Database**: SQLite (development) → PostgreSQL (production)
- **Package Manager**: Bun (frontend), Poetry (backend)
- **Build Tool**: Vite
- **Charts & Visualization**: Recharts, D3.js for advanced visualizations

### Data Flow Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Riot Games    │───▶│  Python FastAPI  │───▶│   Tauri Desktop  │───▶│  React Frontend │
│      API        │    │    Backend       │    │     Wrapper      │    │   (Dashboard)   │
└─────────────────┘    └──────────────────┘    └──────────────────┘    └─────────────────┘
                               │                        │
                               ▼                        ▼
                       ┌──────────────────┐    ┌──────────────────┐
                       │   Database       │    │  Local Cache     │
                       │ SQLite/Postgres  │    │   & Settings     │
                       └──────────────────┘    └──────────────────┘
```

### Architecture Evolution
**Phase 1 (MVP)**: Tauri + Local SQLite
**Phase 2 (Current Goal)**: Tauri + FastAPI + SQLite  
**Phase 3 (Production)**: Tauri + FastAPI + PostgreSQL + Redis

### Communication Flow
```
Frontend (React) ──HTTP/REST──▶ FastAPI Backend ──▶ Riot API
      │                              │
      │                              ▼
      └──────Local Storage◀─── SQLite Database
```

**API Endpoints Structure**:
- `GET /api/v1/summoner/{name}` - Get summoner information
- `GET /api/v1/matches/{puuid}` - Get match history  
- `GET /api/v1/analytics/{puuid}` - Get performance analytics
- `POST /api/v1/sync/{puuid}` - Trigger data sync from Riot API

---

## 🎮 Core Features & Implementation

### 1. 📊 Game Data Access (Foundation)
**Riot API Integration**
- **Developer Account**: Riot Developer Portal registration
- **API Key Management**: Secure storage in Tauri's secure store
- **Rate Limiting**: Intelligent request throttling and caching
- **Supported Regions**: All Riot regions (NA1, EUW1, KR, etc.)

**Key Endpoints**:
| Purpose | Endpoint | Usage |
|---------|----------|-------|
| Summoner Info | `/lol/summoner/v4/summoners/by-name/{name}` | Get PUUID and account details |
| Match History | `/lol/match/v5/matches/by-puuid/{puuid}/ids` | Fetch recent match IDs |
| Match Details | `/lol/match/v5/matches/{matchId}` | Full match statistics |
| Live Game | `/lol/spectator/v4/active-games/by-summoner/{id}` | Current game data |
| Champion Mastery | `/lol/champion-mastery/v4/champion-masteries/by-summoner/{id}` | Champion proficiency |

### 2. 📈 Performance Analytics Engine
**Core Metrics Tracking**:
- **Win Rate**: Overall and per-champion performance
- **KDA Analysis**: Kill/Death/Assist ratios and trends
- **CS Performance**: Creep score per minute across game phases
- **Vision Control**: Ward placement and vision score optimization
- **Damage Analysis**: Damage share and efficiency metrics
- **Game Impact**: Objective participation and map control

**GPI-Style Radar Metrics**:
```python
from pydantic import BaseModel
from typing import Optional

class PlayerGPI(BaseModel):
    aggression: float        # Fighting frequency and positioning
    farming: float           # CS efficiency and gold generation  
    survivability: float     # Deaths per game and positioning
    vision: float            # Vision score and map awareness
    versatility: float       # Champion pool diversity
    consistency: float       # Performance variance
    
    class Config:
        schema_extra = {
            "example": {
                "aggression": 7.2,
                "farming": 6.8, 
                "survivability": 5.4,
                "vision": 6.1,
                "versatility": 8.0,
                "consistency": 7.5
            }
        }
```

### 3. 🧠 AI Coaching & Insights
**Rule-Based Analysis**:
- Champion-specific performance benchmarks
- Role-based expectation analysis
- Meta-awareness and adaptation tracking
- Improvement opportunity identification

**Statistical Benchmarking**:
- Peer comparison (same rank/role)
- Personal historical trends
- Champion mastery progression
- Seasonal performance tracking

### 4. 📱 User Interface Design

**Dashboard Layout**:
```
┌─────────────────────────────────────────────┐
│             Navigation Header               │
├─────────────────┬───────────────────────────┤
│   Performance   │      Match History        │
│   Radar Chart   │     (Recent Games)        │
├─────────────────┼───────────────────────────┤
│   Champion      │     Quick Insights        │
│   Statistics    │   (Recent Trends)         │
└─────────────────┴───────────────────────────┘
```

**Page Structure**:
- **🏠 Dashboard**: Overview with key metrics and recent performance
- **📊 Analytics**: Deep-dive performance analysis with charts
- **🏆 Champions**: Per-champion statistics and mastery tracking
- **📜 Match History**: Detailed match breakdown and timeline
- **⚙️ Settings**: API configuration and app preferences

---

## 🗃️ Data Management

### Backend Data Models (Python/SQLAlchemy)
```python
# FastAPI backend data models
from sqlalchemy import Column, Integer, String, DateTime, Float, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class MatchData(Base):
    __tablename__ = "matches"
    
    match_id = Column(String, primary_key=True)
    puuid = Column(String, index=True)
    game_creation = Column(DateTime)
    game_duration = Column(Integer)
    queue_id = Column(Integer)
    participants = Column(JSON)  # Store participant data as JSON
    teams = Column(JSON)
    timeline_data = Column(JSON)

class PlayerStats(Base):
    __tablename__ = "player_stats"
    
    puuid = Column(String, primary_key=True)
    summoner_name = Column(String)
    current_rank = Column(String)
    tier = Column(String)
    rank = Column(String)
    lp = Column(Integer)
    total_games = Column(Integer)
    wins = Column(Integer)
    updated_at = Column(DateTime)

class ChampionMastery(Base):
    __tablename__ = "champion_masteries"
    
    puuid = Column(String, primary_key=True)
    champion_id = Column(Integer, primary_key=True)
    mastery_level = Column(Integer)
    mastery_points = Column(Integer)
    last_play_time = Column(DateTime)
```

### Data Layer Architecture
- **FastAPI Backend**: Handles Riot API calls, data processing, and analytics
- **SQLAlchemy ORM**: Database abstraction and relationship management
- **Alembic**: Database migrations and schema versioning
- **Pydantic**: Request/response validation and serialization

### Caching Strategy
- **Database**: SQLite for development, PostgreSQL for production
- **In-Memory Cache**: Redis for session data and frequent queries
- **Static Data**: Champion info, items, runes cached in backend
- **Client Cache**: Tauri local storage for user settings and offline data

---

## 🔧 Development Phases

### Phase 1: Foundation Setup (Current)
- [x] Tauri + React frontend setup
- [ ] Python FastAPI backend scaffolding
- [ ] SQLite database setup with SQLAlchemy
- [ ] Basic Riot API client implementation
- [ ] Frontend-backend communication via HTTP

### Phase 2: Core Data Pipeline  
- [ ] Complete Riot API integration (summoner, matches, mastery)
- [ ] Database models and migrations
- [ ] Match data fetching and storage
- [ ] Basic player statistics calculation
- [ ] Simple dashboard with match history

### Phase 3: Analytics & Visualization
- [ ] GPI-style radar charts implementation
- [ ] Champion-specific performance insights
- [ ] Performance trends over time
- [ ] Advanced analytics engine
- [ ] Data export and reporting features

### Phase 4: Real-time Features
- [ ] Live game detection and overlay
- [ ] Pre-game scouting and enemy analysis  
- [ ] Build recommendations system
- [ ] Performance predictions and coaching
- [ ] Desktop integration (notifications, auto-launch)

### Phase 5: Advanced Intelligence
- [ ] Machine learning models for insights
- [ ] Personalized improvement recommendations
- [ ] Community benchmarking features
- [ ] PostgreSQL migration for production
- [ ] Redis caching implementation

---

## 🛡️ Security & Compliance

### API Security
- Secure API key storage using Tauri's credential manager
- Request rate limiting to respect Riot's ToS
- No injection or game client modification
- Read-only data access (no game state manipulation)

### Data Privacy
- All data stored locally (no cloud by default)
- User consent for any data sharing
- Anonymized analytics (if implemented)
- GDPR compliance for EU users

---

## 📦 Project Structure

```
gg-sync/
├── sync-ui/                    # Frontend Tauri application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── charts/        # Chart components (radar, line, etc.)
│   │   │   ├── match/         # Match-related components
│   │   │   └── layout/        # Layout components
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Champions.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Utility functions
│   │   └── App.tsx
│   ├── src-tauri/             # Tauri desktop wrapper
│   │   ├── src/
│   │   │   ├── commands/      # Tauri commands (minimal)
│   │   │   │   ├── local_storage.rs
│   │   │   │   └── system.rs
│   │   │   └── main.rs
│   │   └── Cargo.toml
│   ├── package.json
│   └── tauri.conf.json
├── backend/                   # Python FastAPI backend
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── v1/
│   │   │   │   ├── riot.py   # Riot API endpoints
│   │   │   │   ├── analytics.py
│   │   │   │   ├── matches.py
│   │   │   │   └── players.py
│   │   │   └── deps.py       # Dependencies
│   │   ├── core/             # Core configuration
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/           # SQLAlchemy models
│   │   │   ├── match.py
│   │   │   ├── player.py
│   │   │   └── champion.py
│   │   ├── services/         # Business logic
│   │   │   ├── riot_client.py
│   │   │   ├── analytics.py
│   │   │   └── data_sync.py
│   │   ├── schemas/          # Pydantic schemas
│   │   │   ├── match.py
│   │   │   ├── player.py
│   │   │   └── analytics.py
│   │   └── main.py
│   ├── alembic/              # Database migrations
│   ├── tests/
│   ├── requirements.txt
│   ├── pyproject.toml        # Poetry configuration
│   └── .env.example
├── docs/                     # Documentation
│   ├── api/                  # API documentation
│   └── user-guide/          # User guides
├── architecture.md
├── progress.md
└── README.md
```

---

## 🚀 Future Enhancements

### Desktop Integration
- **System Tray**: Background operation with quick access
- **Notifications**: Match end summaries and insights
- **Hotkeys**: Quick overlay toggle and shortcuts
- **Auto-launch**: Start with League client

### Community Features
- **Data Sharing**: Anonymous performance benchmarking
- **Friend Tracking**: Compare with friends' performance
- **Club Analytics**: Team/group performance insights
- **Coaching**: Share insights with coaches

### Multi-Game Support
- **Valorant**: Extend to Riot's FPS game
- **TFT**: Teamfight Tactics analysis
- **Wild Rift**: Mobile League variant
- **LoR**: Legends of Runeterra deck tracking

---

## 📝 Technical Decisions & Rationale

### Why Tauri?
- **Performance**: Native performance with web UI flexibility
- **Security**: Sandboxed with controlled system access
- **Bundle Size**: Smaller than Electron alternatives
- **Desktop Integration**: System tray, notifications, file system access

### Why Python + FastAPI?
- **Rapid Development**: Python's ecosystem for data analysis and ML
- **Rich Libraries**: pandas, numpy, scikit-learn for analytics
- **API Performance**: FastAPI's automatic documentation and validation
- **Data Science**: Natural fit for statistical analysis and ML models
- **Community**: Extensive League of Legends community tools in Python

### Why React?
- **Ecosystem**: Rich charting and UI component libraries
- **Development Speed**: Rapid prototyping and iteration
- **Community**: Large community and extensive documentation
- **TypeScript**: Strong typing for better code quality

### Why SQLite → PostgreSQL?
- **Development**: SQLite for local development and testing
- **Production**: PostgreSQL for advanced queries and performance
- **Migration Path**: SQLAlchemy ORM makes database switching seamless
- **Local First**: Keeps user data local while allowing future cloud features

---

## 🔍 Monitoring & Analytics

### Performance Metrics
- API response times and success rates
- Database query performance
- UI rendering performance
- Memory and CPU usage

### User Analytics (Optional)
- Feature usage patterns
- Most viewed statistics
- Performance improvement tracking
- Error reporting and crash analytics
