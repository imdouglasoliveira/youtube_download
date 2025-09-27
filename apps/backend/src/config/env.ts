import dotenv from 'dotenv'
import path from 'path'
import os from 'os'
import fs from 'fs'

dotenv.config()

// Função para carregar configuração de portas
function loadPortsConfig() {
  try {
    const portsConfigPath = path.join(__dirname, '../../../../config/ports.json')
    console.log('DEBUG: Tentando carregar ports.json de:', portsConfigPath)
    const portsConfig = JSON.parse(fs.readFileSync(portsConfigPath, 'utf8'))
    console.log('DEBUG: ports.json carregado com sucesso:', portsConfig)
    const env = process.env.NODE_ENV || 'development'
    console.log('DEBUG: Ambiente atual:', env)
    const result = portsConfig[env] || portsConfig.development
    console.log('DEBUG: Configuração escolhida:', result)
    return result
  } catch (error) {
    console.warn('Could not load ports.json, using fallback configuration. Error:', (error as Error).message)
    return null
  }
}

// Função para detectar configuração dinâmica de CORS
function getCorsOrigin() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  }

  // Usar configuração centralizada de ports.json
  const portsConfig = loadPortsConfig()
  if (portsConfig?.frontend?.port) {
    const frontendPort = portsConfig.frontend.port
    const frontendHost = portsConfig.frontend.host || 'localhost'

    return [
      `http://${frontendHost}:${frontendPort}`,
      `http://127.0.0.1:${frontendPort}`,
      'http://localhost:3000', // Fallback Vite padrão
      'http://localhost:3001', // Fallback backup
      'http://localhost:5173', // Fallback Vite alternativo
    ]
  }

  // Fallback original se ports.json não existir
  const frontendPort = process.env.FRONTEND_PORT || '3001'
  return [
    `http://localhost:${frontendPort}`,
    `http://127.0.0.1:${frontendPort}`,
    'http://localhost:3000', // Vite padrão - PRINCIPAL
    'http://localhost:3001', // Backup
    'http://localhost:5173', // Vite padrão alternativo
  ]
}

// Função para obter porta do backend a partir do ports.json
function getBackendPort(): number {
  console.log('DEBUG: getBackendPort chamada')
  if (process.env.PORT) {
    console.log('DEBUG: Usando PORT do env:', process.env.PORT)
    return parseInt(process.env.PORT)
  }

  console.log('DEBUG: PORT não definido no env, carregando de ports.json')
  const portsConfig = loadPortsConfig()
  console.log('DEBUG: portsConfig retornado:', portsConfig)
  if (portsConfig?.backend?.port) {
    console.log('DEBUG: Usando porta do ports.json:', portsConfig.backend.port)
    return portsConfig.backend.port
  }

  // Fallback para porta padrão
  console.log('DEBUG: Usando fallback porta 5001')
  return 5001
}

export const config = {
  port: getBackendPort(),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: getCorsOrigin(),
  defaultDownloadPath: process.env.DEFAULT_DOWNLOAD_PATH || path.join(os.homedir(), 'Downloads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5368709120'),
  allowedFormats: (process.env.ALLOWED_FORMATS || 'mp4,webm,mkv,avi,mp3,aac,flac,wav').split(','),
  ytDlpPath: process.env.YT_DLP_PATH || 'python -m yt_dlp'
}