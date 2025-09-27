import { DownloadForm } from '@/components/DownloadForm'
import { VideoInfo } from '@/components/VideoInfo'
import { DownloadProgress } from '@/components/DownloadProgress'
import { RecentDownloads } from '@/components/RecentDownloads'
import { useDownloadStore } from '@/stores/download'
import { AlertCircle, Youtube, Shield, Zap, Settings, FileDown } from 'lucide-react'

export function HomePage() {
  const { error } = useDownloadStore()

  const features = [
    { icon: Youtube, text: "Vídeos regulares e Shorts" },
    { icon: Shield, text: "Vídeos privados com link" },
    { icon: Zap, text: "Lives gravadas" },
    { icon: Settings, text: "Qualidade até 4K" }
  ]

  return (
    <div className="w-full space-y-6">
      {/* Header - Centered */}
      <div className="text-center" style={{ animation: 'fadeIn 0.8s ease-out' }}>
        <div className="inline-flex items-center justify-center mb-3">
          <div className="p-3 bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl border border-white border-opacity-10">
            <FileDown className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
          YouTube Downloader
        </h1>
        <p className="text-slate-400 text-base font-light">
          Baixe vídeos do YouTube facilmente
        </p>
      </div>

      {/* Features Pills - Centered */}
      <div className="flex flex-wrap gap-1.5 justify-center" style={{ animation: 'slideUp 0.8s ease-out' }}>
        {features.map((feature, index) => {
          const FeatureIcon = feature.icon
          return (
            <div 
              key={index}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white bg-opacity-5 backdrop-blur-sm rounded-full border border-white border-opacity-10 hover:bg-opacity-10 transition-all"
            >
              <FeatureIcon className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400 font-light">{feature.text}</span>
            </div>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500 bg-opacity-10 backdrop-blur-sm border border-red-500 border-opacity-20 rounded-lg p-3 flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Main Card - Centered */}
      <div className="bg-white bg-opacity-5 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-10" style={{ animation: 'slideUp 0.8s ease-out' }}>
        <VideoInfo />
        <DownloadProgress />
        <DownloadForm />
      </div>

      {/* Recent Downloads */}
      <RecentDownloads />

      {/* Footer Info - Centered */}
      <div className="text-center" style={{ animation: 'fadeIn 0.8s ease-out' }}>
        <p className="text-slate-500 text-xs font-light">
          Suporte para múltiplos formatos de vídeo e áudio
        </p>
      </div>
    </div>
  )
}