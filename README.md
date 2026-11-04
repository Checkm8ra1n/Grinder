## Grinder

Grinder is YouTube video downloader based on yt-dlp, cross platform

**The program is vibe-coded, so sorry bad quality code**

## Requirements

You need to have installed on your PC:

- yt-dlp
- ffmpeg

Node.js is required. Install the application dependencies and
start Grinder with:

```zsh
npm install
npm start
```

Install yt-dlp and ffmpeg separately using your operating system's package
manager. On macOS, use Homebrew or MacPorts; on Linux, use your distro's package
manager (apt, pacman, dnf, ...); on Windows, use a package manager such as
winget or install the executables and add them to `PATH`.

Choose MP4, MP3, or MKV and, for video formats, a maximum resolution. An
optional output path accepts yt-dlp's output template syntax. Download progress
and command output are shown in the app.

## GitHub Actions builds

Pushing to `main` builds Windows (NSIS installer), macOS (universal DMG and ZIP),
and Linux (AppImage and DEB). Once all builds succeed, the workflow replaces the
assets in the GitHub Release tagged `video`. Pull requests build all platforms
but do not publish a release. You can also start a build manually from the
Actions tab; manual runs publish only when started from `main`.