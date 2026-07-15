// ==========================================
// ArenaFlow AI - Node.js/Express Backend Server
// FIFA 2026 Smart Stadium Operations API
// ==========================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*' // Allow all origins for easier hackathon testing/deployment
}));
app.use(express.json());

// Global Telemetry & Match Simulation State
let matchMinute = 74;
let scoreArgentina = 2;
let scoreFrance = 1;
let totalAttendance = 78432;
let activeIncidentsCount = 2;

// Incidents Log (Stored in Server Memory)
let incidents = [
    {
        id: 1,
        zone: "East Stand (Gate B)",
        priority: "CRITICAL",
        priorityClass: "badge-danger",
        desc: "Queue wait time exceeded 9 minutes. Potential bottle-necking.",
        mitigation: "Deploy fan-rerouting guides to Gate A; update Live Fan app alerts.",
        status: "Under Mitigation",
        rowClass: "row-danger",
        resolved: false
    },
    {
        id: 2,
        zone: "Parking Lot North",
        priority: "MEDIUM",
        priorityClass: "badge-warning",
        desc: "Shuttle bus charging hub grid surcharge warning.",
        mitigation: "Shed HVAC cooling in Parking support rooms; route excess solar reserve.",
        status: "Under Mitigation",
        rowClass: "row-warning",
        resolved: false
    }
];

// Zone Database State
const zoneDatabase = {
    parking: {
        name: "North Parking Hub & Transit Zone",
        status: "Normal Operations",
        statusClass: "badge-green",
        attendance: "3,250 vehicles",
        capacity: "5,000 slots",
        queue: "1.5 mins",
        operator: "Nominal shuttle dispatch",
        energy: "98.2% (Solar Canopy Active)",
        aiText: "Parking grid balance is highly optimized. Solar array is returning 14kW excess capacity to central stadium battery storage. Crowd flow to gates is smooth."
    },
    north: {
        name: "North Stand (Tiers 1-3)",
        status: "Moderate Capacity",
        statusClass: "badge-warning",
        attendance: "19,250 fans",
        capacity: "20,000 max",
        queue: "3.2 mins",
        operator: "All concessions open (12/12)",
        energy: "93.1% (HVAC Smart Eco Mode)",
        aiText: "Attendance is stable. Concessions queue in Concourse C is currently 4 minutes. AI recommends broadcasting digital coupon deals for East concessions to balance fan queues."
    },
    south: {
        name: "South Stand (Family Zone)",
        status: "Low Congestion",
        statusClass: "badge-green",
        attendance: "12,120 fans",
        capacity: "15,000 max",
        queue: "2.1 mins",
        operator: "High-contrast wayfinding online",
        energy: "96.4% (LED Surcharge Off)",
        aiText: "Family Stand is performing outstandingly. Noise levels are nominal. Accessibility volunteers are fully deployed at elevators 2 and 3."
    },
    west: {
        name: "West Stand & Gate A Entrance",
        status: "Moderate Congestion",
        statusClass: "badge-warning",
        attendance: "18,630 fans",
        capacity: "20,000 max",
        queue: "4.5 mins",
        operator: "Security check lines: 5 open",
        energy: "92.0% (Smart ventilation active)",
        aiText: "Gate A lines have stabilized after dispatching a second cohort of stewards at 65'. Dynamic digital signage is active, showing standard queue notices."
    },
    east: {
        name: "East Stand & Gate B Entrance",
        status: "Critical Capacity",
        statusClass: "badge-danger",
        attendance: "25,182 fans",
        capacity: "25,000 max",
        queue: "9.8 mins",
        operator: "All security turnstiles active (8/8)",
        energy: "91.4% (HVAC high demand)",
        aiText: "Gate B ticket turnstiles are running at maximum capacity. Crowd bottlenecking spotted at Concourse B entry. AI recommends immediate deployment of fan-rerouting guides to West Gate A."
    }
};

// Background Simulation Ticker (runs every 3 seconds)
let isSimulating = true;
setInterval(() => {
    if (!isSimulating) return;

    // Increment Match Minute
    if (matchMinute < 90) {
        matchMinute++;
        
        // Random match actions
        if (matchMinute === 82) {
            scoreArgentina++;
        }
    } else {
        // Reset match time for loop simulation after 90'
        matchMinute = 74;
        scoreArgentina = 2;
        scoreFrance = 1;
    }

    // Fluctuate attendance
    totalAttendance += Math.floor(Math.random() * 20) - 10;
    if (totalAttendance > 80000) totalAttendance = 80000;
    if (totalAttendance < 70000) totalAttendance = 70000;

    // Slightly fluctuate gate wait times
    let newEastQueue = parseFloat(zoneDatabase.east.queue) + (Math.random() * 0.4 - 0.2);
    if (newEastQueue < 3) newEastQueue = 3;
    zoneDatabase.east.queue = `${newEastQueue.toFixed(1)} mins`;

}, 3000);

