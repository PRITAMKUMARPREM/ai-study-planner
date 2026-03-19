const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./server'); // We will modify server.js to export startServer

let mainWindow;
let serverInstance;

function createWindow(port) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Load the dashboard built by Express
    mainWindow.loadURL(`http://localhost:${port}/dashboard.html`);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Ensure single instance lock for the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.on('ready', () => {
        // Start Express Server dynamically (Let it pick a port or standard 5001)
        serverInstance = startServer(5001, (port) => {
            console.log(`Express server started via Electron on port ${port}`);
            createWindow(port);
        });
    });

    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', function () {
        if (mainWindow === null) {
            // If we re-activate on macOS but no window exists, attempt to recreate it.
            // Easiest approach is to assume the server is still running on the same port.
            createWindow(5001);
        }
    });

    app.on('before-quit', () => {
        if (serverInstance) {
            serverInstance.close();
        }
    });
}
