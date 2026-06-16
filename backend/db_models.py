"""Persistent tables: watch markers (operator config) and the AI detection log
(audit trail — also what ships to ELK and demonstrates data integrity)."""
from sqlalchemy import BigInteger, Boolean, Column, Float, Integer, String

from database import Base


class MarkerRow(Base):
    __tablename__ = "watch_markers"

    id = Column(String, primary_key=True)
    description = Column(String, nullable=False)
    priority = Column(String, default="high")
    active = Column(Boolean, default=True)
    matches = Column(Integer, default=0)
    created_at = Column(BigInteger)


class DetectionRow(Base):
    __tablename__ = "detections"

    id = Column(String, primary_key=True)
    label = Column(String)
    confidence = Column(Integer)
    priority = Column(String)
    status = Column(String)
    grid_ref = Column(String)
    detected_by = Column(String)
    image_ref = Column(String)
    ai_summary = Column(String)
    source = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    created_at = Column(BigInteger)
