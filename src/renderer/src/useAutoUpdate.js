// src/renderer/src/useAutoUpdate.js
import { useEffect, useState } from 'react'

export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    // only run if we're inside Electron (preload injected)
    if (!window.electronAPI) {
      console.warn('⚠️ Auto-update disabled: running in web mode (no electronAPI)')
      return
    }

    const { ipc } = window.electronAPI

    const handleAvailable = () => setUpdateAvailable(true)
    const handleProgress = (_event, p) => setProgress(p)
    const handleDownloaded = () => {
      setDownloaded(true)
      setUpdateAvailable(false)
    }

    ipc.on('update-available', handleAvailable)
    ipc.on('download-progress', handleProgress)
    ipc.on('update-downloaded', handleDownloaded)

    return () => {
      ipc.removeAllListeners('update-available')
      ipc.removeAllListeners('download-progress')
      ipc.removeAllListeners('update-downloaded')
    }
  }, [])

  const installUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.ipc.send('install-update')
    }
  }

  return { updateAvailable, downloaded, progress, installUpdate }
}