// API Endpoints

// 1. Health Status
app.get('/api/status', (req, res) => {
    res.json({
        status: "online",
        stadium: "Estadio Azteca",
        simulationActive: isSimulating,
        time: new Date().toLocaleTimeString()
    });
});

// 2. Current Match Live Telemetry
app.get('/api/match', (req, res) => {
    res.json({
        minute: matchMinute,
        teams: "Argentina vs France",
        score: `${scoreArgentina} - ${scoreFrance}`,
        attendance: totalAttendance,
        activeIncidents: activeIncidentsCount,
        gateTransitTime: parseFloat(zoneDatabase.east.queue).toFixed(1)
    });
});

// 3. Zone Telemetry
app.get('/api/zones', (req, res) => {
    res.json(zoneDatabase);
});

// 4. Get Incident Log
app.get('/api/incidents', (req, res) => {
    res.json(incidents);
});

// 5. Resolve Incident
app.post('/api/incidents/resolve', (req, res) => {
    const { id } = req.body;
    const incidentIndex = incidents.findIndex(inc => inc.id === parseInt(id));

    if (incidentIndex !== -1) {
        incidents[incidentIndex].resolved = true;
        incidents[incidentIndex].status = "Resolved (Mitigated)";
        
        // Recalculate active incident count
        activeIncidentsCount = incidents.filter(inc => !inc.resolved).length;

        // Custom action for East Stand Gate B
        if (id === 1) {
            zoneDatabase.east.queue = "5.4 mins";
            zoneDatabase.east.status = "Moderate Crowd Control";
            zoneDatabase.east.statusClass = "badge-warning";
            zoneDatabase.east.aiText = "Gate B queue times have halved. Dynamic rerouting is running smoothly.";
        }

        res.json({ success: true, activeIncidentsCount, incidents });
    } else {
        res.status(404).json({ success: false, error: "Incident not found" });
    }
});

// 6. Trigger Random Incident
app.post('/api/incidents/trigger', (req, res) => {
    const newId = incidents.length + 1;
    
    const incidentTemplates = [
        {
            zone: "North Stand (Tier 2)",
            priority: "MEDIUM",
            priorityClass: "badge-warning",
            desc: "RFID Ticket scanner Gate C hardware timeout. 15% slow ticketing rate.",
            mitigation: "Reset Gate C RFID local network switches, divert fans to ticketing point C3.",
            rowClass: "row-warning"
        },
        {
            zone: "South Stand Concourse",
            priority: "CRITICAL",
            priorityClass: "badge-danger",
            desc: "Sensory Room air conditioning flow rate error. High heat index warning.",
            mitigation: "Cycle emergency coolant block B; boost fan rate to 100%.",
            rowClass: "row-danger"
        }
    ];

    const template = incidentTemplates[Math.floor(Math.random() * incidentTemplates.length)];
    const newIncident = {
        id: newId,
        zone: template.zone,
        priority: template.priority,
        priorityClass: template.priorityClass,
        desc: template.desc,
        mitigation: template.mitigation,
        status: "Under Mitigation",
        rowClass: template.rowClass,
        resolved: false
    };

    incidents.unshift(newIncident);
    activeIncidentsCount = incidents.filter(inc => !inc.resolved).length;

    res.json({ success: true, newIncident, activeIncidentsCount });
});

