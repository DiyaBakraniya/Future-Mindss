const API_BASE = 'http://127.0.0.1:8000/api';
let map;
const synth = window.speechSynthesis;
let routingControl = null;
let currentSafeZones = [];
let safeZoneMarkers = [];

const SCENARIOS = {
    earthquake: { lat: 35.6762, lng: 139.6503, name: "Tokyo, Japan", rain: 0, quake: 7.8, type: "Earthquake" },
    flood: { lat: 25.7617, lng: -80.1918, name: "Miami, FL", rain: 250, quake: 0.5, type: "Flood" },
    cyclone: { lat: 14.5995, lng: 120.9842, name: "Manila, PH", rain: 180, quake: 1.5, type: "Cyclone" }
};

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    populateFutureNews(); 
    fetchAlerts(); 
    setInterval(fetchAlerts, 5000); 
    
    const searchInput = document.getElementById('city-search');
    let searchTimeout;
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if(query.length < 3) {
                document.getElementById('city-suggestions').classList.add('hidden');
                return;
            }
            searchTimeout = setTimeout(() => fetchCities(query), 500);
        });
    }
});

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }).addTo(map);
}

function speakAlert(text) {
    if(synth) {
        synth.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; utterance.pitch = 1.1; synth.speak(utterance);
    }
}

// ------------------------------------
// CITY API SEARCH (Nominatim)
// ------------------------------------
async function fetchCities(query) {
    const suggestionsBox = document.getElementById('city-suggestions');
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        
        suggestionsBox.innerHTML = '';
        if(data.length === 0) { suggestionsBox.classList.add('hidden'); return; }
        
        data.forEach(city => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerText = city.display_name;
            div.onclick = () => selectCity(city.lat, city.lon, city.display_name);
            suggestionsBox.appendChild(div);
        });
        suggestionsBox.classList.remove('hidden');
    } catch(e) { console.error(e); }
}

