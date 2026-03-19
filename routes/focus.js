const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

let isFocusModeActive = false;
let appKillerInterval = null;
let currentTimeout = null;

const START_MARKER = '# --- FOCUS MODE START ---';
const END_MARKER = '# --- FOCUS MODE END ---';

const BLOCKED_SITES = [
    'www.youtube.com', 'youtube.com',
    'www.instagram.com', 'instagram.com',
    'www.facebook.com', 'facebook.com',
    'www.reddit.com', 'reddit.com',
    'www.twitter.com', 'twitter.com', 'x.com',
    'www.tiktok.com', 'tiktok.com'
];

const BLOCKED_APPS = [
    'Discord',
    'WhatsApp',
    'Messages',
    'Telegram',
    'Slack',
    'Spotify',
    'Steam',
    'Epic Games',
    'Battle.net'
];

// Helper to block websites in /etc/hosts via osascript
const blockWebsites = () => {
    return new Promise((resolve, reject) => {
        try {
            const hostsContent = fs.readFileSync('/etc/hosts', 'utf8');
            if (hostsContent.includes(START_MARKER)) {
                return resolve(); // Already blocked
            }

            const tmpFile = path.join(os.tmpdir(), 'focus_block.txt');
            // Ensure we start with a newline to avoid appending to the end of a line
            const contentToAppend = [
                '',
                START_MARKER,
                ...BLOCKED_SITES.map(site => `127.0.0.1 ${site}`),
                END_MARKER,
                ''
            ].join('\n');

            fs.writeFileSync(tmpFile, contentToAppend);

            // Append to /etc/hosts using admin privileges
            const cmd = `osascript -e 'do shell script "cat ${tmpFile} >> /etc/hosts" with administrator privileges'`;

            exec(cmd, (error) => {
                if (error) {
                    console.error("Failed to block websites:", error);
                    return reject(error);
                }
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
};

// Helper to unblock websites
const unblockWebsites = () => {
    return new Promise((resolve, reject) => {
        try {
            const hostsContent = fs.readFileSync('/etc/hosts', 'utf8');
            if (!hostsContent.includes(START_MARKER)) {
                return resolve(); // Already clear
            }

            // Create a node script that cleans the file and then run that node script with sudo via osascript
            // This avoids complex sed escaping issues.
            const cleanScriptPath = path.join(os.tmpdir(), 'clean_hosts.js');
            const scriptContent = `
                const fs = require('fs');
                const content = fs.readFileSync('/etc/hosts', 'utf8');
                const lines = content.split('\\n');
                let newLines = [];
                let inBlock = false;
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    if (line.includes('${START_MARKER}')) {
                        inBlock = true;
                        continue;
                    }
                    if (line.includes('${END_MARKER}')) {
                        inBlock = false;
                        continue;
                    }
                    if (!inBlock) {
                        newLines.push(line);
                    }
                }
                // Clean up trailing empty lines that might have accumulated
                let result = newLines.join('\\n').trim() + '\\n';
                fs.writeFileSync('/etc/hosts', result);
            `;

            fs.writeFileSync(cleanScriptPath, scriptContent);

            // Run the node script as root
            const cmd = `osascript -e 'do shell script "${process.execPath} ${cleanScriptPath}" with administrator privileges'`;

            exec(cmd, (error) => {
                if (error) {
                    console.error("Failed to unblock websites:", error);
                    return reject(error);
                }
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });
};

const killDistractingApps = () => {
    BLOCKED_APPS.forEach(app => {
        // Attempt to quit gracefully first via osascript
        exec(`osascript -e 'if application "${app}" is running then tell application "${app}" to quit'`, (err) => {
            if (err) console.error(`Error quitting ${app}:`, err.message);
        });

        // Follow up with pkill (case-insensitive, partial match) to catch stubborn processes
        // We use -i for case-insensitive and -f for full process name matching
        exec(`pkill -i -f "${app}"`, (err) => {
            // pkill returns exit code 1 if no process matched, which is fine
            if (err && err.code !== 1) {
                console.error(`Error killing ${app} via pkill:`, err.message);
            }
        });
    });
}

async function stopFocusMode() {
    if (!isFocusModeActive) return;

    clearInterval(appKillerInterval);
    if (currentTimeout) {
        clearTimeout(currentTimeout);
    }

    isFocusModeActive = false;
    appKillerInterval = null;
    currentTimeout = null;

    try {
        await unblockWebsites();
        console.log("Focus mode ended smoothly.");
    } catch (e) {
        console.error("Failed to unblock websites on stop.");
    }
}

router.post('/start', async (req, res) => {
    const { durationMinutes } = req.body;

    if (isFocusModeActive) {
        return res.status(400).json({ error: "Focus mode is already active." });
    }

    try {
        await blockWebsites();
        isFocusModeActive = true;

        // Start app killer loop (runs every 10 seconds)
        killDistractingApps();
        appKillerInterval = setInterval(killDistractingApps, 10000);

        // Schedule stop
        if (durationMinutes) {
            currentTimeout = setTimeout(() => {
                stopFocusMode();
            }, durationMinutes * 60 * 1000);
        }

        res.json({ message: "Focus mode started", active: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to start focus mode. Administrator privileges are required to block websites." });
    }
});

router.post('/stop', async (req, res) => {
    await stopFocusMode();
    res.json({ message: "Focus mode stopped", active: false });
});

router.get('/status', (req, res) => {
    res.json({ active: isFocusModeActive });
});

// Cleanup on exit
process.on('SIGINT', async () => {
    if (isFocusModeActive) {
        console.log("Server shutting down, cleaning up Focus Mode...");
        await stopFocusMode();
    }
    process.exit();
});

process.on('SIGTERM', async () => {
    if (isFocusModeActive) {
        console.log("Server shutting down, cleaning up Focus Mode...");
        await stopFocusMode();
    }
    process.exit();
});

module.exports = router;
