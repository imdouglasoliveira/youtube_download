import { Download } from 'lucide-react'
import { useDownloadStore } from '@/stores/download'

export function DownloadProgress() {
  const {
    isDownloading,
    downloadProgress,
    downloadSpeed,
    timeRemaining,
    currentVideo
  } = useDownloadStore()

  if (!isDownloading) return null

  return (
    <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50" style={{ animation: 'slideDown 0.3s ease-out' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <Download className="w-4 h-4 text-emerald-400 animate-bounce" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Baixando vídeo...</p>
            <p className="text-xs text-slate-400">{currentVideo?.title || 'Carregando...'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-emerald-400 font-medium">{downloadProgress.toFixed(1)}%</p>
          <p className="text-xs text-slate-400">{timeRemaining}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${downloadProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            {downloadSpeed}
          </span>
          <span>Baixando...</span>
        </div>
      </div>
    </div>
  )
}