async function selectCity(lat, lng, fullName) {
    const searchInput = document.getElementById('city-search');
    document.getElementById('city-suggestions').classList.add('hidden');
    
    let shortName = fullName.split(',')[0];
    searchInput.value = shortName; 
    
    // UI Status Loading
    const statusDiv = document.getElementById('city-status-popup');
    statusDiv.classList.remove('hidden');
    statusDiv.innerHTML = `<h4>📍 ${shortName}</h4><p>🔍 Checking risk factors...</p>`;
    speakAlert("Checking risk for your city.");
    
    map.flyTo([lat, lng], 11, { animate: true, duration: 2.0 });
    
    // Generate deterministic AI features
    let fakeRain = (Math.abs(lat) * 3) % 400; 
    let fakeQuake = (Math.abs(lng) % 10); 
    
    const payload = { location_name: shortName, lat: parseFloat(lat), lng: parseFloat(lng), rainfall_mm: fakeRain, seismic_activity: fakeQuake };

    try {
        const res = await fetch(`${API_BASE}/predict`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const result = await res.json();
        updateSMSPreview(shortName, result.severity, "Disaster Analysis");
        setTimeout(() => displayCityPrediction(shortName, lat, lng, result.severity), 1000); // 1s delay for realism
        setTimeout(() => findSafeZones(lat, lng), 1500); 
    } catch(e) {
        // Fallback demo array
        setTimeout(() => {
            let risks = ['Low', 'Medium', 'High'];
            let randomRisk = risks[Math.floor(Math.random()*risks.length)];
            updateSMSPreview(shortName, randomRisk, "Disaster Analysis");
            displayCityPrediction(shortName, lat, lng, randomRisk);
            findSafeZones(lat, lng);
        }, 1000);
    }
}

function displayCityPrediction(name, lat, lng, severity) {
    const statusDiv = document.getElementById('city-status-popup');
    let riskHtml;

    if(severity === 'High') {
        riskHtml = `<div class="risk-level risk-red">⚠️ High Risk Detected</div><p>👉 Possible disaster in next 24h.</p><p>👉 Stay alert.</p>`;
        speakAlert(`Warning. High risk detected for ${name}.`);
        const pulseIcon = L.divIcon({ className: 'pulse-icon', html: '<div class="ring"></div><div class="dot"></div>', iconSize: [0, 0] });
        L.marker([lat, lng], {icon: pulseIcon}).addTo(map).bindPopup(`<b style="color:var(--red); font-size:1.1rem;">High Risk: ${name}</b>`).openPopup();
    } else if (severity === 'Medium') {
        riskHtml = `<div class="risk-level risk-yellow">⚠️ Medium Risk</div><p>👉 Monitoring weather.</p><p>👉 Normal activity is safe.</p>`;
        L.circleMarker([lat, lng], { color: 'var(--yellow)', fillColor: 'var(--yellow)', fillOpacity: 0.6, radius: 15 }).addTo(map).bindPopup(`<b>${name}</b><br>Medium Risk`).openPopup();
    } else {
        riskHtml = `<div class="risk-level risk-green">✅ Low Risk</div><p>👉 No risk detected.</p><p>👉 You are safe.</p>`;
        L.circleMarker([lat, lng], { color: 'var(--green)', fillColor: 'var(--green)', fillOpacity: 0.6, radius: 15 }).addTo(map).bindPopup(`<b>${name}</b><br>Safe`).openPopup();
    }
    
    statusDiv.innerHTML = `<h4>📍 ${name}</h4>${riskHtml}`;
}

function autoDetectLocation() {
    if ("geolocation" in navigator) {
        document.getElementById('city-status-popup').innerHTML = `<h4>📍 Auto-Detect</h4><p>🎯 Locating GPS coordinates...</p>`;
        document.getElementById('city-status-popup').classList.remove('hidden');
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude; const lng = position.coords.longitude;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await res.json();
                let city = data.address.city || data.address.town || data.address.country || "Your Location";
                selectCity(lat, lng, city);
            } catch(e) { selectCity(lat, lng, "Detected Location"); }
        }, (error) => {
            alert("Geolocation failed or denied.");
            document.getElementById('city-status-popup').classList.add('hidden');
        });
    } else { alert("Geolocation not supported."); }
}

// ------------------------------------
// INFO PANELS & DEV SIMULATION
// ------------------------------------
function populateFutureNews() {
    const feed = document.getElementById('news-feed');
    const newsData = [
        { risk: "High", title: "Cyclone expected in Mumbai tomorrow", msg: "Category 5 alert issued.", icon: "🔴", time: "Just now", conf: 98 },
        { risk: "Medium", title: "Heavy rainfall warning", msg: "Jakarta expects intense downpour.", icon: "🟠", time: "2h ago", conf: 82 },
        { risk: "Low", title: "No immediate danger", msg: "Seismic baseline normal in NY.", icon: "🟢", time: "5h ago", conf: 99 },
    ];
    let html = '';
    newsData.forEach(item => {
        html += `<div class="card-item ${item.risk}">
            <div class="card-header">
                <span class="card-title">${item.title}</span>
                <span class="conf-badge conf-${item.risk}">${item.conf}% AI CONF</span>
            </div>
            <div class="card-msg">${item.msg}</div>
            <div class="card-time">⌚ ${item.time}</div>
        </div>`;
    });
    feed.innerHTML = html;
}

