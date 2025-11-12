// Netlify-specific configuration
const API_BASE = '/.netlify/functions/api';
let authToken = null;
let selectedWorker = 'all';
let terminalHistory = [];
let currentServerUrl = '';

// Detect Netlify environment and set server URL
function detectServer() {
    const currentUrl = window.location.origin;
    document.getElementById('serverInfo').textContent = `🌐 SERVER: ${currentUrl}`;
    return currentUrl;
}

async function authenticate() {
    const password = document.getElementById('passwordInput').value;
    const statusDiv = document.getElementById('authStatus');
    
    if (!password) {
        statusDiv.innerHTML = '❌ ACCESS_DENIED: NO_INPUT';
        return;
    }
    
    try {
        // Test authentication with the server
        const response = await fetch(`${API_BASE}/status`, {
            headers: { 'Authorization': `Bearer ${password}` }
        });
        
        if (response.ok) {
            authToken = password;
            document.getElementById('authPanel').style.display = 'none';
            document.getElementById('dashboard').style.display = 'grid';
            statusDiv.innerHTML = '';
            startWorkerUpdates();
            logToTerminal('✅ AUTHENTICATION_SUCCESSFUL');
            logToTerminal('🌐 NETLIFY_SERVERLESS_MODE_ACTIVE');
        } else {
            statusDiv.innerHTML = '❌ ACCESS_VIOLATION: INVALID_CREDENTIALS';
        }
    } catch (error) {
        statusDiv.innerHTML = '❌ NETWORK_ERROR: CANNOT_REACH_SERVER';
    }
}

function startWorkerUpdates() {
    setInterval(updateWorkers, 3000);
    updateWorkers();
}

async function updateWorkers() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE}/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const workers = await response.json();
            displayWorkers(workers);
        } else {
            logToTerminal('❌ AUTHENTICATION_FAILED: REAUTHENTICATE');
        }
    } catch (error) {
        logToTerminal(`❌ NETWORK_ERROR: ${error.message}`);
    }
}

function displayWorkers(workers) {
    const workerList = document.getElementById('workerList');
    const workerSelect = document.getElementById('workerSelect');
    
    workerList.innerHTML = '';
    workerSelect.innerHTML = '<option value="all">BROADCAST_TO_ALL_NODES</option>';
    
    if (Object.keys(workers).length === 0) {
        workerList.innerHTML = '<div class="worker-item scanning"><span class="status-indicator online-dot"></span>NO_WORKERS_DETECTED</div>';
        return;
    }
    
    for (const [id, worker] of Object.entries(workers)) {
        const isOnline = (Date.now() - worker.lastSeen) < 30000;
        const workerItem = document.createElement('div');
        workerItem.className = `worker-item ${isOnline ? 'online' : 'offline'}`;
        workerItem.innerHTML = `
            <span class="status-indicator ${isOnline ? 'online-dot' : 'offline-dot'}"></span>
            <strong>${worker.name}</strong> [${worker.ip}]
            <br><small>CPU: ${worker.cpuUsage}% | STATUS: ${worker.status}</small>
            ${worker.lastOutput ? `<br><small>LAST: ${worker.lastOutput.substring(0, 50)}...</small>` : ''}
        `;
        workerItem.onclick = () => selectWorker(id, worker.name);
        workerList.appendChild(workerItem);
        
        const option = document.createElement('option');
        option.value = id;
        option.textContent = worker.name;
        workerSelect.appendChild(option);
    }
}

function selectWorker(id, name) {
    selectedWorker = id;
    document.getElementById('workerSelect').value = id;
    logToTerminal(`// SELECTED_WORKER: ${name}`);
}

function handleCommandKey(event) {
    if (event.key === 'Enter') {
        executeCommand();
    }
}

async function executeCommand() {
    const command = document.getElementById('commandInput').value;
    const workerId = document.getElementById('workerSelect').value;
    
    if (!command) return;
    
    logToTerminal(`$ ${command} [TO: ${workerId === 'all' ? 'ALL_NODES' : workerId}]`);
    
    try {
        const endpoint = workerId === 'all' ? '/broadcast' : '/command';
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                worker_id: workerId === 'all' ? null : workerId,
                command: command
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            logToTerminal(`// COMMAND_QUEUED: ${result.status}`);
        } else {
            logToTerminal('❌ ERROR: COMMAND_REJECTED');
        }
    } catch (error) {
        logToTerminal(`❌ NETWORK_ERROR: ${error.message}`);
    }
    
    document.getElementById('commandInput').value = '';
}

function quickCommand(command) {
    document.getElementById('commandInput').value = command;
    executeCommand();
}

function emergencyStop() {
    if (confirm('⚠️ CONFIRM_EMERGENCY_STOP?\nTHIS WILL TERMINATE ALL RENDER PROCESSES!')) {
        quickCommand('taskkill /f /im blender.exe & taskkill /f /im maya.exe & taskkill /f /im 3dsmax.exe');
    }
}

function scanWorkers() {
    logToTerminal('// INITIATING_NETWORK_SCAN...');
    updateWorkers();
}

function refreshStatus() {
    updateWorkers();
    logToTerminal('// STATUS_REFRESHED');
}

function logToTerminal(message) {
    const terminal = document.getElementById('terminal');
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.textContent = message;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
    
    terminalHistory.push(message);
    if (terminalHistory.length > 100) {
        terminalHistory.shift();
    }
}

function clearTerminal() {
    document.getElementById('terminal').innerHTML = '';
    terminalHistory = [];
    logToTerminal('// TERMINAL_CLEARED');
}

// Matrix background effect
function createMatrixEffect() {
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    const bg = document.querySelector('.matrix-bg');
    
    setInterval(() => {
        const element = document.createElement('div');
        element.style.cssText = `
            position: absolute;
            top: -20px;
            left: ${Math.random() * 100}%;
            color: #0f0;
            font-size: ${Math.random() * 10 + 10}px;
            opacity: ${Math.random() * 0.5 + 0.1};
            animation: fall ${Math.random() * 2 + 1}s linear forwards;
        `;
        element.textContent = chars[Math.floor(Math.random() * chars.length)];
        bg.appendChild(element);
        
        setTimeout(() => element.remove(), 2000);
    }, 50);
}

// Add falling animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fall {
        to {
            top: 100vh;
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    currentServerUrl = detectServer();
    createMatrixEffect();
    logToTerminal('// SYSTEM_INITIALIZED');
    logToTerminal('// NETLIFY_SERVERLESS_MODE');
});
