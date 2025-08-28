from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class ChampionMastery(Base):
    """Champion mastery model - stores champion mastery information for summoners"""
    __tablename__ = "champion_masteries"

    # Composite primary key
    puuid = Column(String, ForeignKey("summoners.puuid"), primary_key=True, index=True, doc="Player PUUID")
    champion_id = Column(Integer, primary_key=True, doc="Champion ID")
    
    # Mastery data
    mastery_level = Column(Integer, nullable=False, doc="Mastery level (1-7)")
    mastery_points = Column(Integer, nullable=False, doc="Total mastery points")
    last_play_time = Column(DateTime(timezone=True), nullable=True, doc="Last time played this champion")
    
    # Progress tracking
    points_until_next_level = Column(Integer, nullable=True, doc="Points needed for next mastery level")
    chest_granted = Column(Boolean, default=False, doc="Whether hextech chest was earned this season")
    tokens_earned = Column(Integer, default=0, doc="Mastery tokens earned")
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), doc="When first recorded")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), doc="Last update")
    
    # Relationships
    summoner = relationship("Summoner", back_populates="champion_masteries")
    
    def __repr__(self):
        return f"<ChampionMastery(puuid='{self.puuid[:8]}...', champion_id={self.champion_id}, level={self.mastery_level}, points={self.mastery_points})>"
    
    @property
    def mastery_progress_percentage(self) -> float:
        """Calculate progress to next mastery level as percentage"""
        if self.mastery_level >= 7 or not self.points_until_next_level:
            return 100.0
        
        # Calculate total points needed for current level
        total_points_for_current = self.mastery_points + self.points_until_next_level
        progress = (self.mastery_points / total_points_for_current) * 100
        return round(progress, 1)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "puuid": self.puuid,
            "champion_id": self.champion_id,
            "mastery_level": self.mastery_level,
            "mastery_points": self.mastery_points,
            "points_until_next_level": self.points_until_next_level,
            "chest_granted": self.chest_granted,
            "tokens_earned": self.tokens_earned,
            "last_play_time": self.last_play_time.isoformat() if self.last_play_time else None,
            "mastery_progress_percentage": self.mastery_progress_percentage,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
