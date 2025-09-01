from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class LiveGame(Base):
    """
    Model for storing live/active game data from Riot Spectator API
    """
    __tablename__ = "live_games"
    
    # Primary identification
    game_id = Column(String, primary_key=True)  # Riot's gameId for the live game
    platform_id = Column(String, nullable=False)  # Platform identifier (NA1, EUW1, etc.)
    
    # Game metadata
    game_type = Column(String, nullable=True)  # Game type
    game_mode = Column(String, nullable=True)  # Game mode (CLASSIC, ARAM, etc.)
    map_id = Column(Integer, nullable=True)  # Map ID (11 = Summoner's Rift)
    queue_id = Column(Integer, nullable=True)  # Queue type
    
    # Timing information
    game_start_time = Column(DateTime, nullable=True)  # When the game started
    game_length = Column(Integer, nullable=True)  # Current game length in seconds
    last_updated = Column(DateTime, default=datetime.utcnow)  # When we last updated this data
    
    # Game state
    is_active = Column(Boolean, default=True)  # Whether this game is still active
    spectator_delay = Column(Integer, nullable=True)  # Spectator delay in seconds
    
    # Raw data from Riot API for future analysis
    raw_data = Column(JSON, nullable=True)
    
    # Relationships
    participants = relationship("LiveGameParticipant", back_populates="live_game", cascade="all, delete-orphan")


class LiveGameParticipant(Base):
    """
    Model for storing individual player data in a live game
    """
    __tablename__ = "live_game_participants"
    
    # Composite primary key
    game_id = Column(String, ForeignKey("live_games.game_id"), primary_key=True)
    summoner_id = Column(String, primary_key=True)  # Riot summoner ID
    
    # Player identification
    puuid = Column(String, nullable=True)  # PUUID if available
    summoner_name = Column(String, nullable=True)
    summoner_level = Column(Integer, nullable=True)
    
    # Team and position
    team_id = Column(Integer, nullable=False)  # 100 (Blue) or 200 (Red)
    position = Column(String, nullable=True)  # TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
    
    # Champion and spells
    champion_id = Column(Integer, nullable=True)
    spell1_id = Column(Integer, nullable=True)  # Summoner spell 1
    spell2_id = Column(Integer, nullable=True)  # Summoner spell 2
    
    # Runes and perks
    perk_main_style = Column(Integer, nullable=True)  # Primary rune tree
    perk_sub_style = Column(Integer, nullable=True)   # Secondary rune tree
    perks = Column(JSON, nullable=True)  # Complete perk/rune data
    
    # Game bans (if applicable)
    banned_champion_id = Column(Integer, nullable=True)
    
    # Player performance tracking (for our analytics)
    estimated_rank = Column(String, nullable=True)  # Estimated rank based on match history
    win_rate_with_champion = Column(Float, nullable=True)  # Win rate with this champion
    average_kda = Column(Float, nullable=True)  # Average KDA
    
    # Raw participant data
    raw_data = Column(JSON, nullable=True)
    
    # Relationship
    live_game = relationship("LiveGame", back_populates="participants")


class LiveGameSnapshot(Base):
    """
    Model for storing snapshots of live game data for analysis
    """
    __tablename__ = "live_game_snapshots"
    
    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Reference to live game
    game_id = Column(String, ForeignKey("live_games.game_id"), nullable=False)
    
    # Snapshot metadata
    snapshot_time = Column(DateTime, default=datetime.utcnow)
    game_time = Column(Integer, nullable=True)  # Game time in seconds when snapshot taken
    
    # Team analysis
    blue_team_analysis = Column(JSON, nullable=True)  # Analysis of blue team composition/performance
    red_team_analysis = Column(JSON, nullable=True)   # Analysis of red team composition/performance
    
    # Match predictions
    win_probability_blue = Column(Float, nullable=True)  # Predicted win % for blue team
    win_probability_red = Column(Float, nullable=True)   # Predicted win % for red team
    
    # Enemy scouting data
    enemy_team_threats = Column(JSON, nullable=True)    # Analysis of enemy team threats
    recommended_strategies = Column(JSON, nullable=True) # Recommended strategies/builds
    
    # Performance insights
    performance_insights = Column(JSON, nullable=True)  # Real-time insights and recommendations
    
    # Raw snapshot data
    raw_data = Column(JSON, nullable=True)


class PlayerLiveGameHistory(Base):
    """
    Model for tracking a player's live game detection history
    """
    __tablename__ = "player_live_game_history"
    
    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Player identification
    puuid = Column(String, nullable=False, index=True)
    summoner_id = Column(String, nullable=False)
    
    # Live game reference
    game_id = Column(String, ForeignKey("live_games.game_id"), nullable=False)
    
    # Detection metadata
    detected_at = Column(DateTime, default=datetime.utcnow)
    game_start_detected = Column(DateTime, nullable=True)
    game_end_detected = Column(DateTime, nullable=True)
    
    # Game outcome (filled after game ends)
    final_result = Column(String, nullable=True)  # "WIN", "LOSS", "REMAKE", etc.
    final_kda = Column(String, nullable=True)     # Final KDA after game
    final_match_id = Column(String, nullable=True) # Match ID once game is completed
    
    # Analysis data
    pre_game_analysis = Column(JSON, nullable=True)  # Analysis before/during game
    post_game_analysis = Column(JSON, nullable=True) # Analysis after game completion
