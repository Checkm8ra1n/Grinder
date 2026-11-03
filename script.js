const ytdlpStatus = document.getElementById('ytdlp-install-status');
const ffmpegStatus = document.getElementById('ffmpeg-install-status');
const downloadButton = document.getElementById('download-button');
const formatSelect = document.getElementById('format-select');
const qualitySelect = document.getElementById('quality-select');
const output = document.getElementById('output');

function renderInstallationStatus(element, result) {
    if (result.installed === true) {
        element.dataset.state = 'installed';
        element.textContent = 'Installed';
    } else if (result.installed === false) {
        element.dataset.state = 'missing';
        element.textContent = 'Not installed';
    } else {
        element.dataset.state = 'error';
        element.textContent = `Check failed: ${result.error}`;
    }
}

async function checkInstallations() {
    try {
        const result = await window.grinder.checkDependencies();
        renderInstallationStatus(ytdlpStatus, result.ytdlp);
        renderInstallationStatus(ffmpegStatus, result.ffmpeg);
        downloadButton.disabled = !result.ytdlp.installed || !result.ffmpeg.installed;
    } catch (error) {
        console.error('Failed to check installed dependencies:', error);
        const message = error instanceof Error ? error.message : String(error);
        downloadButton.disabled = true;
        for (const status of [ytdlpStatus, ffmpegStatus]) {
            status.dataset.state = 'error';
            status.textContent = `Check failed: ${message}`;
        }
    }
}

function updateQualityAvailability() {
    const isAudioFormat = formatSelect.value === 'mp3';
    qualitySelect.disabled = isAudioFormat;
    qualitySelect.title = isAudioFormat ? 'Video quality does not apply to MP3' : '';
}

function appendOutput(text, stream = 'stdout') {
    const line = document.createElement('span');
    line.className = `output-${stream}`;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

async function browseOutputDirectory() {
    try {
        const directory = await window.grinder.browseOutputDirectory();
        if (directory) {
            document.getElementById('output-path').value = directory;
        }
    } catch (error) {
        console.error('Failed to select output directory:', error);
        appendOutput(`Could not select output directory: ${error.message}\n`, 'stderr');
    }
}

async function pasteVideoUrl() {
    try {
        const text = (await window.grinder.readClipboardText()).trim();
        if (!text) {
            appendOutput('Clipboard is empty or does not contain text.\n', 'stderr');
            return;
        }

        const videoUrl = document.getElementById('video-url');
        videoUrl.value = text;
        videoUrl.focus();
    } catch (error) {
        console.error('Failed to read the clipboard:', error);
        appendOutput(`Could not paste link: ${error.message}\n`, 'stderr');
    }
}

async function downloadVideo() {
    if (downloadButton.disabled) {
        return;
    }

    const url = document.getElementById('video-url').value.trim();
    if (!url) {
        appendOutput('Enter a YouTube URL before downloading.\n', 'stderr');
        return;
    }

    output.replaceChildren();
    appendOutput('Starting download...\n');
    downloadButton.disabled = true;

    try {
        const result = await window.grinder.downloadVideo({
            url,
            format: formatSelect.value,
            quality: qualitySelect.value,
            outputPath: document.getElementById('output-path').value.trim()
        }, ({ stream, text }) => appendOutput(text, stream));

        if (result.exitCode === 0) {
            appendOutput('\nDownload completed.\n');
        } else {
            appendOutput(`\nDownload failed (exit code ${result.exitCode ?? result.signal}).\n`, 'stderr');
        }
    } catch (error) {
        console.error('Download failed:', error);
        appendOutput(`\nDownload failed: ${error.message}\n`, 'stderr');
    } finally {
        downloadButton.disabled = ytdlpStatus.dataset.state !== 'installed' ||
            ffmpegStatus.dataset.state !== 'installed';
    }
}

formatSelect.addEventListener('change', updateQualityAvailability);
updateQualityAvailability();
void checkInstallations();