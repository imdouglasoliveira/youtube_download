import type {
  DownloadRequest,
  DownloadResponse,
  VideoInfo,
  DownloadProgress
} from '@youtube-dl/shared'

// Configuração dinâmica de URL da API baseada no ambiente
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_BACKEND_PORT ?
    `http://localhost:${import.meta.env.VITE_BACKEND_PORT}` :
    'http://localhost:5002') // Fallback para porta padrão do desenvolvimento

class ApiService {
  private retryAttempts = 3
  private retryDelay = 1000 // 1 segundo

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    attempt = 1
  ): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Request failed')
      }

      return response.json()
    } catch (error) {
      if (attempt < this.retryAttempts && error instanceof Error) {
        console.warn(`Tentativa ${attempt} falhou, tentando novamente em ${this.retryDelay}ms...`)
        await this.sleep(this.retryDelay * attempt) // Backoff exponencial
        return this.request(endpoint, options, attempt + 1)
      }
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        timeout: 5000
      } as RequestInit)
      return true
    } catch {
      return false
    }
  }

  async downloadVideo(request: DownloadRequest): Promise<DownloadResponse> {
    return this.request<DownloadResponse>('/download', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  async getVideoInfo(url: string): Promise<{ success: boolean; data: VideoInfo }> {
    return this.request<{ success: boolean; data: VideoInfo }>(
      `/info?url=${encodeURIComponent(url)}`
    )
  }

  async getDownloadProgress(id: string): Promise<{ success: boolean; data: DownloadProgress }> {
    return this.request<{ success: boolean; data: DownloadProgress }>(
      `/progress/${id}`
    )
  }

  async validateUrl(url: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/validate', {
      method: 'POST',
      body: JSON.stringify({ url })
    })
  }

  async getAvailableFormats(): Promise<{
    success: boolean
    data: {
      video: string[]
      audio: string[]
      quality: string[]
    }
  }> {
    return this.request('/formats')
  }

  async getDefaultPath(): Promise<{ success: boolean; data: { path: string } }> {
    return this.request<{ success: boolean; data: { path: string } }>('/default-path')
  }
}

export const api = new ApiService()