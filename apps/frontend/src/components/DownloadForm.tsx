import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Download, Youtube, Check, ChevronDown, Info, X, CheckCircle, AlertCircle, Sparkles, Folder, Film } from 'lucide-react'
import type { DownloadRequest, Format, VideoQuality } from '@youtube-dl/shared'
import { api } from '@/services/api'
import { useDownloadStore } from '@/stores/download'

interface FormData {
  url: string
  format: Format
  quality: VideoQuality
  outputPath: string
}

export function DownloadForm() {
  const {
    setError,
    setCurrentVideo,
    setDownloading,
    setLoadingInfo,
    setDownloadProgress,
    setDownloadSpeed,
    setTimeRemaining,
    addRecentDownload,
    setCurrentDownloadId,
    setIsValidUrl,
    isValidUrl,
    isDownloading,
    currentVideo
  } = useDownloadStore()
  const [showFormatDropdown, setShowFormatDropdown] = useState(false)
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<number | null>(null)
  const [defaultPath, setDefaultPath] = useState<string>('')
  const [customPath, setCustomPath] = useState<string>('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      url: '',
      format: 'mp4',
      quality: 'best',
      outputPath: '' // Deixar vazio para usar pasta Downloads padrão
    }
  })

  const selectedFormat = watch('format')
  const selectedQuality = watch('quality')
  const urlValue = watch('url')
  const isAudioFormat = ['mp3', 'aac', 'flac', 'wav'].includes(selectedFormat)

  // Buscar pasta padrão ao carregar o componente e verificar localStorage
  useEffect(() => {
    const fetchDefaultPath = async () => {
      try {
        // Verificar se há pasta personalizada salva no localStorage
        const savedPath = localStorage.getItem('youtube-downloader-path')
        if (savedPath) {
          setCustomPath(savedPath)
          setValue('outputPath', savedPath)
          return
        }

        // Se não há pasta salva, usar a pasta padrão da API
        const response = await api.getDefaultPath()
        if (response.success) {
          setDefaultPath(response.data.path)
          setValue('outputPath', response.data.path)
        }
      } catch (error) {
        console.error('Erro ao buscar pasta padrão:', error)
        // Fallback para pasta padrão conhecida (sem usar process no browser)
        const fallbackPath = 'C:\\Users\\dsoliveira\\Downloads'
        setDefaultPath(fallbackPath)
        setValue('outputPath', fallbackPath)
      }
    }

    fetchDefaultPath()
  }, [setValue])

  // URL validation and video info fetching
  useEffect(() => {
    if (urlValue) {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)/
      const isValid = youtubeRegex.test(urlValue)
      setIsValidUrl(isValid)

      if (isValid) {
        const timer = setTimeout(async () => {
          try {
            setLoadingInfo(true)
            const videoInfo = await api.getVideoInfo(urlValue)
            setCurrentVideo(videoInfo.data)
          } catch (error) {
            console.error('Error fetching video info:', error)
          } finally {
            setLoadingInfo(false)
          }
        }, 500)
        return () => clearTimeout(timer)
      }
    } else {
      setIsValidUrl(null)
      setCurrentVideo(null)
    }
  }, [urlValue, setIsValidUrl, setCurrentVideo, setLoadingInfo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const formats = [
    { value: 'mp4', label: 'MP4' },
    { value: 'webm', label: 'WebM' },
    { value: 'mkv', label: 'MKV' },
    { value: 'avi', label: 'AVI' },
    { value: 'mp3', label: 'MP3' },
    { value: 'aac', label: 'AAC' },
    { value: 'flac', label: 'FLAC' },
    { value: 'wav', label: 'WAV' }
  ]

  const qualities = [
    { value: 'best', label: 'Melhor Disponível' },
    { value: '2160p', label: '4K (2160p)' },
    { value: '1440p', label: '2K (1440p)' },
    { value: '1080p', label: 'Full HD (1080p)' },
    { value: '720p', label: 'HD (720p)' },
    { value: '480p', label: 'SD (480p)' },
    { value: '360p', label: '360p' }
  ]

  const trackDownloadProgress = (downloadId: string, videoTitle: string, format: string, quality: string) => {
    let hasCompleted = false
    let retryCount = 0
    const maxRetries = 30 // Máximo 30 tentativas (30 segundos)

    const interval = setInterval(async () => {
      try {
        const progressResponse = await api.getDownloadProgress(downloadId)
        if (progressResponse.success) {
          const progress = progressResponse.data
          retryCount = 0 // Reset retry count on success

          setDownloadProgress(progress.progress || 0)
          setDownloadSpeed(progress.speed || '0 MB/s')
          setTimeRemaining(progress.eta || '--:--')

          if (progress.status === 'completed' && !hasCompleted) {
            hasCompleted = true
            setDownloadProgress(100)
            setDownloadSpeed('0 MB/s')
            setTimeRemaining('00:00')

            setTimeout(() => {
              clearInterval(interval)
              setDownloading(false)
              setDownloadProgress(0)

              // Add to recent downloads ONLY ONCE
              addRecentDownload({
                title: videoTitle,
                format: format.toUpperCase(),
                quality: isAudioFormat ? 'Áudio' : quality,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                size: progress.fileSize || (isAudioFormat ? '12.5 MB' : '250 MB')
              })

              // Clear form
              setValue('url', '')
              setCurrentVideo(null)
              setIsValidUrl(null)
            }, 800)
          } else if (progress.status === 'error') {
            clearInterval(interval)
            setError(progress.error || 'Erro durante o download')
            setDownloading(false)
          }
        }
      } catch (error) {
        retryCount++
        console.error(`Erro ao consultar progresso (tentativa ${retryCount}/${maxRetries}):`, error)

        // Se exceder máximo de tentativas, parar e exibir erro
        if (retryCount >= maxRetries) {
          clearInterval(interval)
          setError('Erro: Download não encontrado ou conexão perdida')
          setDownloading(false)
          setDownloadProgress(0)
        }
      }
    }, 1000) // Polling a cada 1 segundo

    return interval
  }

  // Função para selecionar pasta usando File System Access API
  const selectFolder = async () => {
    try {
      // Verificar se o navegador suporta a File System Access API
      if ('showDirectoryPicker' in window) {
        // @ts-ignore - API ainda não está nos tipos do TypeScript
        const directoryHandle = await window.showDirectoryPicker()
        const selectedPath = directoryHandle.name

        // Salvar no localStorage e atualizar estado
        localStorage.setItem('youtube-downloader-path', selectedPath)
        setCustomPath(selectedPath)
        setValue('outputPath', selectedPath)
      } else {
        // Fallback: usar input file com webkitdirectory
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.style.display = 'none'

        input.onchange = (e: any) => {
          const files = e.target.files
          if (files && files.length > 0) {
            // Extrair o caminho da primeira pasta
            const path = files[0].webkitRelativePath.split('/')[0]
            localStorage.setItem('youtube-downloader-path', path)
            setCustomPath(path)
            setValue('outputPath', path)
          }
        }

        document.body.appendChild(input)
        input.click()
        document.body.removeChild(input)
      }
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error)
      // Se o usuário cancelou ou erro, não fazer nada
    }
  }

  // Função para resetar para pasta padrão
  const resetToDefaultPath = () => {
    localStorage.removeItem('youtube-downloader-path')
    setCustomPath('')
    setValue('outputPath', defaultPath)
  }

  const onSubmit = async (data: FormData) => {
    try {
      setDownloading(true)
      setError(null)
      setDownloadProgress(0)
      setDownloadSpeed('0 MB/s')
      setTimeRemaining('--:--')

      // Validate URL
      await api.validateUrl(data.url)

      // Get video info if not already fetched
      if (!currentVideo) {
        const videoInfo = await api.getVideoInfo(data.url)
        setCurrentVideo(videoInfo.data)
      }

      const request: DownloadRequest = {
        url: data.url,
        format: data.format,
        quality: isAudioFormat ? undefined : data.quality,
        outputPath: data.outputPath,
        audioOnly: isAudioFormat
      }

      const response = await api.downloadVideo(request)

      if (response.success && response.downloadId) {
        setCurrentDownloadId(response.downloadId)

        // Track real download progress
        const videoTitle = currentVideo?.title || 'Vídeo'
        const interval = trackDownloadProgress(response.downloadId, videoTitle, data.format, data.quality)
        setPollingInterval(interval as unknown as number)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer download')
      setDownloading(false)
    }
  }

  const formatLabel = formats.find(f => f.value === selectedFormat)?.label || 'MP4'
  const qualityLabel = qualities.find(q => q.value === selectedQuality)?.label || 'Melhor Disponível'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* URL Input with validation */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-light text-slate-300 mb-3">
          <Youtube className="w-4 h-4 text-slate-400" />
          URL do YouTube
          {isValidUrl === true && <CheckCircle className="w-4 h-4 text-emerald-400 animate-pulse" />}
          {isValidUrl === false && <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />}
        </label>
        <div className="relative">
          <input
            type="text"
            {...register('url', {
              required: 'URL é obrigatória',
              pattern: {
                value: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
                message: 'URL do YouTube inválida'
              }
            })}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`w-full px-4 py-3.5 pr-10 bg-slate-900/70 backdrop-blur-sm border rounded-lg text-white placeholder-slate-500 focus:outline-none transition-all ${
              isValidUrl === true ? 'border-emerald-500/50 shadow-emerald-500/20 shadow-lg' :
              isValidUrl === false ? 'border-red-500/50 shadow-red-500/20 shadow-lg' :
              'border-slate-700 focus:border-slate-500'
            }`}
          />
          {urlValue && (
            <button
              type="button"
              onClick={() => {
                setValue('url', '')
                setCurrentVideo(null)
                setIsValidUrl(null)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors hover:rotate-90 transform duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {errors.url && (
          <p className="text-red-400 text-sm mt-1">{errors.url.message}</p>
        )}
      </div>

      {/* Format and Quality */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Format Dropdown */}
        <div>
          <label className="flex items-center gap-2 text-sm font-light text-slate-300 mb-3">
            <Film className="w-4 h-4 text-slate-400" />
            Formato
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFormatDropdown(!showFormatDropdown)
                setShowQualityDropdown(false)
              }}
              className="w-full px-4 py-3.5 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded-lg text-white text-left flex items-center justify-between hover:border-slate-500 hover:bg-slate-900/80 transition-all"
            >
              <span className="font-light">{formatLabel}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFormatDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showFormatDropdown && (
              <div className="absolute z-20 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
                {formats.map((format) => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => {
                      setValue('format', format.value as Format)
                      setShowFormatDropdown(false)
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-800 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-slate-300 font-light group-hover:text-white">{format.label}</span>
                    {selectedFormat === format.value && <Check className="w-4 h-4 text-slate-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quality Dropdown */}
        {!isAudioFormat && (
          <div>
            <label className="flex items-center gap-2 text-sm font-light text-slate-300 mb-3">
              <Sparkles className="w-4 h-4 text-slate-400" />
              Qualidade
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowQualityDropdown(!showQualityDropdown)
                  setShowFormatDropdown(false)
                }}
                className="w-full px-4 py-3.5 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded-lg text-white text-left flex items-center justify-between hover:border-slate-500 hover:bg-slate-900/80 transition-all"
              >
                <span className="font-light">{qualityLabel}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showQualityDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showQualityDropdown && (
                <div className="absolute z-20 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
                  {qualities.map((quality) => (
                    <button
                      key={quality.value}
                      type="button"
                      onClick={() => {
                        setValue('quality', quality.value as VideoQuality)
                        setShowQualityDropdown(false)
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-800 transition-colors flex items-center justify-between group"
                    >
                      <span className="text-slate-300 font-light group-hover:text-white">{quality.label}</span>
                      {selectedQuality === quality.value && <Check className="w-4 h-4 text-slate-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Destination */}
      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm font-light text-slate-300 mb-3">
          <Folder className="w-4 h-4 text-slate-400" />
          Diretório de Destino
          <div className="group relative inline-block">
            <Info className="w-3 h-3 text-slate-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-xs text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-slate-700">
              Pasta onde os vídeos serão salvos
            </div>
          </div>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            {...register('outputPath', { required: 'Diretório é obrigatório' })}
            className="flex-1 px-4 py-3 bg-slate-900 bg-opacity-50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-500 transition-colors"
            readOnly
          />
          <button
            type="button"
            onClick={selectFolder}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors flex items-center gap-2 whitespace-nowrap"
            title="Selecionar pasta"
          >
            <Folder className="w-4 h-4" />
            Escolher
          </button>
          {customPath && (
            <button
              type="button"
              onClick={resetToDefaultPath}
              className="px-3 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-white transition-colors"
              title="Resetar para pasta padrão"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {customPath && (
          <p className="text-emerald-400 text-xs mt-1">📁 Pasta personalizada selecionada</p>
        )}
        {errors.outputPath && (
          <p className="text-red-400 text-sm mt-1">{errors.outputPath.message}</p>
        )}
      </div>

      {/* Download Button - Compact */}
      <button
        type="submit"
        disabled={isDownloading}
        className={`w-full py-3.5 rounded-lg font-light text-base transition-all flex items-center justify-center gap-3 ${
          isDownloading 
            ? 'bg-emerald-600 text-white'
            : 'bg-white text-slate-900 hover:bg-slate-100'
        }`}
      >
        {isDownloading ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            Baixando...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Baixar
          </>
        )}
      </button>
    </form>
  )
}