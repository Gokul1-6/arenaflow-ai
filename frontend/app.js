// ==========================================
// ArenaFlow AI - FIFA 2026 Stadium OS JS
// Frontend Controller contacting Render Backend API
// ==========================================

// Detect backend URL (Local vs Render Production)
// Replace the Render URL with your actual deployed Render service URL after deployment.
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://arenaflow-ai-backend.onrender.com';

// Global Telemetry State
let activeView = 'ops';
let currentLanguage = 'en';
let accessibilityActive = false;
let globalEcoPoints = 0;
let selectedZoneId = null;

// Initial App Setup
document.addEventListener("DOMContentLoaded", () => {
    // Current Time Clock
    setInterval(updateTime, 1000);
    updateTime();

    // Load initial data from Backend API
    loadIncidents();
    syncTelemetry();
    
    // Poll telemetry updates from Backend simulation every 3 seconds
    setInterval(syncTelemetry, 3000);
});

// Update Header Clock
function updateTime() {
    const timeElement = document.getElementById("current-time");
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString();
    }
}

// Sync match stats & telemetry cards from Backend Express Server
async function syncTelemetry() {
    try {
        const response = await fetch(`${API_BASE}/api/match`);
        const data = await response.json();

        // Update live match badge
        document.getElementById("header-match-time").textContent = `${data.minute}'`;
        document.getElementById("header-match-score").textContent = data.score;
        document.getElementById("header-match-teams").textContent = data.teams;

        // Update stats cards
        document.getElementById("ops-stat-attendance").textContent = `${data.attendance.toLocaleString()} / 80,000`;
        
        const incidentsCountEl = document.getElementById("ops-stat-incidents");
        incidentsCountEl.textContent = `${data.activeIncidents} Active`;
        if (data.activeIncidents === 0) {
            incidentsCountEl.className = "text-green";
            incidentsCountEl.parentElement.querySelector(".stat-meta").textContent = "All stadium parameters operating normally";
        } else {
            incidentsCountEl.className = "text-red";
            incidentsCountEl.parentElement.querySelector(".stat-meta").textContent = "Mitigation plans active in database";
        }

        document.getElementById("ops-stat-gate").textContent = `${data.gateTransitTime} min`;

        // If a zone is currently selected, refresh its details from backend
        if (selectedZoneId) {
            refreshSelectedZoneDetails();
        }
    } catch (error) {
        console.error("Error syncing telemetry with backend API:", error);
    }
}

// Load incident list from Backend API
async function loadIncidents() {
    try {
        const response = await fetch(`${API_BASE}/api/incidents`);
        const incidents = await response.json();
        renderIncidentsTable(incidents);
    } catch (error) {
        console.error("Error loading incidents list:", error);
    }
}

