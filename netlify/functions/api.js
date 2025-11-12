const crypto = require('crypto');

// In-memory storage (will reset on function cold start)
let WORKERS = {};
const PASSWORD_HASH = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // Your hash

// Clean up old workers every 30 seconds
setInterval(() => {
  const now = Date.now();
  Object.keys(WORKERS).forEach(workerId => {
    if (now - WORKERS[workerId].lastSeen > 30000) { // 30 seconds timeout
      delete WORKERS[workerId];
    }
  });
}, 30000);

exports.handler = async (event, context) => {
  const path = event.path.replace(/\.netlify\/functions\/[^/]+/, '');
  const method = event.httpMethod;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Authentication for protected routes
  const protectedRoutes = ['/status', '/command', '/broadcast', '/worker-update'];
  if (protectedRoutes.includes(path) && !authenticate(event)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required' })
    };
  }

  try {
    // Route handling
    if (path === '/status' && method === 'GET') {
      return getStatus();
    } else if (path === '/command' && method === 'POST') {
      return handleCommand(event);
    } else if (path === '/broadcast' && method === 'POST') {
      return handleBroadcast(event);
    } else if (path === '/worker-connect' && method === 'POST') {
      return handleWorkerConnect(event);
    } else if (path === '/worker-update' && method === 'POST') {
      return handleWorkerUpdate(event);
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function authenticate(event) {
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return hash === PASSWORD_HASH;
}

function getStatus() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(WORKERS)
  };
}

async function handleCommand(event) {
  const body = JSON.parse(event.body);
  const { worker_id, command } = body;

  if (WORKERS[worker_id]) {
    WORKERS[worker_id].pendingCommand = command;
    WORKERS[worker_id].lastCommand = Date.now();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'command_queued', worker_id })
    };
  } else {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Worker not found' })
    };
  }
}

async function handleBroadcast(event) {
  const body = JSON.parse(event.body);
  const { command } = body;

  Object.keys(WORKERS).forEach(workerId => {
    WORKERS[workerId].pendingCommand = command;
    WORKERS[workerId].lastCommand = Date.now();
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'broadcast_queued', count: Object.keys(WORKERS).length })
  };
}

async function handleWorkerConnect(event) {
  const body = JSON.parse(event.body);
  const { worker_id, worker_name, system_info } = body;

  WORKERS[worker_id] = {
    name: worker_name,
    ip: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
    status: 'online',
    lastSeen: Date.now(),
    cpuUsage: system_info?.cpu_usage || 0,
    pendingCommand: null,
    lastOutput: '',
    systemInfo: system_info,
    connectedAt: new Date().toISOString()
  };

  console.log(`Worker connected: ${worker_name} (${worker_id}) from ${WORKERS[worker_id].ip}`);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'connected', worker_id })
  };
}

async function handleWorkerUpdate(event) {
  const body = JSON.parse(event.body);
  const { worker_id, status, cpu_usage, last_output } = body;

  if (WORKERS[worker_id]) {
    WORKERS[worker_id].status = status;
    WORKERS[worker_id].lastSeen = Date.now();
    WORKERS[worker_id].cpuUsage = cpu_usage;
    WORKERS[worker_id].lastOutput = last_output;

    const response = {
      pendingCommand: WORKERS[worker_id].pendingCommand
    };

    // Clear the pending command after sending it
    if (WORKERS[worker_id].pendingCommand) {
      WORKERS[worker_id].pendingCommand = null;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } else {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Worker not found' })
    };
  }
}
