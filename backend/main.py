from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db
from ml_model import disaster_model
from twilio.rest import Client
import os

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "your_account_sid")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "your_auth_token")
TWILIO_PHONE = os.getenv("TWILIO_PHONE", "your_twilio_number")

# Create the database tables
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not connect to Postgres database for auto-creation. Error: {e}")
    # Don't crash so the demo doesn't fail immediately, we can use in-memory sqlite if needed but this warns us.

app = FastAPI(title="Disaster Prediction API")

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Disaster Prediction & Emergency Response System"}

@app.post("/api/predict", response_model=schemas.PredictionResponse)
def predict_disaster(request: schemas.PredictionRequest, db: Session = Depends(get_db)):
    # Run the mock ML prediction
    severity = disaster_model.predict(request.rainfall_mm, request.seismic_activity)
    
    try:
        # Save the log
        log_entry = models.PredictionLog(
            location_name=request.location_name,
            lat=request.lat,
            lng=request.lng,
            predicted_severity=severity
        )
        db.add(log_entry)
        
        # If High, trigger an alert in DB
        if severity == "High":
            alert_type = "Earthquake" if request.seismic_activity > 4.0 else "Flood"
            alert = models.Alert(
                type=alert_type,
                severity=severity,
                lat=request.lat,
                lng=request.lng
            )
            db.add(alert)
            
        db.commit()
    except Exception as e:
        print(f"Database error on prediction log: {e}")
        # Return fallback response if DB fails during hackathon demo
        return schemas.PredictionResponse(
            severity=severity,
            message=f"Prediction complete (DB bypassed). Predicted risk level: {severity}"
        )
    
    return schemas.PredictionResponse(
        severity=severity,
        message=f"Prediction complete. Predicted risk level: {severity}"
    )

@app.get("/api/alerts", response_model=list[schemas.AlertSchema])
def get_alerts(db: Session = Depends(get_db)):
    try:
        alerts = db.query(models.Alert).order_by(models.Alert.timestamp.desc()).limit(10).all()
        return alerts
    except Exception as e:
        print(f"DB Error fetching alerts: {e}")
        return []

@app.post("/api/send-sms", response_model=schemas.SMSResponse)
def send_sms_alert(request: schemas.SMSRequest):
    try:
        if ACCOUNT_SID != "your_account_sid" and AUTH_TOKEN != "your_auth_token":
            client = Client(ACCOUNT_SID, AUTH_TOKEN)
            message = client.messages.create(
                body=request.message,
                from_=TWILIO_PHONE,
                to=request.phone_number
            )
            print(f"Twilio SMS sent successfully. SID: {message.sid}")
            return schemas.SMSResponse(
                success=True,
                message="✅ Real SMS Sent Successfully"
            )
        else:
            raise ValueError("Twilio credentials not configured.")
    except Exception as e:
        print(f"Twilio credentials down or not configured, switching to simulation mode. Error: {e}")
        # Fallback to Mock SMS
        print(f"[SIMULATION] Sending SMS to {request.phone_number}:\n{request.message}")
        return schemas.SMSResponse(
            success=True,
            message="✅ Simulation: SMS Sent Successfully"
        )

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