// Render incident log table
function renderIncidentsTable(incidents) {
    const tableBody = document.getElementById("incident-log-body");
    tableBody.innerHTML = "";

    incidents.forEach(inc => {
        const row = document.createElement("tr");
        row.id = `incident-${inc.id}`;
        row.className = `incident-row ${inc.rowClass}`;
        
        let statusBadge = `<span class="status-tag pulse-tag">Under Mitigation</span>`;
        let actionButton = `<button class="btn btn-sm btn-primary" onclick="resolveIncident(${inc.id})">Apply AI Mitigation</button>`;

        if (inc.resolved) {
            statusBadge = `<span class="text-green"><i class="fa-solid fa-circle-check"></i> Resolved (Mitigated)</span>`;
            actionButton = `<span class="text-dim"><i class="fa-solid fa-check"></i> Applied</span>`;
        }

        row.innerHTML = `
            <td>#INC-${800 + inc.id}</td>
            <td>${inc.zone}</td>
            <td><span class="badge ${inc.priorityClass}">${inc.priority}</span></td>
            <td>${inc.desc}</td>
            <td>${inc.mitigation}</td>
            <td>${statusBadge}</td>
            <td>${actionButton}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Switch view between Ops and Fan
function switchView(view) {
    activeView = view;
    
    document.getElementById("view-ops").classList.remove("active-view");
    document.getElementById("view-fan").classList.remove("active-view");
    
    document.getElementById("nav-ops").classList.remove("active");
    document.getElementById("nav-fan").classList.remove("active");

    if (view === 'ops') {
        document.getElementById("view-ops").classList.add("active-view");
        document.getElementById("nav-ops").classList.add("active");
    } else {
        document.getElementById("view-fan").classList.add("active-view");
        document.getElementById("nav-fan").classList.add("active");
    }
}

// Map selection click
async function selectZone(zoneId) {
    selectedZoneId = zoneId;

    // Reset selected states on SVG map
    const zones = document.querySelectorAll(".map-zone");
    zones.forEach(z => z.classList.remove("selected"));

    const targetZone = document.getElementById(`zone-${zoneId}`);
    if (targetZone) {
        targetZone.classList.add("selected");
    }

    refreshSelectedZoneDetails();
}

// Refresh active zone panel telemetry
async function refreshSelectedZoneDetails() {
    if (!selectedZoneId) return;

    try {
        const response = await fetch(`${API_BASE}/api/zones`);
        const zones = await response.json();
        const details = zones[selectedZoneId];

        if (details) {
            document.getElementById("zone-details-empty").classList.add("hidden");
            document.getElementById("zone-details-content").classList.remove("hidden");

            document.getElementById("zd-name").textContent = details.name;
            document.getElementById("zd-status").textContent = details.status;
            
            const statusBadge = document.getElementById("zd-status");
            statusBadge.className = "badge";
            statusBadge.classList.add(details.statusClass);

            document.getElementById("zd-attendance").textContent = details.attendance;
            document.getElementById("zd-capacity").textContent = details.capacity;
            
            const queueEl = document.getElementById("zd-queue");
            queueEl.textContent = details.queue;
            
            if (selectedZoneId === 'east') {
                queueEl.className = "text-red";
            } else if (selectedZoneId === 'north' || selectedZoneId === 'west') {
                queueEl.className = "text-yellow";
            } else {
                queueEl.className = "text-green";
            }

            document.getElementById("zd-operator").textContent = details.operator;
            document.getElementById("zd-energy").textContent = details.energy;
            document.getElementById("zd-ai-text").textContent = details.aiText;
        }
    } catch (error) {
        console.error("Error updating selected zone stats from backend:", error);
    }
}

// Trigger dispatch rerouting plan from map widget
async function generateDispatachPlan() {
    const chatContainer = document.getElementById("ops-chat-container");
    addChatMessage(chatContainer, "system", "SYSTEM INSTRUCTION", "Deploying dynamic rerouting protocol for East Stand. Accessing digital signage grids...");
    
    try {
        const response = await fetch(`${API_BASE}/api/incidents/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 1 })
        });
        const data = await response.json();

        if (data.success) {
            setTimeout(() => {
                addChatMessage(chatContainer, "ai", "FIFA Ops CoPilot", "Rerouting signage updated. Gate A is now flashing GREEN eco-pathway markers. Queue wait time telemetry recalculated.");
                
                // Refresh map zone telemetry and incidents list
                refreshSelectedZoneDetails();
                renderIncidentsTable(data.incidents);
                syncTelemetry();
            }, 1000);
        }
    } catch (error) {
        console.error("Error deploying dispatch rerouting plan:", error);
    }
}

// Start/Stop Match Simulation on Server
async function toggleMatchState() {
    const btn = document.getElementById("btn-toggle-match");
    
    try {
        const response = await fetch(`${API_BASE}/api/simulation/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            if (data.simulationActive) {
                btn.innerHTML = `<i class="fa-solid fa-pause"></i> Pause Match Simulation`;
                btn.className = "btn btn-green btn-full";
            } else {
                btn.innerHTML = `<i class="fa-solid fa-play"></i> Start Match Simulation`;
                btn.className = "btn btn-primary btn-full";
            }
        }
    } catch (error) {
        console.error("Error toggling match state simulation on server:", error);
    }
}

// Trigger Random Incident on Server
async function triggerRandomIncident() {
    try {
        const response = await fetch(`${API_BASE}/api/incidents/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            // Reload incident log table
            loadIncidents();
            
            // Notify in Ops Chat
            const chatContainer = document.getElementById("ops-chat-container");
            addChatMessage(chatContainer, "system", "CRITICAL TELEMETRY INCIDENT DETECTED", `${data.newIncident.desc} Recommended mitigation plan queued for approval.`);
            
            // Refresh stats
            syncTelemetry();
        }
    } catch (error) {
        console.error("Error triggering random incident on server:", error);
    }
}

