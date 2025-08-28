from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Summoner(Base):
    """Summoner model - stores League of Legends summoner information"""
    __tablename__ = "summoners"

    # Primary identifier
    puuid = Column(String, primary_key=True, index=True, doc="Player Universally Unique Identifier")
    
    # Riot ID components (new system)
    game_name = Column(String, nullable=False, index=True, doc="Riot ID game name (before #)")
    tag_line = Column(String, nullable=False, doc="Riot ID tag line (after #)")
    
    # Summoner profile data
    summoner_id = Column(String, nullable=True, index=True, doc="Summoner ID for region-specific endpoints")
    account_id = Column(String, nullable=True, doc="Account ID (legacy)")
    summoner_level = Column(Integer, nullable=False, doc="Current summoner level")
    profile_icon_id = Column(Integer, nullable=True, doc="Profile icon ID")
    revision_date = Column(Integer, nullable=False, doc="Last revision timestamp from Riot")
    
    # Regional information
    region = Column(String, nullable=False, doc="League region (e.g., na1, euw1)")
    
    # Metadata
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), doc="When first added to database")
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), doc="Last data update")
    is_active = Column(Boolean, default=True, doc="Whether summoner is actively tracked")
    
    # Relationships
    match_participants = relationship("MatchParticipant", back_populates="summoner", lazy="dynamic")
    champion_masteries = relationship("ChampionMastery", back_populates="summoner", lazy="dynamic")
    
    def __repr__(self):
        return f"<Summoner(puuid='{self.puuid}', game_name='{self.game_name}#{self.tag_line}', level={self.summoner_level})>"
    
    @property
    def riot_id(self) -> str:
        """Full Riot ID in format: gameName#tagLine"""
        return f"{self.game_name}#{self.tag_line}"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "puuid": self.puuid,
            "game_name": self.game_name,
            "tag_line": self.tag_line,
            "riot_id": self.riot_id,
            "summoner_level": self.summoner_level,
            "profile_icon_id": self.profile_icon_id,
            "region": self.region,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None
        }
