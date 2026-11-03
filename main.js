const { app, BrowserWindow, clipboard, dialog, ipcMain } = require('electron');
const { execFile, spawn } = require('node:child_process');
const path = require('node:path');

function checkExecutable(command, args) {
    return new Promise((resolve) => {
        execFile(command, args, { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
            if (!error) {
                resolve({ installed: true });
                return;
            }

            if (error.code === 'ENOENT') {
                resolve({ installed: false });
                return;
            }

            resolve({
                installed: null,
                error: stderr.trim() || error.message
            });
        });
    });
}

ipcMain.handle('dependencies:check', async () => {
    const [ytdlp, ffmpeg] = await Promise.all([
        checkExecutable('yt-dlp', ['--version']),
        checkExecutable('ffmpeg', ['-version'])
    ]);

    return { ytdlp, ffmpeg };
});

ipcMain.handle('directory:browse', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory', 'createDirectory']
    });

    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('clipboard:read-text', () => clipboard.readText());

const videoHeights = {
    '4k': 2160,
    '1440p': 1440,
    '1080p': 1080,
    '720p': 720
};

function isYouTubeUrl(value) {
    try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        return url.protocol === 'https:' &&
            (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be');
    } catch {
        return false;
    }
}

function buildDownloadArgs({ url, format, quality, outputPath }) {
    const args = [];

    if (format === 'mp3') {
        args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3');
    } else {
        const height = videoHeights[quality];
        const formatSelector = height
            ? `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
            : 'bestvideo+bestaudio/best';

        args.push('-f', formatSelector);
        if (format === 'mp4') {
            args.push('-S', 'ext:mp4:m4a');
        }
        args.push('--remux-video', format);
    }

    if (outputPath) {
        args.push('-o', path.join(outputPath, '%(title)s.%(ext)s'));
    }
    args.push('--', url);
    return args;
}

ipcMain.handle('video:download', (event, request) => {
    if (!request || typeof request !== 'object' ||
        typeof request.requestId !== 'string' ||
        !isYouTubeUrl(request.url) ||
        !['mp4', 'mp3', 'mkv'].includes(request.format) ||
        !['best', ...Object.keys(videoHeights)].includes(request.quality) ||
        (request.outputPath !== undefined && typeof request.outputPath !== 'string')) {
        throw new Error('Invalid download options. Provide a YouTube URL, format, and quality.');
    }

    const { requestId } = request;
    const args = buildDownloadArgs(request);
    const child = spawn('yt-dlp', args, { windowsHide: true });

    const sendOutput = (stream, chunk) => {
        if (!event.sender.isDestroyed()) {
            event.sender.send('video:download-output', {
                requestId,
                stream,
                text: chunk.toString()
            });
        }
    };

    child.stdout.on('data', (chunk) => sendOutput('stdout', chunk));
    child.stderr.on('data', (chunk) => sendOutput('stderr', chunk));

    return new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
    });
});

function createWindow() {
    const window = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    window.loadFile(path.join(__dirname, 'index.html')).catch((error) => {
        console.error('Failed to load the Grinder window:', error);
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}).catch((error) => {
    console.error('Failed to start Grinder:', error);
    app.quit();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
