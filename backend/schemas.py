from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PredictionRequest(BaseModel):
    location_name: str
    lat: float
    lng: float
    rainfall_mm: float
    seismic_activity: float

class PredictionResponse(BaseModel):
    severity: str
    message: str

class AlertSchema(BaseModel):
    id: int
    type: str
    severity: str
    lat: float
    lng: float
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