// Resolve Incidents via API
async function resolveIncident(id) {
    try {
        const response = await fetch(`${API_BASE}/api/incidents/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await response.json();

        if (data.success) {
            renderIncidentsTable(data.incidents);
            syncTelemetry();
            if (selectedZoneId) {
                refreshSelectedZoneDetails();
            }
        }
    } catch (error) {
        console.error("Error resolving incident:", error);
    }
}

// Clear Resolved rows in UI
function clearResolvedIncidents() {
    loadIncidents();
}

// Operations Chat: Send Message to API
async function sendOpsMessage() {
    const input = document.getElementById("ops-chat-input");
    const query = input.value.trim();
    if (!query) return;

    const chatContainer = document.getElementById("ops-chat-container");
    addChatMessage(chatContainer, "user", "Gokul A. (Director)", query);
    input.value = "";

    try {
        const response = await fetch(`${API_BASE}/api/chat/ops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await response.json();

        setTimeout(() => {
            addChatMessage(chatContainer, "ai", "FIFA Ops CoPilot", data.response);
        }, 500);
    } catch (error) {
        console.error("Error sending ops chat query:", error);
    }
}

// Quick click queries for Ops Chat
function quickOpsQuestion(question) {
    const input = document.getElementById("ops-chat-input");
    input.value = question;
    sendOpsMessage();
}

// Fan Chat: Send Message to API
async function sendFanMessage() {
    const input = document.getElementById("fan-chat-input");
    const query = input.value.trim();
    if (!query) return;

    const chatContainer = document.getElementById("fan-chat-container");
    addChatMessage(chatContainer, "user", "You (Fan)", query);
    input.value = "";

    try {
        const response = await fetch(`${API_BASE}/api/chat/fan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await response.json();

        setTimeout(() => {
            addChatMessage(chatContainer, "ai", "AI Concierge", data.response);
        }, 500);
    } catch (error) {
        console.error("Error sending fan chat query:", error);
    }
}

// Quick click queries for Fan Chat
function quickFanQuestion(question) {
    const input = document.getElementById("fan-chat-input");
    input.value = question;
    sendFanMessage();
}

// Chat helper bubble injector
function addChatMessage(container, type, sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${type === 'system' ? 'ai' : type}`;
    
    let avatarIcon = 'fa-robot';
    if (type === 'user') avatarIcon = 'fa-user';
    if (type === 'system') avatarIcon = 'fa-triangle-exclamation';
    
    if (sender === 'AI Concierge') avatarIcon = 'fa-user-tie';

    messageDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid ${avatarIcon}"></i></div>
        <div class="msg-content">
            <span class="msg-sender">${sender}</span>
            <p>${text}</p>
        </div>
    `;
    container.appendChild(messageDiv);
    scrollChat(container.id);
}

// Scroll chat container to bottom
function scrollChat(id) {
    const container = document.getElementById(id);
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Wayfinding routing logic (Client side UI renderer)
function generateFanRoute() {
    const gate = document.getElementById("fan-gate").value;
    const seat = document.getElementById("fan-seat").value.trim().toUpperCase();
    const resultPanel = document.getElementById("wayfinder-result");
    const directionsEl = document.getElementById("route-directions-content");
    const accessibilityMsg = document.getElementById("route-accessibility-msg");

    if (!seat) return;

    resultPanel.classList.remove("hidden");

    let routeHTML = "";
    
    if (accessibilityActive) {
        routeHTML = `
            <ol>
                <li>Enter via <strong>${gate} Accessible Entry Ramp</strong>.</li>
                <li>Go through step-free RFID scanning Gate 1A.</li>
                <li>Turn immediately left in Concourse and take <strong>Elevator 4</strong> to Level 1.</li>
                <li>Follow the yellow tactile flooring indicators towards wheelchair platform row.</li>
                <li>Your seat bay <strong>${seat} wheelchair seating zone</strong> is directly in front.</li>
            </ol>
        `;
        accessibilityMsg.innerHTML = `<i class="fa-solid fa-wheelchair"></i> Wheelchair routing active: step-free routes, elevators and ramp waypoints optimized.`;
        accessibilityMsg.style.background = "rgba(0, 242, 254, 0.08)";
        accessibilityMsg.style.borderColor = "rgba(0, 242, 254, 0.2)";
        accessibilityMsg.style.color = "var(--accent-cyan)";
    } else {
        routeHTML = `
            <ol>
                <li>Enter via <strong>${gate}</strong> and pass standard bag scanning.</li>
                <li>Head straight past the World Cup Merchandise Stall.</li>
                <li>Use <strong>Escalator 2</strong> to ascend to Level 1 Concourse.</li>
                <li>Turn right and locate Tunnel 14.</li>
                <li>Enter seating rows, your seat <strong>${seat}</strong> will be down the third aisle.</li>
            </ol>
        `;
        accessibilityMsg.innerHTML = `<i class="fa-solid fa-leaf"></i> Eco-Routing advice: Walking route. Escalators active. Recyclable waste bin at Escalator 2.`;
        accessibilityMsg.style.background = "rgba(16, 185, 129, 0.08)";
        accessibilityMsg.style.borderColor = "rgba(16, 185, 129, 0.2)";
        accessibilityMsg.style.color = "var(--accent-green)";
    }

    directionsEl.innerHTML = routeHTML;
}

// Eco points tracker
function addEcoPoints(points, action) {
    globalEcoPoints += points;
    if (globalEcoPoints > 300) globalEcoPoints = 300;

    const pointsText = document.getElementById("fan-eco-points");
    pointsText.textContent = `${globalEcoPoints} pts`;

    const progressPercent = (globalEcoPoints / 300) * 100;
    document.getElementById("fan-eco-progress").style.width = `${progressPercent}%`;

    const badgeEl = document.getElementById("fan-eco-badge");
    if (globalEcoPoints >= 250) {
        badgeEl.textContent = "Level 4: FIFA World Cup Gold Eco-Champion 🏆";
        badgeEl.style.color = "var(--accent-gold)";
    } else if (globalEcoPoints >= 150) {
        badgeEl.textContent = "Level 3: Silver Eco-Saver 🥈";
        badgeEl.style.color = "var(--accent-cyan)";
    } else if (globalEcoPoints >= 50) {
        badgeEl.textContent = "Level 2: Green Supporter 🥉";
        badgeEl.style.color = "var(--accent-green)";
    } else {
        badgeEl.textContent = "Level 1: Novice Fan Eco-Saver";
        badgeEl.style.color = "var(--text-dim)";
    }

    const chatContainer = document.getElementById("fan-chat-container");
    addChatMessage(chatContainer, "system", "ECO POINTS EARNED!", `You gained +${points} pts for using <strong>${action}</strong>! Keep it up to earn exclusive digital avatars.`);
}

// Language selector translations logic
function changeLanguage() {
    const langSelect = document.getElementById("lang-select");
    currentLanguage = langSelect.value;

    const chatContainer = document.getElementById("fan-chat-container");

    if (currentLanguage === 'ta') {
        addChatMessage(chatContainer, "ai", "AI Concierge", "வணக்கம்! நான் உங்களுக்கு தமிழில் உதவ முடியும். 'என் இருக்கைக்கு வழி?' அல்லது 'metro ரயில்' போன்ற கேள்விகளை நீங்கள் தமிழில் தட்டச்சு செய்யலாம்.");
        document.querySelector(".fan-header-intro h2").textContent = "Estadio Azteca ரசிகர் உதவி மையத்திற்கு வரவேற்கிறோம்";
        document.querySelector(".fan-header-intro p").textContent = "FIFA உலகக் கோப்பை 2026-ன் போக்குவரத்து, இருக்கை வழிகள் மற்றும் சுற்றுச்சூழல் பாதுகாப்பிற்கு உதவும் GenAI தளம்.";
    } else if (currentLanguage === 'es') {
        addChatMessage(chatContainer, "ai", "AI Concierge", "¡Hola! Estoy listo para asistirte en español. Puedes preguntarme sobre tu asiento, transporte público o accesibilidad.");
        document.querySelector(".fan-header-intro h2").textContent = "Bienvenido a Estadio Azteca Fan Companion";
        document.querySelector(".fan-header-intro p").textContent = "Tecnología GenAI para optimizar su transporte, ubicación de asientos y contribución sostenible.";
    } else if (currentLanguage === 'fr') {
        addChatMessage(chatContainer, "ai", "AI Concierge", "Bonjour! Je suis ravi de vous guider en français. N'hésitez pas à me poser des questions sur votre bloc de sièges.");
        document.querySelector(".fan-header-intro h2").textContent = "Bienvenue sur Estadio Azteca Fan Companion";
        document.querySelector(".fan-header-intro p").textContent = "Propulsé par l'IA générative pour vous guider dans vos transports, votre placement et vos contributions éco-responsables.";
    } else {
        addChatMessage(chatContainer, "ai", "AI Concierge", "Language switched to English. You can search directions or ask match operations questions.");
        document.querySelector(".fan-header-intro h2").textContent = "Welcome to Estadio Azteca Fan Companion";
        document.querySelector(".fan-header-intro p").textContent = "Powered by Generative AI to guide your transit, seating navigation, sustainability contribution, and immediate help.";
    }
}

// Accessibility Toggle
function toggleAccessibility() {
    const checkbox = document.getElementById("access-mode");
    accessibilityActive = checkbox.checked;
    
    if (accessibilityActive) {
        document.body.classList.add("accessibility-active");
    } else {
        document.body.classList.remove("accessibility-active");
    }

    const resultPanel = document.getElementById("wayfinder-result");
    if (!resultPanel.classList.contains("hidden")) {
        generateFanRoute();
    }
}
