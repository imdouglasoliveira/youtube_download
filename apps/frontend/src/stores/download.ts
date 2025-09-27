import { create } from 'zustand'
import type { DownloadProgress, VideoInfo } from '@youtube-dl/shared'

interface RecentDownload {
  title: string
  format: string
  quality: string
  time: string
  size: string
  path?: string
}

interface DownloadStore {
  currentVideo: VideoInfo | null
  downloads: Map<string, DownloadProgress>
  isLoading: boolean
  isLoadingInfo: boolean
  isDownloading: boolean
  error: string | null
  currentDownloadId: string | null
  downloadProgress: number
  downloadSpeed: string
  timeRemaining: string
  recentDownloads: RecentDownload[]
  isValidUrl: boolean | null

  setCurrentVideo: (video: VideoInfo | null) => void
  addDownload: (download: DownloadProgress) => void
  updateDownload: (id: string, progress: Partial<DownloadProgress>) => void
  removeDownload: (id: string) => void
  setLoading: (loading: boolean) => void
  setLoadingInfo: (loading: boolean) => void
  setDownloading: (downloading: boolean) => void
  setError: (error: string | null) => void
  setCurrentDownloadId: (id: string | null) => void
  setDownloadProgress: (progress: number) => void
  setDownloadSpeed: (speed: string) => void
  setTimeRemaining: (time: string) => void
  addRecentDownload: (download: RecentDownload) => void
  setIsValidUrl: (valid: boolean | null) => void
  clearAll: () => void
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  currentVideo: null,
  downloads: new Map(),
  isLoading: false,
  isLoadingInfo: false,
  isDownloading: false,
  error: null,
  currentDownloadId: null,
  downloadProgress: 0,
  downloadSpeed: '0 MB/s',
  timeRemaining: '--:--',
  recentDownloads: [],
  isValidUrl: null,

  setCurrentVideo: (video) => set({ currentVideo: video }),

  addDownload: (download) =>
    set((state) => {
      const newDownloads = new Map(state.downloads)
      newDownloads.set(download.downloadId, download)
      return { downloads: newDownloads }
    }),

  updateDownload: (id, progress) =>
    set((state) => {
      const newDownloads = new Map(state.downloads)
      const current = newDownloads.get(id)
      if (current) {
        newDownloads.set(id, { ...current, ...progress })
      }
      return { downloads: newDownloads }
    }),

  removeDownload: (id) =>
    set((state) => {
      const newDownloads = new Map(state.downloads)
      newDownloads.delete(id)
      return { downloads: newDownloads }
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingInfo: (loading) => set({ isLoadingInfo: loading }),
  setDownloading: (downloading) => set({ isDownloading: downloading }),
  setError: (error) => set({ error }),
  setCurrentDownloadId: (id) => set({ currentDownloadId: id }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  setDownloadSpeed: (speed) => set({ downloadSpeed: speed }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),

  addRecentDownload: (download) =>
    set((state) => ({
      recentDownloads: [download, ...state.recentDownloads.slice(0, 2)]
    })),

  setIsValidUrl: (valid) => set({ isValidUrl: valid }),

  clearAll: () => set({
    downloads: new Map(),
    currentVideo: null,
    error: null,
    isDownloading: false,
    downloadProgress: 0,
    currentDownloadId: null
  })
}))