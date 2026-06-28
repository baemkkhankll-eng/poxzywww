const io = require('socket.io-client');
const os = require('os');
const { exec } = require('child_process');
const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');

// Server configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

// Get system information
const hostname = os.hostname();
const platform = os.platform();
const arch = os.arch();

// Connect to server
const socket = io(SERVER_URL);

console.log(`Connecting to ${SERVER_URL}...`);

socket.on('connect', () => {
    console.log('Connected to remote control server');
    
    // Register this client
    socket.emit('register', {
        name: `${hostname} (${platform})`,
        type: 'target',
        platform: platform,
        arch: arch
    });
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Handle remote commands
socket.on('execute-command', async (data) => {
    const { command, params } = data;
    console.log(`Received command: ${command}`, params);
    
    try {
        let result;
        
        switch(command) {
            case 'lock-screen':
                result = await lockScreen();
                break;
            case 'shutdown':
                result = await shutdown();
                break;
            case 'restart':
                result = await restart();
                break;
            case 'screenshot':
                result = await takeScreenshot();
                break;
            case 'start-stream':
                result = await startScreenStream();
                break;
            case 'stop-stream':
                result = await stopScreenStream();
                break;
            case 'mouse-move':
                result = await moveMouse(params.x, params.y);
                break;
            case 'mouse-click':
                result = await mouseClick(params.button);
                break;
            case 'key-press':
                result = await keyPress(params.key);
                break;
            case 'key-type':
                result = await keyType(params.text);
                break;
            case 'open-url':
                result = await openUrl(params.url);
                break;
            case 'message':
                result = await showMessage(params.message);
                break;
            case 'volume-up':
                result = await volumeUp();
                break;
            case 'volume-down':
                result = await volumeDown();
                break;
            case 'mute':
                result = await mute();
                break;
            case 'custom':
                result = await executeCustom(params.command);
                break;
            default:
                result = 'Unknown command';
        }
        
        socket.emit('command-result', {
            command: command,
            result: result,
            success: true
        });
        
    } catch (error) {
        console.error('Command execution error:', error);
        socket.emit('command-result', {
            command: command,
            result: error.message,
            success: false
        });
    }
});

// Command implementations
function lockScreen() {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            command = 'rundll32.exe user32.dll,LockWorkStation';
        } else if (platform === 'darwin') {
            command = 'pmset displaysleepnow';
        } else {
            command = 'xdg-screensaver lock';
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve('Screen locked successfully');
        });
    });
}

function shutdown() {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            command = 'shutdown /s /t 0';
        } else if (platform === 'darwin') {
            command = 'shutdown -h now';
        } else {
            command = 'shutdown -h now';
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve('Shutdown initiated');
        });
    });
}

function restart() {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            command = 'shutdown /r /t 0';
        } else if (platform === 'darwin') {
            command = 'shutdown -r now';
        } else {
            command = 'shutdown -r now';
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve('Restart initiated');
        });
    });
}

let isStreaming = false;
let streamInterval = null;

function takeScreenshot() {
    return new Promise(async (resolve, reject) => {
        try {
            const imgBuffer = await screenshot();
            const base64 = imgBuffer.toString('base64');
            socket.emit('screenshot-data', {
                image: `data:image/png;base64,${base64}`
            });
            resolve('Screenshot captured and sent');
        } catch (error) {
            reject(error);
        }
    });
}

function startScreenStream() {
    return new Promise(async (resolve, reject) => {
        if (isStreaming) {
            resolve('Already streaming');
            return;
        }
        
        try {
            isStreaming = true;
            streamInterval = setInterval(async () => {
                if (!isStreaming) {
                    clearInterval(streamInterval);
                    return;
                }
                try {
                    const imgBuffer = await screenshot();
                    const base64 = imgBuffer.toString('base64');
                    socket.emit('screen-stream', {
                        image: `data:image/png;base64,${base64}`
                    });
                } catch (error) {
                    console.error('Stream error:', error);
                }
            }, 1000); // 1 FPS for streaming
            resolve('Screen streaming started');
        } catch (error) {
            reject(error);
        }
    });
}

function stopScreenStream() {
    return new Promise((resolve, reject) => {
        if (!isStreaming) {
            resolve('Not streaming');
            return;
        }
        
        isStreaming = false;
        if (streamInterval) {
            clearInterval(streamInterval);
            streamInterval = null;
        }
        socket.emit('screen-stream-stopped');
        resolve('Screen streaming stopped');
    });
}

function openUrl(url) {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            command = `start ${url}`;
        } else if (platform === 'darwin') {
            command = `open ${url}`;
        } else {
            command = `xdg-open ${url}`;
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve(`Opened ${url}`);
        });
    });
}

function showMessage(message) {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            command = `msg * "${message}"`;
        } else if (platform === 'darwin') {
            command = `osascript -e 'display dialog "${message}"'`;
        } else {
            command = `notify-send "${message}"`;
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve('Message displayed');
        });
    });
}

function volumeUp() {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            // Requires additional setup
            resolve('Volume control requires additional setup on Windows');
        } else if (platform === 'darwin') {
            command = 'osascript -e "set volume output volume (output volume of (get volume settings) + 10)"';
            exec(command, (error) => {
                if (error) reject(error);
                else resolve('Volume increased');
            });
        } else {
            resolve('Volume control requires additional setup on Linux');
        }
    });
}

function volumeDown() {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            resolve('Volume control requires additional setup on Windows');
        } else if (platform === 'darwin') {
            command = 'osascript -e "set volume output volume (output volume of (get volume settings) - 10)"';
            exec(command, (error) => {
                if (error) reject(error);
                else resolve('Volume decreased');
            });
        } else {
            resolve('Volume control requires additional setup on Linux');
        }
    });
}

function mute() {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            resolve('Volume control requires additional setup on Windows');
        } else if (platform === 'darwin') {
            command = 'osascript -e "set volume output volume 0"';
            exec(command, (error) => {
                if (error) reject(error);
                else resolve('Muted');
            });
        } else {
            resolve('Volume control requires additional setup on Linux');
        }
    });
}

function executeCustom(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout || stderr);
            }
        });
    });
}

// Mouse and keyboard control functions using PowerShell
function moveMouse(x, y) {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            // Use PowerShell with Add-Type to load Windows Forms
            command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`;
        } else {
            resolve('Mouse control not supported on this platform');
            return;
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve(`Mouse moved to ${x}, ${y}`);
        });
    });
}

function mouseClick(button) {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            // Use PowerShell with SendKeys
            if (button === 'left') {
                command = 'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'{CLICK}\')"';
            } else if (button === 'right') {
                command = 'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'{CLICK}\')"';
            } else {
                resolve('Unsupported button');
                return;
            }
        } else {
            resolve('Mouse control not supported on this platform');
            return;
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve(`Mouse ${button} click`);
        });
    });
}

function keyPress(key) {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            // Use PowerShell to send key
            command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{${key}}')"`;
        } else {
            resolve('Keyboard control not supported on this platform');
            return;
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve(`Key pressed: ${key}`);
        });
    });
}

function keyType(text) {
    return new Promise((resolve, reject) => {
        const platform = os.platform();
        let command;
        
        if (platform === 'win32') {
            // Use PowerShell to type text
            const escapedText = text.replace(/'/g, "''");
            command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`;
        } else {
            resolve('Keyboard control not supported on this platform');
            return;
        }
        
        exec(command, (error) => {
            if (error) reject(error);
            else resolve(`Text typed: ${text}`);
        });
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('Disconnecting...');
    socket.disconnect();
    process.exit(0);
});
