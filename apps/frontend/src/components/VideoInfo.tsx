import { Clock, Eye, User, PlayCircle, HardDrive, CheckCircle } from 'lucide-react'
import { useDownloadStore } from '@/stores/download'
import { useEffect, useState } from 'react'

export function VideoInfo() {
  const { currentVideo, isLoadingInfo } = useDownloadStore()
  const [fileSize, setFileSize] = useState<string>('')

  useEffect(() => {
    if (currentVideo) {
      // Estima tamanho do arquivo baseado na qualidade
      const quality = currentVideo.availableFormats?.[0]?.quality || '720p'
      const duration = currentVideo.duration || 300 // 5 min default
      let estimatedSize = 0

      switch(quality) {
        case '4K':
        case '2160p':
          estimatedSize = duration * 0.45 // MB por segundo em 4K
          break
        case '1080p':
          estimatedSize = duration * 0.15 // MB por segundo em 1080p
          break
        case '720p':
          estimatedSize = duration * 0.08 // MB por segundo em 720p
          break
        case '480p':
          estimatedSize = duration * 0.04 // MB por segundo em 480p
          break
        default:
          estimatedSize = duration * 0.03 // MB por segundo em 360p
      }

      if (estimatedSize > 1000) {
        setFileSize(`${(estimatedSize / 1000).toFixed(1)} GB`)
      } else {
        setFileSize(`${Math.round(estimatedSize)} MB`)
      }
    }
  }, [currentVideo])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const year = dateString.slice(0, 4)
    const month = dateString.slice(4, 6)
    const day = dateString.slice(6, 8)

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`

    return `${day}/${month}/${year}`
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`
    }
    return `${views}`
  }

  // Loading state
  if (isLoadingInfo) {
    return (
      <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700 animate-pulse">
        <div className="flex gap-4">
          <div className="w-40 h-24 bg-slate-800 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentVideo) return null

  return (
    <div className="mb-6 p-4 bg-gradient-to-br from-slate-900/70 to-slate-800/50 rounded-xl border border-slate-700/50 shadow-xl" style={{ animation: 'slideDown 0.3s ease-out' }}>
      <div className="flex gap-4">
        <div className="relative flex-shrink-0 group">
          {currentVideo.thumbnail ? (
            <>
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-40 h-24 object-cover rounded-lg shadow-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/50 transition-colors">
                <PlayCircle className="w-10 h-10 text-white/80 group-hover:scale-110 transition-transform" />
              </div>
            </>
          ) : (
            <div className="w-40 h-24 bg-slate-800/50 rounded-lg flex items-center justify-center">
              <PlayCircle className="w-10 h-10 text-slate-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white mb-2 line-clamp-2">
            {currentVideo.title}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {currentVideo.channel}
            </span>
            {currentVideo.viewCount && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatViews(currentVideo.viewCount)}
              </span>
            )}
            {currentVideo.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(currentVideo.duration)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              ~{fileSize}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Pronto para baixar
            </div>
            {currentVideo.uploadDate && (
              <span className="text-xs text-slate-500">
                {formatDate(currentVideo.uploadDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}