async function simulateEvent(type) {
    const data = SCENARIOS[type];
    const payload = { location_name: data.name, lat: data.lat, lng: data.lng, rainfall_mm: data.rain, seismic_activity: data.quake };
    
    // Auto trigger safe zones
    findSafeZones(data.lat, data.lng);
    
    try {
        const res = await fetch(`${API_BASE}/predict`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("API Failed");
        const result = await res.json();
        
        updateSMSPreview(data.name, result.severity, data.type);
        showOnMap(data.lat, data.lng, result.severity, data.name);
        if (result.severity === 'High') triggerWowFeature(data.type, data.name);
        fetchAlerts(); 
    } catch(e) { 
        // Fallback
        updateSMSPreview(data.name, 'High', data.type);
        showOnMap(data.lat, data.lng, 'High', data.name);
        triggerWowFeature(data.type, data.name);
    }
}

function showOnMap(lat, lng, severity, name) {
    map.flyTo([lat, lng], 8, { animate: true, duration: 2.0 });
    if(severity === 'High') {
        const pulseIcon = L.divIcon({ className: 'pulse-icon', html: '<div class="ring"></div><div class="dot"></div>', iconSize: [0, 0] });
        L.marker([lat, lng], {icon: pulseIcon}).addTo(map).bindPopup(`<b style="color:var(--red);font-size:1.1rem">High Risk Detected</b><br>${name}`).openPopup();
    } else {
        const color = severity === 'Medium' ? 'var(--yellow)' : 'var(--green)';
        L.circleMarker([lat, lng], { color: color, fillColor: color, fillOpacity: 0.6, radius: 12 }).addTo(map);
    }
}

function triggerWowFeature(type, location) {
    speakAlert(`Warning: High risk ${type} detected in ${location}. Evacuate immediately.`);
    document.getElementById('global-warning-title').innerText = `⚠️ Exteme Risk: ${type}`;
    document.getElementById('global-warning-overlay').classList.remove('hidden');
    
    // Auto trigger SMS if phone is entered
    const phoneInput = document.getElementById('sms-phone')?.value.trim();
    if (phoneInput && /^\d{10,15}$/.test(phoneInput)) {
        sendSMSAlert();
    }
}

function closeGlobalWarning() { document.getElementById('global-warning-overlay').classList.add('hidden'); synth.cancel(); }

async function fetchAlerts() {
    try {
        const res = await fetch(`${API_BASE}/alerts`);
        if(!res.ok) return;
        const alerts = await res.json();
        
        const feed = document.getElementById('alert-feed');
        if(alerts.length === 0) { feed.innerHTML = '<div style="color: var(--text-sec); padding: 10px;">Monitoring systems nominal.</div>'; return; }
        
        feed.innerHTML = '';
        alerts.forEach(alert => {
            const time = new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let statusObj = getFormatForAlert(alert.type, alert.severity);
            
            const div = document.createElement('div');
            div.className = `card-item ${alert.severity}`;
            div.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${alert.type} Update</span>
                    <span class="severity-badge status-${alert.severity.toLowerCase()}">${alert.severity.toUpperCase()}</span>
                </div>
                <div class="card-msg" style="font-weight:700;">${statusObj.msg}</div>
                <div class="card-time">⌚ ${time}</div>
            `;
            feed.appendChild(div);
        });
    } catch(e) { }
}

function getFormatForAlert(type, severity) {
    if(severity === 'High') return { msg: `${type} → EVACUATE IMMEDIATELY` };
    if(severity === 'Medium') return { msg: `${type} → Stay Alert` };
    return { msg: `${type} → Monitored & Safe` };
}

// ------------------------------------
// SAFE ZONE FINDER
// ------------------------------------
async function findSafeZones(lat, lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    safeZoneMarkers.forEach(m => map.removeLayer(m));
    safeZoneMarkers = [];
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    const safeZonePanel = document.getElementById('safe-zone-panel');
    const safeZoneContent = document.getElementById('safe-zone-content');
    safeZonePanel.classList.remove('hidden');
    safeZoneContent.innerHTML = `<div class="animate-pulse-fast" style="color: var(--blue); padding: 10px; font-weight:bold;">🔍 Scanning for safe zones...</div>`;
    
    let safeZones = [];
    
    try {
        const query = `
            [out:json];
            (
              node["amenity"="hospital"](around:5000,${lat},${lng});
              node["amenity"="shelter"](around:5000,${lat},${lng});
              node["emergency"="assembly_point"](around:5000,${lat},${lng});
            );
            out body 3;
        `;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); 
        
        const res = await fetch(`https://overpass-api.de/api/interpreter`, {
            method: "POST",
            body: query,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        
        data.elements.forEach(el => {
            let type = el.tags?.amenity === 'hospital' ? 'Hospital' : 'Shelter';
            let name = el.tags?.name || `Nearest ${type}`;
            safeZones.push({
                name: name,
                lat: el.lat,
                lng: el.lon,
                type: type,
                dist: map.distance([lat, lng], [el.lat, el.lon])
            });
        });
        
    } catch(e) {
        console.warn("Overpass API failed or timed out, using fallback demo data.");
    }
    
    if(safeZones.length === 0) {
        safeZones = [
            { name: "City Central Hospital", lat: latNum + 0.015, lng: lngNum + 0.015, type: "Hospital", dist: map.distance([lat, lng], [latNum + 0.015, lngNum + 0.015]) },
            { name: "Community Rescue Shelter", lat: latNum - 0.012, lng: lngNum - 0.018, type: "Shelter", dist: map.distance([lat, lng], [latNum - 0.012, lngNum - 0.018]) }
        ];
    }
    
    safeZones.sort((a,b) => a.dist - b.dist);
    currentSafeZones = safeZones.slice(0, 2);
    
    updateSafeZoneUI(lat, lng, currentSafeZones);
    
    currentSafeZones.forEach((sz) => {
        const iconHtml = sz.type === 'Hospital' ? '🏥' : '🏫';
        const className = sz.type === 'Hospital' ? 'hospital-marker' : 'shelter-marker';
        
        const customIcon = L.divIcon({
            className: className,
            html: iconHtml,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
        
        let m = L.marker([sz.lat, sz.lng], {icon: customIcon})
            .addTo(map)
            .bindPopup(`<b style="color:var(--bg-color)">${sz.name}</b><br>${(sz.dist/1000).toFixed(1)} km away`);
            
        safeZoneMarkers.push(m);
    });
}

function updateSafeZoneUI(originLat, originLng, zones) {
    const safeZoneContent = document.getElementById('safe-zone-content');
    if(!zones || zones.length === 0) {
        safeZoneContent.innerHTML = `<div style="color: var(--text-sec); padding: 10px;">No nearby safe zones found.</div>`;
        return;
    }
    
    let html = '';
    zones.forEach((sz, idx) => {
        const isNearest = idx === 0;
        const icon = sz.type === 'Hospital' ? '🏥' : '🏫';
        const distKm = (sz.dist / 1000).toFixed(1);
        
        html += `
            <div class="safe-zone-card ${isNearest ? 'highlight' : ''}">
                <div class="safe-zone-title">${icon} ${sz.name}</div>
                <div class="safe-zone-dist">${distKm} km away</div>
                <button class="safe-route-btn" onclick="drawRouteToSafeZone(${originLat}, ${originLng}, ${sz.lat}, ${sz.lng}, '${sz.name.replace(/'/g, "\\'")}')">
                    🧭 View Route
                </button>
                <div id="route-info-${sz.lat.toString().replace('.','-')}" class="route-info"></div>
            </div>
        `;
    });
    
    html += `<div style="font-size: 0.85rem; color: var(--text-sec); margin-top: 10px; text-align: center;">👉 Automatically suggesting nearest options</div>`;
    safeZoneContent.innerHTML = html;
    
    if(zones.length > 0) {
        drawRouteToSafeZone(originLat, originLng, zones[0].lat, zones[0].lng, zones[0].name);
    }
}

function drawRouteToSafeZone(sLat, sLng, dLat, dLng, name) {
    if (routingControl) {
        map.removeControl(routingControl);
    }
    
    const destId = `route-info-${dLat.toString().replace('.','-')}`;
    speakAlert(`Routing you to ${name}`);
    
    routingControl = L.Routing.control({
        waypoints: [ L.latLng(sLat, sLng), L.latLng(dLat, dLng) ],
        show: false, addWaypoints: false, routeWhileDragging: false,
        fitSelectedRoutes: true, showAlternatives: false,
        lineOptions: { styles: [{color: '#10b981', opacity: 0.8, weight: 6, dashArray: '10, 10'}] },
        createMarker: function() { return null; }
    }).addTo(map);
    
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        const timeVal = Math.round(summary.totalTime / 60);
        const distVal = (summary.totalDistance / 1000).toFixed(1);
        
        document.querySelectorAll('.route-info').forEach(el => el.innerHTML = '');
        const infoEl = document.getElementById(destId);
        if(infoEl) {
            infoEl.innerHTML = `✅ Route Available: ${distVal} km (~${timeVal} mins)`;
        }
    });

    routingControl.on('routingerror', function(e) {
        document.querySelectorAll('.route-info').forEach(el => el.innerHTML = '');
        const infoEl = document.getElementById(destId);
        if(infoEl) {
            infoEl.innerHTML = `✅ Direct Route Generated (Map API Limit)`;
        }
        L.polyline([[sLat, sLng], [dLat, dLng]], {color: '#10b981', weight: 6, dashArray: '10, 10'}).addTo(map);
        map.fitBounds([[sLat, sLng], [dLat, dLng]], {padding: [50, 50]});
    });
}

// ------------------------------------
// SMS ALERT SYSTEM
// ------------------------------------
let currentSMSDetails = { location: 'Unknown', severity: 'Low', type: 'General' };

function updateSMSPreview(location, severity, type) {
    currentSMSDetails = { location, severity, type };
    const previewBox = document.getElementById('sms-preview-msg');
    const bubble = document.querySelector('.sms-bubble');
    if (!previewBox) return;
    
    if (bubble) {
        bubble.className = `sms-bubble severity-${severity.toLowerCase()}`;
    }
    
    if (severity === 'High') {
        previewBox.innerHTML = `⚠️ HIGH RISK ${type.toUpperCase()} detected in ${location}.<br>Evacuate immediately to safe zone.`;
    } else if (severity === 'Medium') {
        previewBox.innerHTML = `⚠️ Medium risk ${type.toLowerCase()} monitored in ${location}.<br>Normal activity is safe, but stay alert.`;
    } else {
        previewBox.innerHTML = `✅ Monitoring normal activity in ${location}.<br>No immediate danger.`;
    }
}

async function sendSMSAlert() {
    const phoneInput = document.getElementById('sms-phone').value.trim();
    const statusMsg = document.getElementById('sms-status-msg');
    const btn = document.getElementById('send-sms-btn');
    
    // Validate phone: 10-15 digits
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phoneInput)) {
        statusMsg.className = 'sms-status error';
        statusMsg.innerText = '❌ Please enter a valid phone number';
        setTimeout(() => { statusMsg.innerText = ''; }, 3000);
        return;
    }
    
    // Loading State
    statusMsg.className = 'sms-status loading';
    statusMsg.innerText = '⏳ Sending alert...';
    btn.disabled = true;
    
    const payload = {
        phone_number: phoneInput,
        message: document.getElementById('sms-preview-msg').innerText
    };
    
    try {
        const res = await fetch(`${API_BASE}/send-sms`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error("API Failed");
        
        const data = await res.json();
        
        if (data.success) {
            statusMsg.className = 'sms-status success';
            statusMsg.innerText = data.message || '✅ Real SMS Sent Successfully';
        } else {
            statusMsg.className = 'sms-status error';
            statusMsg.innerText = data.message || 'SMS failed, switching to simulation mode';
        }
    } catch(e) {
        // Fallback for demo if backend completely fails
        setTimeout(() => {
            statusMsg.className = 'sms-status error';
            statusMsg.innerText = 'SMS failed, switching to simulation mode';
        }, 1200);
    } finally {
        setTimeout(() => { 
            statusMsg.innerText = ''; 
            btn.disabled = false;
        }, 4000);
    }
}
