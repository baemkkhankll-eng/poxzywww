const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname, 'public')));

// Data files
const DATA_FILE = path.join(__dirname, 'data.json');
const LOGS_FILE = path.join(__dirname, 'logs.json');

// Store connected clients and device codes
const clients = new Map();
const deviceCodes = new Map(); // code -> { name, controllerSocket, targetSocket }
let logs = [];

// Load data from files
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // Load device codes (without socket references)
      for (const [code, info] of Object.entries(data.deviceCodes || {})) {
        deviceCodes.set(code, {
          name: info.name,
          controllerSocket: null,
          targetSocket: null,
          createdAt: info.createdAt
        });
      }
      console.log('Loaded device codes from file');
    }
    
    if (fs.existsSync(LOGS_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8')) || [];
      console.log('Loaded logs from file');
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to files
function saveData() {
  try {
    // Save device codes (without socket references)
    const deviceCodesData = {};
    for (const [code, info] of deviceCodes.entries()) {
      deviceCodesData[code] = {
        name: info.name,
        createdAt: info.createdAt
      };
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify({ deviceCodes: deviceCodesData }, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

function saveLogs() {
  try {
    // Keep only last 1000 logs
    const logsToSave = logs.slice(-1000);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logsToSave, null, 2));
  } catch (error) {
    console.error('Error saving logs:', error);
  }
}

// Add log entry
function addLogEntry(message, type = 'info') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message,
    type: type
  };
  logs.push(logEntry);
  saveLogs();
}

// Generate 6-digit code
function generateCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (deviceCodes.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle keep-alive ping
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Register client
  socket.on('register', (clientInfo) => {
    clients.set(socket.id, {
      ...clientInfo,
      socket: socket
    });
    console.log('Client registered:', clientInfo);
    io.emit('clients-update', Array.from(clients.values()).map(c => ({
      id: c.socket.id,
      name: c.name,
      type: c.type
    })));
  });

  // Create device code (controller adds device)
  socket.on('create-device', (data) => {
    const { name } = data;
    const code = generateCode();
    deviceCodes.set(code, {
      name: name,
      controllerSocket: socket,
      targetSocket: null,
      createdAt: Date.now()
    });
    
    saveData();
    addLogEntry(`Device created: ${code} - ${name}`, 'info');
    
    socket.emit('device-created', {
      code: code,
      name: name
    });
    console.log(`Device created: ${code} - ${name}`);
  });

  // Connect to device (target connects with code)
  socket.on('connect-device', (data) => {
    const { code, deviceName } = data;
    const device = deviceCodes.get(code);
    
    if (!device) {
      socket.emit('connect-error', { message: 'Invalid device code' });
      return;
    }
    
    if (device.targetSocket) {
      socket.emit('connect-error', { message: 'Device already connected' });
      return;
    }
    
    device.targetSocket = socket;
    device.targetName = deviceName;
    
    saveData();
    addLogEntry(`Device connected: ${code} - ${deviceName}`, 'info');
    
    // Notify controller
    device.controllerSocket.emit('device-connected', {
      code: code,
      deviceName: deviceName,
      targetId: socket.id
    });
    
    // Notify target
    socket.emit('connect-success', {
      controllerName: device.name,
      controllerId: device.controllerSocket.id
    });
    
    console.log(`Device connected: ${code} - ${deviceName}`);
  });

  // Handle remote control commands
  socket.on('remote-command', (data) => {
    const { targetId, command, params } = data;
    const targetClient = clients.get(targetId);
    
    if (targetClient) {
      targetClient.socket.emit('execute-command', { command, params });
      console.log('Command sent to', targetId, ':', command);
    }
  });

  // Handle remote control commands by device code
  socket.on('remote-command-code', (data) => {
    const { code, command, params } = data;
    const device = deviceCodes.get(code);
    
    if (device && device.targetSocket) {
      device.targetSocket.emit('execute-command', { command, params });
      console.log('Command sent to device', code, ':', command);
    }
  });

  // Handle command results
  socket.on('command-result', (data) => {
    io.emit('command-result', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    addLogEntry(`Client disconnected: ${socket.id}`, 'warning');
    clients.delete(socket.id);
    
    // Clean up device codes
    for (const [code, device] of deviceCodes.entries()) {
      if (device.controllerSocket && device.controllerSocket.id === socket.id || 
          (device.targetSocket && device.targetSocket.id === socket.id)) {
        if (device.controllerSocket && device.controllerSocket.id === socket.id && device.targetSocket) {
          device.targetSocket.emit('controller-disconnected');
          device.controllerSocket = null;
          addLogEntry(`Controller disconnected for device: ${code}`, 'warning');
        }
        if (device.targetSocket && device.targetSocket.id === socket.id) {
          device.targetSocket = null;
          addLogEntry(`Target disconnected for device: ${code}`, 'warning');
          if (device.controllerSocket) {
            device.controllerSocket.emit('device-disconnected', { code });
          }
        } else if (!device.targetSocket && (!device.controllerSocket || device.controllerSocket.id === socket.id)) {
          deviceCodes.delete(code);
          addLogEntry(`Device code removed: ${code}`, 'info');
        }
      }
    }
    
    saveData();
    
    io.emit('clients-update', Array.from(clients.values()).map(c => ({
      id: c.socket.id,
      name: c.name,
      type: c.type
    })));
  });
});

// Bind to all interfaces (0.0.0.0) to allow access from any IP
const PORT = process.env.PORT || 3001;

// Load data before starting server
loadData();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Remote Control Server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from any IP: http://<your-ip>:${PORT}`);
  console.log(`Loaded ${deviceCodes.size} device codes from storage`);
});