// 7. Operations Copilot AI Assistant
app.post('/api/chat/ops', (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query parameter" });

    const normalizedQuery = query.toLowerCase().replace(/[?,.]/g, "").trim();
    let responseText = `<strong>FIFA AI Copilot:</strong><br>Processed query: "${query}". Grid parameters look nominal. Attendance is ${totalAttendance.toLocaleString()}. Send additional directives if necessary.`;

    const opsAIResponses = {
        "show gate b crowd control plan": `<strong>FIFA AI Copilot Analysis:</strong><br>
        Gate B congestion is high due to rapid public transport arrivals.
        <br><br><strong>Mitigation Plan:</strong><br>
        1. Reroute incoming spectator groups to West Gate A.<br>
        2. Set dynamic LED route guide markers to blue/alternate pathway.<br>
        3. Dispatch 4 local stadium marshals to coordinate concourse flow.`,
        
        "analyze energy saving footprint": `<strong>FIFA AI Copilot Sustainability Audit:</strong><br>
        Stadium smart grid operating at <strong>94.8%</strong> efficiency.
        <br><br><strong>Performance Breakdown:</strong><br>
        - Solar canopy outputs: 112 kW/h.<br>
        - Water recycling: 100% recycling loops nominal.<br>
        - Carbon offset index: 12.4% reduction via HVAC standby timers in unused parking decks.`,
        
        "emergency evacuation routes": `<strong>CRITICAL evacuation pathways:</strong><br>
        - North Stand exits through Plaza C.<br>
        - South Stand exits through Plaza D.<br>
        - East/West Stands exit through gates A & B directly to secure perimeter shuttle loops.`,
        
        "help": "Options include: 'Show Gate B crowd control plan', 'Analyze energy saving footprint', or 'Emergency evacuation routes'."
    };

    for (const key in opsAIResponses) {
        if (normalizedQuery.includes(key)) {
            responseText = opsAIResponses[key];
            break;
        }
    }

    res.json({ response: responseText });
});

// 8. Fan Concierge AI Assistant
app.post('/api/chat/fan', (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query parameter" });

    const normalizedQuery = query.toLowerCase().replace(/[?,.()]/g, "").trim();
    let responseText = `<strong>AI Fan Concierge:</strong><br>Thank you! Processing your stadium query. Please specify your seat section (e.g. SEC-102) for custom direction planning or accessibility options.`;

    const fanAIResponses = {
        "tamil: sec 102 path control? (என் இருக்கைக்கு வழி?)": `<strong>வணக்கம்! (Hello!)</strong><br>
        Section 102-க்கு செல்ல வழி இதோ:<br>
        1. மேற்கு வாயில் <strong>(Gate A)</strong> வழியாக நுழையவும்.<br>
        2. நேராகச் சென்று Concourse 1-ஐ அடையவும்.<br>
        3. வலதுபுறமாகத் திரும்பி Escalator 2-ஐப் பயன்படுத்தவும்.<br>
        4. <strong>Block 102</strong> வாயிலில் உங்கள் டிக்கெட்டைக் காட்டவும்.`,
        
        "where is the nearest wheelchair entrance?": `<strong>Wheelchair-Accessible Route:</strong><br>
        Enter via <strong>Gate A (West Ground Entrance)</strong>, which features ramp gates and is 15 meters from Elevator 1, leading straight to the dedicated row 100 wheelchair bays.`,
        
        "how do i take the metro after the match?": `<strong>Metro transit directions:</strong><br>
        - Metro Line 3 station is at East Stand Gate B.<br>
        - <em>Tip:</em> Walk 5 mins north to Metro Station Plaza North. It has 40% less line crowding and faster dispatch boarding.`,
        
        "tamil": `<strong>வணக்கம்!</strong> நான் உங்களுக்கு தமிழில் உதவ முடியும். 'என் இருக்கைக்கு வழி?', 'wheelchair நுழைவாயில் எங்கே?', அல்லது 'மெட்ரோ எங்கே உள்ளது?' போன்ற கேள்விகளைக் கேட்கலாம்.`,
        
        "help": "Ask me about seat routing ('Sec 102 path'), wheelchair access ('wheelchair entrance'), or transit directions ('Metro transit'). I support Tamil (தமிழ்), English, and Spanish!"
    };

    if (normalizedQuery.includes("tamil") || normalizedQuery.includes("என் இருக்கைக்கு வழி") || normalizedQuery.includes("இருக்கை") || normalizedQuery.includes("தமிழ்")) {
        responseText = fanAIResponses["tamil: sec 102 path control? (என் இருக்கைக்கு வழி?)"];
    } else {
        for (const key in fanAIResponses) {
            if (normalizedQuery.includes(key)) {
                responseText = fanAIResponses[key];
                break;
            }
        }
    }

    res.json({ response: responseText });
});

// Toggle simulation activity for testing
app.post('/api/simulation/toggle', (req, res) => {
    isSimulating = !isSimulating;
    res.json({ success: true, simulationActive: isSimulating });
});

// Listen
app.listen(PORT, () => {
    console.log(`ArenaFlow AI Backend running on port ${PORT}`);
});
