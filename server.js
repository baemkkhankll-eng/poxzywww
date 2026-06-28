const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients and device codes
const clients = new Map();
const deviceCodes = new Map(); // code -> { name, controllerSocket, targetSocket }

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
    clients.delete(socket.id);
    
    // Clean up device codes
    for (const [code, device] of deviceCodes.entries()) {
      if (device.controllerSocket.id === socket.id || 
          (device.targetSocket && device.targetSocket.id === socket.id)) {
        if (device.controllerSocket.id === socket.id && device.targetSocket) {
          device.targetSocket.emit('controller-disconnected');
        }
        if (device.targetSocket && device.targetSocket.id === socket.id) {
          device.controllerSocket.emit('device-disconnected', { code });
          device.targetSocket = null;
        } else {
          deviceCodes.delete(code);
        }
      }
    }
    
    io.emit('clients-update', Array.from(clients.values()).map(c => ({
      id: c.socket.id,
      name: c.name,
      type: c.type
    })));
  });
});

// Bind to all interfaces (0.0.0.0) to allow access from any IP
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Remote Control Server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from any IP: http://<your-ip>:${PORT}`);
});
