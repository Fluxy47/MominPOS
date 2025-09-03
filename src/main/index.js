// src/main/index.js
import { app, shell, BrowserWindow, ipcMain, nativeTheme, session } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Auto-updater
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

log.transports.file.level = 'info'
autoUpdater.logger = log
autoUpdater.autoDownload = true
// autoUpdater.autoInstallOnAppQuit = true; // optional

const isDev = !app.isPackaged && is.dev

// single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      // safer preload resolution for dev/prod
      preload: app.isPackaged
        ? join(app.getAppPath(), 'dist/preload/index.js')
        : join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  nativeTheme.on('updated', () => {
    mainWindow.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff')
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL).catch(() => {})
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((e) => {
      console.error('Failed loading index.html', e)
    })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // Inject CSP headers (allow Firebase, etc.)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
            "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebase.googleapis.com https://*.firebaseio.com; " +
            "img-src 'self' data:; " +
            "style-src 'self' 'unsafe-inline'; " +
            "script-src 'self';"
        ]
      }
    })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Only check for updates in production
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        log.error('Auto updater check failed:', err)
      })
    }, 5000)
  }
})

app.on('second-instance', () => {
  // optional: focus existing window
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Auto-updater events (forward to renderer)
autoUpdater.on('checking-for-update', () => log.info('Checking for updates...'))

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info)
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('update-available', info)
  })
})

autoUpdater.on('update-not-available', (info) => log.info('No update available:', info))

autoUpdater.on('download-progress', (progress) => {
  log.info('Download progress:', progress)
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('download-progress', progress)
  })
})

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info)
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('update-downloaded', info)
  })
})

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall()
})
