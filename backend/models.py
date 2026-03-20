from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    lat = Column(Float)
    lng = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True) # e.g., flood, earthquake
    severity = Column(String) # low, medium, high
    lat = Column(Float)
    lng = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class PredictionLog(Base):
    __tablename__ = "prediction_logs"
    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    predicted_severity = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
