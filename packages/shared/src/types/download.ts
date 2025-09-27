export type VideoFormat = 'mp4' | 'webm' | 'mkv' | 'avi'
export type AudioFormat = 'mp3' | 'aac' | 'flac' | 'wav'
export type Format = VideoFormat | AudioFormat | 'best'

export type VideoQuality = '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p' | '4k' | 'best'

export interface DownloadRequest {
  url: string
  format: Format
  quality?: VideoQuality
  outputPath?: string
  audioOnly?: boolean
}

export interface DownloadResponse {
  success: boolean
  downloadId?: string
  filePath?: string
  error?: string
  message?: string
}

export interface DownloadProgress {
  downloadId: string
  status: 'pending' | 'queued' | 'downloading' | 'processing' | 'completed' | 'error'
  progress?: number
  speed?: string
  eta?: string
  fileSize?: string
  downloadedSize?: string
  filePath?: string
  filename?: string
  error?: string
}

export interface VideoInfo {
  title: string
  duration: number
  thumbnail: string
  channel: string
  description?: string
  uploadDate?: string
  viewCount?: number
  availableFormats?: FormatInfo[]
}

export interface FormatInfo {
  formatId: string
  ext: string
  quality: string
  filesize?: number
  fps?: number
  vcodec?: string
  acodec?: string
}