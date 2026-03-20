from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db
from ml_model import disaster_model
from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "your_account_sid")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "your_auth_token")
TWILIO_PHONE = os.getenv("TWILIO_PHONE", "your_twilio_number")

# Create the database tables
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not connect to Postgres database for auto-creation. Error: {e}")
    # Don't crash so the demo doesn't fail immediately, we can use in-memory sqlite if needed but this warns us.

... [skip to the SMS part, actually let's just use multi_replace or start from line 7 to line 110? No, let's use `multi_replace_file_content` or just `replace_file_content` for specific lines. I'll abort this and formulate it better later if needed. Wait, I can just replace the whole file? No, it's 123 lines, better to use `multi_replace_file_content`]

@app.post("/api/chat", response_model=schemas.ChatResponse)
def emergency_chat(request: schemas.ChatRequest):
    msg = request.message.lower()
    reply = "I'm a dummy emergency assistant. Please contact 911 in an actual emergency."
    if "flood" in msg or "water" in msg:
        reply = "For floods: Move to higher ground immediately. Do not walk or drive through flood waters."
    elif "earthquake" in msg or "shake" in msg:
        reply = "For earthquakes: Drop, Cover, and Hold On. Stay away from glass and heavy furniture."
    elif "help" in msg or "safe" in msg:
        reply = "Are you safe? I can provide safe route suggestions to nearest shelters."
    
    return schemas.ChatResponse(reply=reply)
