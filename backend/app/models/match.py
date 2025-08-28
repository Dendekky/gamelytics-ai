from sqlalchemy import Column, String, Integer, DateTime, Boolean, Float, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Match(Base):
    """Match model - stores League of Legends match information"""
    __tablename__ = "matches"

    # Primary identifier
    match_id = Column(String, primary_key=True, index=True, doc="Riot match ID")
    
    # Match metadata
    game_creation = Column(DateTime(timezone=True), nullable=False, index=True, doc="When the match was created")
    game_start = Column(DateTime(timezone=True), nullable=True, doc="When the match started")
    game_end = Column(DateTime(timezone=True), nullable=True, doc="When the match ended")
    game_duration = Column(Integer, nullable=False, doc="Match duration in seconds")
    
    # Game information
    game_mode = Column(String, nullable=False, doc="Game mode (e.g., CLASSIC, ARAM)")
    game_type = Column(String, nullable=False, doc="Game type (e.g., MATCHED_GAME)")
    game_version = Column(String, nullable=False, doc="Game client version")
    map_id = Column(Integer, nullable=False, doc="Map ID (11=Summoner's Rift, 12=Howling Abyss)")
    platform_id = Column(String, nullable=False, doc="Platform where the match was played")
    queue_id = Column(Integer, nullable=False, index=True, doc="Queue type ID")
    
    # Tournament information (if applicable)
    tournament_code = Column(String, nullable=True, doc="Tournament code if tournament match")
    
    # Teams and outcome
    winning_team = Column(Integer, nullable=True, doc="Winning team ID (100 or 200)")
    
    # Raw data storage for complex nested data
    teams_data = Column(JSON, nullable=True, doc="Complete teams data from Riot API")
    timeline_data = Column(JSON, nullable=True, doc="Match timeline data (if fetched)")
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), doc="When added to database")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), doc="Last update")
    
    # Relationships
    participants = relationship("MatchParticipant", back_populates="match", lazy="dynamic")
    
    def __repr__(self):
        return f"<Match(match_id='{self.match_id}', queue_id={self.queue_id}, duration={self.game_duration}s)>"
    
    @property
    def duration_minutes(self) -> float:
        """Game duration in minutes"""
        return round(self.game_duration / 60, 1)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "match_id": self.match_id,
            "game_creation": self.game_creation.isoformat() if self.game_creation else None,
            "game_duration": self.game_duration,
            "duration_minutes": self.duration_minutes,
            "game_mode": self.game_mode,
            "game_type": self.game_type,
            "map_id": self.map_id,
            "queue_id": self.queue_id,
            "winning_team": self.winning_team,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class MatchParticipant(Base):
    """Match participant model - stores individual player performance in a match"""
    __tablename__ = "match_participants"

    # Composite primary key
    match_id = Column(String, ForeignKey("matches.match_id"), primary_key=True, doc="Reference to match")
    puuid = Column(String, ForeignKey("summoners.puuid"), primary_key=True, index=True, doc="Player PUUID")
    
    # Participant metadata
    participant_id = Column(Integer, nullable=False, doc="Participant ID within the match (1-10)")
    team_id = Column(Integer, nullable=False, doc="Team ID (100 or 200)")
    
    # Champion and summoner spells
    champion_id = Column(Integer, nullable=False, index=True, doc="Champion ID")
    champion_name = Column(String, nullable=False, doc="Champion name")
    champion_level = Column(Integer, nullable=False, doc="Champion level achieved")
    summoner_spell_1 = Column(Integer, nullable=False, doc="First summoner spell ID")
    summoner_spell_2 = Column(Integer, nullable=False, doc="Second summoner spell ID")
    
    # KDA and combat stats
    kills = Column(Integer, nullable=False, default=0, doc="Kills")
    deaths = Column(Integer, nullable=False, default=0, doc="Deaths") 
    assists = Column(Integer, nullable=False, default=0, doc="Assists")
    double_kills = Column(Integer, nullable=False, default=0, doc="Double kills")
    triple_kills = Column(Integer, nullable=False, default=0, doc="Triple kills")
    quadra_kills = Column(Integer, nullable=False, default=0, doc="Quadra kills")
    penta_kills = Column(Integer, nullable=False, default=0, doc="Penta kills")
    
    # Damage stats
    total_damage_dealt = Column(Integer, nullable=False, default=0, doc="Total damage dealt")
    total_damage_dealt_to_champions = Column(Integer, nullable=False, default=0, doc="Damage to champions")
    total_damage_taken = Column(Integer, nullable=False, default=0, doc="Total damage taken")
    magic_damage_dealt = Column(Integer, nullable=False, default=0, doc="Magic damage dealt")
    physical_damage_dealt = Column(Integer, nullable=False, default=0, doc="Physical damage dealt")
    true_damage_dealt = Column(Integer, nullable=False, default=0, doc="True damage dealt")
    
    # Gold and CS
    gold_earned = Column(Integer, nullable=False, default=0, doc="Total gold earned")
    total_minions_killed = Column(Integer, nullable=False, default=0, doc="CS (creep score)")
    neutral_minions_killed = Column(Integer, nullable=False, default=0, doc="Jungle monsters killed")
    
    # Vision and objectives
    vision_score = Column(Integer, nullable=False, default=0, doc="Vision score")
    wards_placed = Column(Integer, nullable=False, default=0, doc="Wards placed")
    wards_killed = Column(Integer, nullable=False, default=0, doc="Enemy wards destroyed")
    control_wards_purchased = Column(Integer, nullable=False, default=0, doc="Control wards bought")
    
    # Objectives participation
    turret_kills = Column(Integer, nullable=False, default=0, doc="Turrets destroyed")
    inhibitor_kills = Column(Integer, nullable=False, default=0, doc="Inhibitors destroyed")
    dragon_kills = Column(Integer, nullable=False, default=0, doc="Dragons killed")
    baron_kills = Column(Integer, nullable=False, default=0, doc="Barons killed")
    
    # Performance metrics
    largest_killing_spree = Column(Integer, nullable=False, default=0, doc="Largest killing spree")
    largest_multi_kill = Column(Integer, nullable=False, default=0, doc="Largest multi-kill")
    total_time_cc_dealt = Column(Integer, nullable=False, default=0, doc="Total crowd control time")
    
    # Match outcome
    win = Column(Boolean, nullable=False, doc="Whether the player won")
    
    # Items (store as JSON for flexibility)
    items = Column(JSON, nullable=True, doc="Final item build")
    
    # Raw participant data for future analysis
    raw_data = Column(JSON, nullable=True, doc="Complete participant data from Riot API")
    
    # Relationships
    match = relationship("Match", back_populates="participants")
    summoner = relationship("Summoner", back_populates="match_participants")
    
    def __repr__(self):
        return f"<MatchParticipant(match_id='{self.match_id}', puuid='{self.puuid[:8]}...', champion='{self.champion_name}')>"
    
    @property
    def kda_ratio(self) -> float:
        """Calculate KDA ratio: (kills + assists) / deaths"""
        if self.deaths == 0:
            return float(self.kills + self.assists)
        return round((self.kills + self.assists) / self.deaths, 2)
    
    @property
    def cs_per_minute(self) -> float:
        """Calculate CS per minute"""
        if hasattr(self, 'match') and self.match and self.match.game_duration > 0:
            minutes = self.match.game_duration / 60
            return round(self.total_minions_killed / minutes, 1)
        return 0.0
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "match_id": self.match_id,
            "puuid": self.puuid,
            "participant_id": self.participant_id,
            "team_id": self.team_id,
            "champion_id": self.champion_id,
            "champion_name": self.champion_name,
            "champion_level": self.champion_level,
            "kills": self.kills,
            "deaths": self.deaths,
            "assists": self.assists,
            "kda_ratio": self.kda_ratio,
            "total_damage_dealt_to_champions": self.total_damage_dealt_to_champions,
            "gold_earned": self.gold_earned,
            "total_minions_killed": self.total_minions_killed,
            "vision_score": self.vision_score,
            "win": self.win,
            "items": self.items
        }
