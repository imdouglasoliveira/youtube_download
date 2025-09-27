import { Clock, CheckCircle } from 'lucide-react'
import { useDownloadStore } from '@/stores/download'

export function RecentDownloads() {
  const { recentDownloads } = useDownloadStore()

  if (recentDownloads.length === 0) return null

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <h3 className="text-sm font-light text-slate-300 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        Downloads Recentes
      </h3>
      <div className="space-y-2">
        {recentDownloads.map((download, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 hover:bg-slate-900/70 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{download.title}</p>
                <p className="text-xs text-slate-400">{download.format.toUpperCase()} • {download.quality} • {download.size}</p>
              </div>
            </div>
            <span className="text-xs text-slate-500">{download.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}