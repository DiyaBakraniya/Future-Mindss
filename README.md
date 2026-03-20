# Future-Mindss - AI Disaster Prediction & Response System

AI-based system for disaster prediction and emergency response using real-time data, weather patterns, and ML models. It identifies high-risk zones, sends early alerts, and optimizes rescue operations with smart routing and resource allocation, helping reduce damage and save lives.

A full-stack hackathon-ready project combining FastAPI backend, PostgreSQL, and a vanilla HTML/CSS/JS frontend for real-time disaster prediction and emergency management.

## 🚀 Features
- **Modern Dashboard**: High-quality, clean, glassmorphic UI avoiding standard template looks.
- **AI Prediction (Mock)**: A dummy Scikit-learn RF model predicts disaster severity (`Low`, `Medium`, `High`) based on incoming environmental metrics.
- **Real-time Map Integration**: Uses Leaflet.js with CARTO dark tiles, bypassing the need for paid API keys like Google Maps.
- **Voice Alerts System**: In severe scenarios, utilizes the native Web Speech API to provide verbal alerts.
- **PWA & Offline Support**: Embedded service worker caches the core app shell to handle sub-optimal connectivity scenarios reliably during demos.
- **Emergency Chatbot**: A simple interactive floating panel querying a simulated backend AI assistant to guide affected individuals.

## 🖥️ Setup Instructions

### 1. Database Configuration
No extra setup is required! The project uses a standalone SQLite database (`disaster_db.sqlite`) that is automatically created when you start the backend, avoiding any complicated Postgres configuration during your demo.

### 2. Backend Initialization (FastAPI)
Launch terminal and cd into the `backend` directory.
Run the following to initialize dependencies and boot up the server:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```
*The backend API will run on http://127.0.0.1:8000. It also automatically generates your DB tables via SQLAlchemy.*

### 3. Frontend Initialization 
Launch another terminal and change to the `frontend` directory. 
Start a basic Python web server (recommended over purely double-clicking `index.html` because of how `navigator.serviceWorker` policies behave with file:// URIs):
```bash
cd frontend
python -m http.server 8080
```
Open your browser and navigate to `http://localhost:8080`.

## 🎬 Hackathon Demo Flow
1. **Show the Dashboard**: Open up the frontend dashboard to display the sleek map UI and Active Alerts. 
2. **Trigger Scenario**: On the "Simulate Disaster" panel, input high seismic values (e.g., Richter 6.5 or above).
3. **Execute AI**: Click "Analyze Risk". 
4. **Wow Factors**: The backend will process the payload, predict a "High" risk, return it to the dashboard, render a localized red warning zone on the map, populate the Alerts feed, and importantly—*trigger a Voice Alert* audible to the room.
5. **Chat Interface**: Open the floating blue chatbot bubble. Type "earthquake" or "flood" to showcase the embedded emergency assistance module.
6. **Offline Proof**: Turn off wifi to test the service-worker interception fallback in the chat.

<br>
Build efficiently, Demo brilliantly. Good luck!
