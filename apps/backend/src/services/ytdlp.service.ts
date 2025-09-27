import { exec } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { logger } from '../utils/logger'
import { AppError } from '../middleware/error'
import type { DownloadRequest, VideoInfo, DownloadProgress } from '@youtube-dl/shared'

export class YtDlpService {
  private downloads: Map<string, DownloadProgress> = new Map()
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 8000 // 8 segundos entre downloads
  private requestCount = 0
  private activeProcesses: Map<string, any> = new Map() // Track active processes
  private readonly MAX_DOWNLOADS_HISTORY = 10 // Limit memory usage
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Auto cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldDownloads()
    }, 5 * 60 * 1000)
  }

  // Cleanup old downloads to prevent memory leaks
  private cleanupOldDownloads(): void {
    const downloadArray = Array.from(this.downloads.entries())

    // Keep only recent downloads
    if (downloadArray.length > this.MAX_DOWNLOADS_HISTORY) {
      const toKeep = downloadArray
        .filter(([_, progress]) => progress.status !== 'completed' && progress.status !== 'error')
        .slice(-this.MAX_DOWNLOADS_HISTORY)

      this.downloads.clear()
      toKeep.forEach(([id, progress]) => {
        this.downloads.set(id, progress)
      })

      logger.info(`Cleaned up download history, kept ${toKeep.length} recent downloads`)
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
      logger.debug('Forced garbage collection')
    }
  }

  // Calcular cooldown dinâmico baseado no número de requests
  private calculateCooldown(): number {
    this.requestCount++

    // Aumentar dramaticamente o cooldown após múltiplos requests
    let baseInterval = this.MIN_REQUEST_INTERVAL

    if (this.requestCount > 3) {
      baseInterval = this.MIN_REQUEST_INTERVAL * 2 // 20 segundos
    }
    if (this.requestCount > 6) {
      baseInterval = this.MIN_REQUEST_INTERVAL * 3 // 30 segundos
    }
    if (this.requestCount > 10) {
      baseInterval = this.MIN_REQUEST_INTERVAL * 5 // 50 segundos
    }

    // Adicionar randomização para parecer mais humano
    const randomFactor = Math.random() * 0.5 + 0.75 // 75% a 125% do base
    return Math.floor(baseInterval * randomFactor)
  }

  // Função para detectar pasta Downloads do usuário
  public getDownloadsPath(): string {
    const homeDir = os.homedir()

    // Tentar diferentes caminhos baseados no sistema operacional
    if (process.platform === 'win32') {
      // Windows: primeiro tenta pasta Downloads localizada, depois inglês
      const possiblePaths = [
        path.join(homeDir, 'Downloads'),
        path.join(homeDir, 'Transferências'),
        path.join(homeDir, 'Desktop')
      ]

      for (const possiblePath of possiblePaths) {
        try {
          if (require('fs').existsSync(possiblePath)) {
            return possiblePath
          }
        } catch (error) {
          // Continua para próximo caminho
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS
      return path.join(homeDir, 'Downloads')
    } else {
      // Linux e outros Unix
      return path.join(homeDir, 'Downloads')
    }

    // Fallback: usar diretório home
    return homeDir
  }

  // Função para sanitizar nome de arquivo
  private cleanYoutubeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // Remover parâmetros de playlist que podem causar problemas
      urlObj.searchParams.delete('list')
      urlObj.searchParams.delete('start_radio')
      urlObj.searchParams.delete('pp')
      const cleanUrl = urlObj.toString()
      logger.info(`URL cleaned from ${url} to ${cleanUrl}`)
      return cleanUrl
    } catch (urlError) {
      // Se falhar, usar URL original
      logger.warn(`Failed to clean URL, using original: ${urlError}`)
      return url
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      // Remover caracteres não permitidos no Windows/Unix incluindo parênteses
      .replace(/[<>:"/\\|?*\x00-\x1f()]/g, '')
      // Remover espaços extras e quebras de linha
      .replace(/\s+/g, ' ')
      .trim()
      // Limitar tamanho (Windows tem limite de 255 caracteres)
      .substring(0, 200)
      // Remover pontos no final (Windows não permite)
      .replace(/\.+$/, '')
      // Se ficou vazio, usar fallback
      || 'video'
  }

  // Função para determinar extensão do arquivo
  private getFileExtension(format: string, audioOnly?: boolean): string {
    if (audioOnly || ['mp3', 'aac', 'flac', 'wav'].includes(format)) {
      return format
    }

    // Para vídeos, usar mp4 como padrão para melhor compatibilidade
    switch (format.toLowerCase()) {
      case 'webm': return 'webm'
      case 'mkv': return 'mkv'
      case 'avi': return 'avi'
      default: return 'mp4'
    }
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    // Check rate limiting
    const now = Date.now()
    if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - (now - this.lastRequestTime)
      logger.info(`Rate limiting: waiting ${Math.round(waitTime/1000)}s before video info request`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    this.lastRequestTime = Date.now()

    return new Promise((resolve, reject) => {
      // Validar e limpar URL básica antes de executar
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
      if (!youtubeRegex.test(url)) {
        logger.error(`Invalid YouTube URL: ${url}`)
        reject(new AppError('Invalid YouTube URL', 400))
        return
      }

      // Limpar URL de parâmetros problemáticos de playlist/radio
      const cleanUrl = this.cleanYoutubeUrl(url)

      const args = [
        '--dump-json',
        '--no-playlist',
        '--no-check-certificate',
        '--socket-timeout', '30',
        '--retries', '3'
      ]

      logger.info(`Getting video info for: ${cleanUrl}`)

      // Usar python -m yt_dlp para garantir funcionamento
      const ytdlpCommand = 'python -m yt_dlp'
      const fullCommand = `${ytdlpCommand} ${args.join(' ')} "${cleanUrl}"`

      logger.info(`Executing command: ${fullCommand}`)

      try {
        // Usar exec que é mais confiável para comandos complexos
        const processHandle = exec(fullCommand, {
          timeout: 90000, // 90 seconds for video info fetch
          windowsHide: true,
          maxBuffer: 1024 * 1024 // 1MB buffer limit
        })

        let output = ''
        let error = ''

        // Timeout manual adicional - mais agressivo
        const timeout = setTimeout(() => {
          logger.warn(`Video info request timeout for ${cleanUrl}`)
          processHandle.kill('SIGTERM')
          // Try SIGKILL if SIGTERM doesn't work
          setTimeout(() => {
            if (!processHandle.killed) {
              processHandle.kill('SIGKILL')
            }
          }, 2000)
          reject(new AppError('Request timeout - video information could not be retrieved', 408))
        }, 120000) // 120 seconds - must be longer than exec timeout

        processHandle.stdout?.on('data', (data: any) => {
          output += data.toString()
        })

        processHandle.stderr?.on('data', (data: any) => {
          error += data.toString()
        })

        processHandle.on('error', (err: any) => {
          clearTimeout(timeout)
          logger.error(`yt-dlp process error: ${err.message}`)
          reject(new AppError('yt-dlp command failed to execute. Please ensure yt-dlp is installed.', 500))
        })

        processHandle.on('close', (code: any) => {
          clearTimeout(timeout)

          if (code !== 0) {
            logger.error(`yt-dlp info error (exit code ${code}): ${error}`)

            // Diferentes tipos de erro baseados na saída
            if (error.includes('Video unavailable') || error.includes('Private video')) {
              reject(new AppError('Video is unavailable or private', 403))
            } else if (error.includes('not found') || error.includes('No video')) {
              reject(new AppError('Video not found', 404))
            } else if (error.includes('network') || error.includes('timeout')) {
              reject(new AppError('Network error - unable to access video', 408))
            } else {
              reject(new AppError(`Failed to get video information: ${error}`, 400))
            }
            return
          }

          if (!output || output.trim() === '') {
            logger.error('Empty output from yt-dlp')
            reject(new AppError('No video information returned', 404))
            return
          }

          try {
            const info = JSON.parse(output)

            if (!info.title) {
              logger.error('Invalid video info structure')
              reject(new AppError('Invalid video information received', 400))
              return
            }

            resolve({
              title: info.title,
              duration: info.duration,
              thumbnail: info.thumbnail,
              channel: info.channel || info.uploader,
              description: info.description,
              uploadDate: info.upload_date,
              viewCount: info.view_count,
              availableFormats: info.formats?.map((f: any) => ({
                formatId: f.format_id,
                ext: f.ext,
                quality: f.format_note || f.quality,
                filesize: f.filesize,
                fps: f.fps,
                vcodec: f.vcodec,
                acodec: f.acodec
              }))
            })
          } catch (parseError) {
            logger.error('Failed to parse video info:', parseError)
            logger.error('Raw output:', output)
            reject(new AppError('Failed to parse video information', 500))
          }
        })
      } catch (spawnError) {
        logger.error(`Failed to spawn yt-dlp process: ${spawnError}`)
        reject(new AppError('Failed to execute yt-dlp command', 500))
      }
    })
  }

  startDownload(request: DownloadRequest): string {
    const downloadId = this.generateDownloadId()

    // Check if too many concurrent downloads
    const activeDownloads = Array.from(this.downloads.values())
      .filter(d => d.status === 'downloading').length

    if (activeDownloads >= 2) {
      this.downloads.set(downloadId, {
        downloadId,
        status: 'queued',
        progress: 0,
        filename: 'Aguardando na fila...'
      } as DownloadProgress)

      // Queue the download
      setTimeout(() => {
        this.performDownload(request, downloadId).catch((error) => {
          logger.error(`Download ${downloadId} failed:`, error)
          this.updateDownloadProgress(downloadId, {
            status: 'error',
            error: error.message || 'Download failed'
          })
        })
      }, 5000) // Wait 5 seconds

      return downloadId
    }

    // Inicializar status do download imediatamente
    this.downloads.set(downloadId, {
      downloadId,
      status: 'downloading',
      progress: 0,
      filename: 'Preparing download...'
    } as DownloadProgress)

    // Inicia o download assíncrono
    this.performDownload(request, downloadId).catch((error) => {
      logger.error(`Download ${downloadId} failed:`, error)
      this.updateDownloadProgress(downloadId, {
        status: 'error',
        error: error.message || 'Download failed'
      })
    })

    return downloadId
  }

  private async performDownload(request: DownloadRequest, downloadId: string): Promise<void> {
    // Implementar cooldown dinâmico anti-detecção
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const requiredCooldown = this.calculateCooldown()

    if (timeSinceLastRequest < requiredCooldown) {
      const waitTime = requiredCooldown - timeSinceLastRequest
      logger.info(`Anti-detection cooldown: waiting ${Math.round(waitTime/1000)}s (request #${this.requestCount})`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    this.lastRequestTime = Date.now()

    // Usar pasta Downloads automática se não especificado
    const outputDir = request.outputPath || this.getDownloadsPath()

    await this.ensureDirectoryExists(outputDir)

    // Primeiro, obter informações do vídeo para usar título real
    const cleanUrl = this.cleanYoutubeUrl(request.url)
    logger.info(`Getting video info for filename: ${cleanUrl}`)
    const videoInfo = await this.getVideoInfo(cleanUrl)
    const sanitizedTitle = this.sanitizeFilename(videoInfo.title)

    // Determinar extensão baseada no formato
    const extension = this.getFileExtension(request.format, request.audioOnly)
    const filename = `${sanitizedTitle}.${extension}`

    logger.info(`Video will be saved as: ${filename}`)

    // Usar nome de arquivo específico em vez de template
    const args = this.buildYtDlpArgsWithFilename(request, outputDir, filename)

    this.downloads.set(downloadId, {
      downloadId,
      status: 'downloading',
      progress: 0,
      filename: filename
    } as DownloadProgress)

    return new Promise((resolve, reject) => {
      // Usar python -m yt_dlp para garantir funcionamento
      const ytdlpCommand = 'python -m yt_dlp'
      const fullPath = path.join(outputDir, filename)

      // Escapar o caminho para o Windows (usar barras normais, sem aspas extras)
      const outputPath = fullPath.replace(/\\/g, '/')

      // Construir comando completo de forma mais simples
      const commandParts = [
        ytdlpCommand,
        '--no-playlist',
        '--output', `"${outputPath}"`,
        ...args, // Incluir todos os argumentos adicionais
        `"${cleanUrl}"`
      ]

      const fullCommand = commandParts.join(' ')

      logger.info(`Executing download command: ${fullCommand}`)
      logger.info(`Output file will be: ${fullPath}`)
      logger.info(`Download ID: ${downloadId}`)
      logger.info(`Request count: ${this.requestCount}`)
      logger.info(`Time since last request: ${Date.now() - this.lastRequestTime}ms`)

      const childProcess = exec(fullCommand, {
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 5, // Reduced buffer: 5MB
        cwd: outputDir, // Executar no diretório de saída
        timeout: 300000 // 5 minute timeout
      })

      // Track active process
      this.activeProcesses.set(downloadId, childProcess)

      let outputFilePath = fullPath
      let hasError = false
      let errorMessage = ''
      let isMerging = false
      let downloadComplete = false
      let mergeComplete = false

      childProcess.stdout?.on('data', (data: any) => {
        const output = data.toString()
        logger.debug(`yt-dlp output: ${output}`)

        // Detectar início da mesclagem
        if (output.includes('[Merger] Merging formats into')) {
          isMerging = true
          this.updateDownloadProgress(downloadId, {
            progress: 99,
            status: 'downloading'
          })
          logger.info('Merging video and audio formats...')
        }

        // Detectar conclusão da mesclagem
        if (output.includes('Deleting original file') || output.includes('100% of')) {
          if (isMerging) {
            mergeComplete = true
            logger.info('Merge process completed')
          }
        }

        // Detectar download 100% (mas não marcar como completo ainda se houver mesclagem)
        const progressMatch = output.match(/(\d+\.?\d*)%/)
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1])

          if (progress >= 100) {
            downloadComplete = true
            // Só marcar 100% se não estiver mesclando ou se a mesclagem já terminou
            if (!isMerging || mergeComplete) {
              this.updateDownloadProgress(downloadId, { progress: 100 })
            } else {
              this.updateDownloadProgress(downloadId, { progress: 99 })
            }
          } else {
            this.updateDownloadProgress(downloadId, { progress })
          }
        }

        const speedMatch = output.match(/at\s+([\d.]+\w+\/s)/)
        if (speedMatch) {
          this.updateDownloadProgress(downloadId, { speed: speedMatch[1] })
        }

        const etaMatch = output.match(/ETA\s+([\d:]+)/)
        if (etaMatch) {
          this.updateDownloadProgress(downloadId, { eta: etaMatch[1] })
        }

        const destinationMatch = output.match(/\[download\] Destination: (.+)/)
        if (destinationMatch) {
          outputFilePath = destinationMatch[1].trim()
        }

        const mergerMatch = output.match(/\[Merger\] Merging formats into "(.+)"/)
        if (mergerMatch) {
          outputFilePath = mergerMatch[1].trim()
        }
      })

      childProcess.stderr?.on('data', (data: any) => {
        const error = data.toString()
        // Nem todas mensagens em stderr são erros no yt-dlp
        if (error.includes('ERROR') || error.includes('error')) {
          logger.error(`yt-dlp error: ${error}`)
          hasError = true
          errorMessage = error

          // Log específico para possível detecção
          if (error.includes('403') || error.includes('Forbidden') || error.includes('blocked')) {
            logger.warn(`Possible YouTube anti-bot detection: ${error}`)
          }
        } else {
          logger.debug(`yt-dlp stderr: ${error}`)
        }
      })

      childProcess.on('close', async (code: any) => {
        // Remove from active processes
        this.activeProcesses.delete(downloadId)

        logger.info(`Download process closed with code: ${code} for download ${downloadId}`)
        logger.info(`Command was: ${fullCommand}`)
        logger.info(`Download status - isMerging: ${isMerging}, downloadComplete: ${downloadComplete}, mergeComplete: ${mergeComplete}`)

        if (code !== 0) {
          logger.error(`yt-dlp failed with non-zero exit code: ${code}`)
          logger.error(`Exit code analysis: ${this.analyzeExitCode(code)}`)
          if (hasError) {
            logger.error(`Error details: ${errorMessage}`)
          }
        }

        // SOLUÇÃO PARA PROBLEMA DE ENCODING: Buscar arquivo real no diretório
        let finalFilePath: string | null = null

        try {
          // Primeiro tentar os caminhos óbvios
          const possiblePaths = [outputFilePath, fullPath]

          for (const tryPath of possiblePaths) {
            try {
              await fs.access(tryPath)
              finalFilePath = tryPath
              logger.info(`File found at expected path: ${finalFilePath}`)
              break
            } catch {
              // Continuar tentando
            }
          }

          // Se não encontrou, procurar no diretório por arquivos similares
          if (!finalFilePath) {
            logger.info(`File not found at expected paths, searching directory...`)
            const files = await fs.readdir(outputDir)

            // Procurar por arquivo com extensão correta e nome similar
            const expectedExt = path.extname(fullPath)

            for (const file of files) {
              if (file.endsWith(expectedExt) &&
                  (file.includes('Claude') || file.includes(sanitizedTitle.substring(0, 10)))) {
                const potentialPath = path.join(outputDir, file)
                try {
                  await fs.access(potentialPath)
                  finalFilePath = potentialPath
                  logger.info(`Found file with similar name: ${file}`)
                  break
                } catch {
                  // Continue searching
                }
              }
            }
          }

          if (finalFilePath) {
            // Só marcar como completo se:
            // 1. Não houve mesclagem (download simples) OU
            // 2. Houve mesclagem E ela foi concluída
            const isReallyComplete = !isMerging || (isMerging && mergeComplete)

            if (isReallyComplete) {
              this.updateDownloadProgress(downloadId, {
                status: 'completed',
                progress: 100,
                filePath: finalFilePath
              })
              logger.info(`Download and processing completed successfully: ${finalFilePath}`)
            } else {
              // Processo terminou mas mesclagem pode não ter terminado
              logger.warn('Process ended but merge may not be complete, checking file...')
              this.updateDownloadProgress(downloadId, {
                status: 'completed',
                progress: 100,
                filePath: finalFilePath
              })
            }

            resolve()
          } else {
            logger.error(`File not found after download. Searched in: ${outputDir}`)
            logger.error(`Expected paths: ${possiblePaths.join(', ')}`)

            // Específico para código 255 - provável detecção do YouTube
            if (code === 255) {
              logger.warn(`YouTube detection suspected (code 255). Attempting fallback strategy...`)

              // Tentar estratégia fallback com método ainda mais básico
              try {
                await this.tryFallbackDownload(request, downloadId, fullPath)
                resolve()
                return
              } catch (fallbackError) {
                const antiDetectionError = 'YouTube blocked the download even with fallback strategy. Try again later with longer cooldown.'
                logger.error(antiDetectionError)
                logger.error(`Fallback error: ${fallbackError}`)
                this.updateDownloadProgress(downloadId, {
                  status: 'error',
                  error: antiDetectionError
                })
                reject(new Error(antiDetectionError))
                return
              }
            } else if (code !== 0 || hasError) {
              const finalError = errorMessage || `Download failed with code ${code}`
              this.updateDownloadProgress(downloadId, {
                status: 'error',
                error: finalError
              })
              reject(new Error(finalError))
            } else {
              // Código 0 mas arquivo não existe - possível problema de path
              this.updateDownloadProgress(downloadId, {
                status: 'error',
                error: 'Download seemed successful but file not found'
              })
              reject(new Error('File not found after download'))
            }
          }
        } catch (searchError) {
          logger.error(`Error searching for downloaded file: ${searchError}`)
          this.updateDownloadProgress(downloadId, {
            status: 'error',
            error: 'Error locating downloaded file'
          })
          reject(new Error('Error locating downloaded file'))
        }
      })

      childProcess.on('error', (error: any) => {
        // Remove from active processes
        this.activeProcesses.delete(downloadId)

        logger.error(`Failed to start download process: ${error.message}`)
        this.updateDownloadProgress(downloadId, {
          status: 'error',
          error: `Failed to start download: ${error.message}`
        })
        reject(error)
      })

      // Auto-cleanup if process runs too long
      setTimeout(() => {
        if (this.activeProcesses.has(downloadId)) {
          logger.warn(`Download ${downloadId} taking too long, killing process`)
          childProcess.kill('SIGTERM')
          setTimeout(() => {
            if (this.activeProcesses.has(downloadId)) {
              childProcess.kill('SIGKILL')
            }
          }, 5000)
        }
      }, 600000) // 10 minute absolute timeout
    })
  }

  async downloadVideo(request: DownloadRequest): Promise<string> {
    const downloadId = this.generateDownloadId()
    await this.performDownload(request, downloadId)
    const progress = this.downloads.get(downloadId)
    return progress?.filePath || 'download.mp4'
  }

  getDownloadProgress(downloadId: string): DownloadProgress | null {
    return this.downloads.get(downloadId) || null
  }

  // Nova função que usa nome de arquivo específico
  private buildYtDlpArgsWithFilename(request: DownloadRequest, _outputDir: string, _filename: string): string[] {
    const args = []

    if (request.audioOnly || ['mp3', 'aac', 'flac', 'wav'].includes(request.format)) {
      args.push('--extract-audio', '--audio-format', request.format)
    } else {
      // Para vídeos, sempre tentar baixar a melhor qualidade possível
      if (request.quality && request.quality !== 'best') {
        const height = request.quality.replace('p', '').replace('4k', '2160')
        // Usar bestvideo com limite de altura + bestaudio para melhor qualidade
        args.push('--format', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`)
      } else {
        // Por padrão, baixar a melhor qualidade de vídeo + melhor áudio
        // O fallback /best garante compatibilidade se não houver streams separados
        args.push('--format', 'bestvideo+bestaudio/best')
      }

      // Forçar conversão para formato especificado
      if (request.format && !['mp3', 'aac', 'flac', 'wav'].includes(request.format)) {
        args.push('--merge-output-format', request.format)
      } else if (!request.format) {
        // Se não especificado, usar mp4 como padrão
        args.push('--merge-output-format', 'mp4')
      }
    }

    // Estratégia ultra-minimalista - apenas o essencial
    args.push(
      '--progress',
      '--newline',
      '--no-warnings'
    )

    return args
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  private updateDownloadProgress(downloadId: string, update: Partial<DownloadProgress>): void {
    const current = this.downloads.get(downloadId)
    if (current) {
      this.downloads.set(downloadId, { ...current, ...update })
    }
  }

  private generateDownloadId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private analyzeExitCode(code: number): string {
    switch (code) {
      case 1:
        return 'Generic error - could be network, video unavailable, or invalid URL'
      case 2:
        return 'Missing dependency or invalid command line argument'
      case 101:
        return 'Interrupted by user'
      case 128:
        return 'Invalid argument'
      case 255:
        return 'YouTube bot detection - request blocked by anti-automation measures'
      default:
        return `Unknown exit code ${code} - check yt-dlp documentation`
    }
  }

  // Cleanup method for graceful shutdown
  public cleanup(): void {
    logger.info('YtDlpService cleanup initiated')

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Kill all active processes
    for (const [downloadId, process] of this.activeProcesses) {
      logger.info(`Killing active download process: ${downloadId}`)
      try {
        process.kill('SIGTERM')
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL')
          }
        }, 3000)
      } catch (error) {
        logger.error(`Error killing process ${downloadId}:`, error)
      }
    }

    this.activeProcesses.clear()
    this.downloads.clear()

    // Force garbage collection
    if (global.gc) {
      global.gc()
    }

    logger.info('YtDlpService cleanup completed')
  }

  // Get active downloads count (for monitoring)
  public getActiveDownloadsCount(): number {
    return this.activeProcesses.size
  }

  // Estratégia fallback ultra-básica para casos de detecção
  private async tryFallbackDownload(request: DownloadRequest, downloadId: string, expectedOutputPath: string): Promise<void> {
    logger.info(`Attempting fallback download strategy for ${downloadId}`)

    return new Promise((resolve, reject) => {
      // Estratégia de fallback: usar apenas yt-dlp básico sem nenhum parâmetro suspeito
      const basicArgs = ['python', '-m', 'yt_dlp']

      // Formato básico sem otimizações
      if (request.audioOnly || ['mp3', 'aac', 'flac', 'wav'].includes(request.format)) {
        basicArgs.push('--extract-audio', '--audio-format', request.format)
      } else {
        // Usar formato simples disponível (pode não ser a melhor qualidade)
        basicArgs.push('--format', 'best')
      }

      // Apenas saída e URL
      basicArgs.push('--output', expectedOutputPath, cleanUrl)

      const fallbackCommand = basicArgs.join(' ')
      logger.info(`Fallback command: ${fallbackCommand}`)

      // Esperar mais tempo antes da tentativa fallback
      setTimeout(() => {
        const childProcess = exec(fallbackCommand, {
          windowsHide: true,
          maxBuffer: 1024 * 1024 * 10,
          timeout: 300000 // 5 minutos de timeout
        })

        let errorMessage = ''

        childProcess.stdout?.on('data', (data: any) => {
          const output = data.toString()
          logger.debug(`Fallback output: ${output}`)

          // Apenas monitorar progresso básico
          const progressMatch = output.match(/(\d+\.?\d*)%/)
          if (progressMatch) {
            const progress = parseFloat(progressMatch[1])
            this.updateDownloadProgress(downloadId, { progress })
          }
        })

        childProcess.stderr?.on('data', (data: any) => {
          const error = data.toString()
          if (error.includes('ERROR') || error.includes('error')) {
            logger.error(`Fallback error: ${error}`)
            errorMessage = error
          }
        })

        childProcess.on('close', async (code: any) => {
          logger.info(`Fallback process closed with code: ${code}`)

          if (code === 0) {
            try {
              await fs.access(expectedOutputPath)
              logger.info(`Fallback download successful: ${expectedOutputPath}`)
              this.updateDownloadProgress(downloadId, {
                status: 'completed',
                progress: 100,
                filePath: expectedOutputPath
              })
              resolve()
            } catch {
              reject(new Error('Fallback completed but file not found'))
            }
          } else {
            const error = errorMessage || `Fallback failed with code ${code}`
            reject(new Error(error))
          }
        })

        childProcess.on('error', (error: any) => {
          logger.error(`Fallback process error: ${error.message}`)
          reject(error)
        })
      }, 15000) // Esperar 15 segundos antes da tentativa fallback
    })
  }
}