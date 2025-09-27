import { Request, Response, NextFunction } from 'express'
import { YtDlpService } from '../services/ytdlp.service'
import { logger } from '../utils/logger'
import { AppError } from '../middleware/error'
import type { DownloadRequest, DownloadResponse } from '@youtube-dl/shared'

// Lazy initialization to avoid startup crashes
let ytDlpService: YtDlpService | null = null

function getYtDlpService(): YtDlpService {
  if (!ytDlpService) {
    logger.info('Initializing YtDlpService')
    ytDlpService = new YtDlpService()
  }
  return ytDlpService
}

export const downloadVideo = async (
  req: Request<{}, {}, DownloadRequest>,
  res: Response<DownloadResponse>,
  next: NextFunction
) => {
  try {
    const { url, format, quality, outputPath, audioOnly } = req.body

    if (!url) {
      throw new AppError('URL is required', 400)
    }

    if (!format) {
      throw new AppError('Format is required', 400)
    }

    // Validar e sanitizar outputPath
    let validOutputPath = undefined
    if (outputPath && outputPath !== 'string' && outputPath.trim() !== '') {
      validOutputPath = outputPath
    }

    logger.info(`Starting download: ${url} in format: ${format}`)

    const downloadId = getYtDlpService().startDownload({
      url,
      format,
      quality,
      outputPath: validOutputPath || undefined,
      audioOnly
    })

    res.json({
      success: true,
      downloadId,
      message: 'Download started successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const getVideoInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { url } = req.query

    if (!url || typeof url !== 'string') {
      throw new AppError('URL is required', 400)
    }

    logger.info(`Getting video info for: ${url}`)

    const info = await getYtDlpService().getVideoInfo(url)

    res.json({
      success: true,
      data: info
    })
  } catch (error) {
    next(error)
  }
}

export const getDownloadProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const progress = getYtDlpService().getDownloadProgress(id)

    if (!progress) {
      throw new AppError('Download not found', 404)
    }

    res.json({
      success: true,
      data: progress
    })
  } catch (error) {
    next(error)
  }
}

export const validateUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { url } = req.body

    if (!url) {
      throw new AppError('URL is required', 400)
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/

    if (!youtubeRegex.test(url)) {
      throw new AppError('Invalid YouTube URL', 400)
    }

    res.json({
      success: true,
      message: 'Valid YouTube URL'
    })
  } catch (error) {
    next(error)
  }
}

export const getAvailableFormats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const formats = {
      video: ['mp4', 'webm', 'mkv', 'avi'],
      audio: ['mp3', 'aac', 'flac', 'wav'],
      quality: ['360p', '480p', '720p', '1080p', '1440p', '2160p', 'best']
    }

    res.json({
      success: true,
      data: formats
    })
  } catch (error) {
    next(error)
  }
}

export const getDefaultPath = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Acessar o método privado através de uma instância de YtDlpService
    const defaultPath = getYtDlpService().getDownloadsPath()

    res.json({
      success: true,
      data: { path: defaultPath }
    })
  } catch (error) {
    next(error)
  }
}