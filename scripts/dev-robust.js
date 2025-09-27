const { spawn, exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { loadPortsConfig, validatePorts } = require('./configure-ports.js')

/**
 * Script de desenvolvimento robusto
 * - Valida configuração
 * - Limpa portas se necessário
 * - Configura ambiente
 * - Inicia serviços com health check
 * - Monitora e recupera automaticamente
 */

class DevManager {
  constructor(environment = 'development') {
    this.environment = environment
    this.config = null
    this.processes = new Map()
    this.healthCheckInterval = null
    this.isShuttingDown = false
    this.backendRestartCount = 0
    this.maxRestarts = 5 // Limit restart attempts
    this.lastRestartTime = 0
    this.minRestartInterval = 30000 // 30 seconds minimum between restarts
    this.oomDetected = false
  }

  async initialize() {
    console.log('🚀 Iniciando YouTube Downloader em modo', this.environment.toUpperCase())

    try {
      // 1. Carregar e validar configuração
      await this.loadConfig()

      // 2. Limpar portas se necessário
      await this.cleanPorts()

      // 3. Configurar ambiente
      await this.configureEnvironment()

      // 4. Iniciar serviços
      await this.startServices()

      // 5. Configurar monitoramento
      this.setupMonitoring()

      console.log('✅ Todos os serviços iniciados com sucesso!')
      console.log(`📱 Frontend: http://${this.config.frontend.host}:${this.config.frontend.port}`)
      console.log(`🔧 Backend:  http://${this.config.backend.host}:${this.config.backend.port}`)

    } catch (error) {
      console.error('❌ Erro durante inicialização:', error.message)
      await this.cleanup()
      process.exit(1)
    }
  }

  async loadConfig() {
    console.log('📋 Carregando configuração...')
    const allConfig = loadPortsConfig()

    if (!allConfig[this.environment]) {
      throw new Error(`Ambiente não encontrado: ${this.environment}`)
    }

    this.config = allConfig[this.environment]
    validatePorts({ [this.environment]: this.config }, this.environment)
  }

  async cleanPorts() {
    console.log('🧹 Verificando e limpando portas...')

    const portsToCheck = [this.config.backend.port, this.config.frontend.port]

    for (const port of portsToCheck) {
      try {
        await this.killProcessOnPort(port)
      } catch (error) {
        console.warn(`⚠️  Não foi possível limpar porta ${port}:`, error.message)
      }
    }
  }

  async killProcessOnPort(port) {
    const isWindows = process.platform === 'win32'

    console.log(`🔍 Verificando processos na porta ${port}...`)

    if (isWindows) {
      // Multiple approaches for Windows
      await this.killWindowsProcessOnPort(port)
    } else {
      await this.killUnixProcessOnPort(port)
    }

    // Additional verification with retry
    const maxRetries = 3
    for (let i = 0; i < maxRetries; i++) {
      const isFree = await this.verifyPortFree(port)
      if (isFree) {
        break
      }

      if (i < maxRetries - 1) {
        console.log(`🔄 Porta ${port} ainda ocupada, tentativa ${i + 2}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Try more aggressive cleanup
        if (isWindows) {
          await this.aggressiveWindowsCleanup(port)
        }
      }
    }
  }

  async killWindowsProcessOnPort(port) {
    try {
      // Method 1: netstat + taskkill
      const netstatResult = await this.execPromise(`netstat -ano | findstr :${port}`)
      if (netstatResult) {
        const lines = netstatResult.split('\n')
        const pids = new Set()

        lines.forEach(line => {
          const match = line.match(/\s+(\d+)\s*$/)
          if (match && match[1] !== '0') {
            pids.add(match[1])
          }
        })

        if (pids.size > 0) {
          console.log(`🔍 Encontrados PIDs: ${Array.from(pids).join(', ')}`)

          for (const pid of pids) {
            try {
              await this.execPromise(`taskkill /F /PID ${pid}`)
              console.log(`🔪 Processo ${pid} encerrado`)
            } catch (error) {
              console.warn(`⚠️  Falha ao matar PID ${pid}:`, error.message)
            }
          }
        }
      }

      // Method 2: try killing by port directly (PowerShell)
      try {
        await this.execPromise(`powershell -Command "Get-NetTCPConnection -LocalPort ${port} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`)
        console.log(`🔪 PowerShell kill executado para porta ${port}`)
      } catch (psError) {
        // PowerShell method might fail, that's ok
      }

      // Method 3: npm/node processes cleanup
      try {
        await this.execPromise(`taskkill /F /IM node.exe 2>nul`)
        await this.execPromise(`taskkill /F /IM npm.exe 2>nul`)
        console.log(`🔪 Processos npm/node encerrados`)
      } catch (cleanupError) {
        // This is expected if no processes are running
      }

    } catch (error) {
      console.warn(`⚠️  Erro na limpeza Windows:`, error.message)
    }
  }

  async aggressiveWindowsCleanup(port) {
    console.log(`💣 Executando limpeza agressiva para porta ${port}...`)

    try {
      // Kill all node processes
      await this.execPromise(`wmic process where "name='node.exe'" delete`)
      console.log(`🔪 Todos processos node.exe encerrados`)
    } catch (error) {
      // Expected if no node processes
    }

    try {
      // Kill all npm processes
      await this.execPromise(`wmic process where "name='npm.exe'" delete`)
      console.log(`🔪 Todos processos npm.exe encerrados`)
    } catch (error) {
      // Expected if no npm processes
    }

    try {
      // Kill nodemon specifically
      await this.execPromise(`taskkill /F /IM nodemon.exe 2>nul`)
      console.log(`🔪 Processos nodemon encerrados`)
    } catch (error) {
      // Expected if no nodemon processes
    }

    try {
      // Try to use netsh to reset TCP connections
      await this.execPromise(`netsh int ipv4 reset`)
      console.log(`🔄 TCP stack resetado`)
    } catch (error) {
      // May require admin privileges
    }

    // Wait for network stack to settle
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  async killUnixProcessOnPort(port) {
    try {
      const lsofResult = await this.execPromise(`lsof -ti:${port}`)
      if (lsofResult) {
        const pids = lsofResult.trim().split('\n').filter(Boolean)

        if (pids.length > 0) {
          console.log(`🔍 Encontrados PIDs: ${pids.join(', ')}`)
          await this.execPromise(`kill -9 ${pids.join(' ')}`)
          console.log(`🔪 Processos encerrados: ${pids.join(', ')}`)
        }
      }
    } catch (error) {
      console.warn(`⚠️  Erro na limpeza Unix:`, error.message)
    }
  }

  async verifyPortFree(port) {
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

    try {
      const isWindows = process.platform === 'win32'
      const checkCmd = isWindows ?
        `netstat -ano | findstr :${port}` :
        `lsof -ti:${port}`

      const result = await this.execPromise(checkCmd)

      if (result && result.trim()) {
        console.warn(`⚠️  Porta ${port} ainda ocupada após limpeza`)
        return false
      } else {
        console.log(`✅ Porta ${port} confirmada como livre`)
        return true
      }
    } catch (error) {
      // If command fails, likely means port is free
      console.log(`✅ Porta ${port} livre (comando falhou = boa notícia)`)
      return true
    }
  }

  execPromise(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve(stdout)
        }
      })
    })
  }

  async configureEnvironment() {
    console.log('⚙️  Configurando ambiente...')

    // Executar script de configuração de portas
    return new Promise((resolve, reject) => {
      const configScript = spawn('node', ['scripts/configure-ports.js', this.environment], {
        stdio: 'inherit',
        cwd: process.cwd()
      })

      configScript.on('exit', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Configuração falhou com código ${code}`))
        }
      })
    })
  }

  async startServices() {
    console.log('🔄 Iniciando serviços...')

    // Iniciar backend primeiro
    await this.startBackend()

    // Aguardar backend estar pronto
    await this.waitForBackend()

    // Iniciar frontend
    await this.startFrontend()
  }

  startBackend() {
    return new Promise((resolve, reject) => {
      console.log('🖥️  Iniciando backend...')

      // Configure environment based on OOM detection
      const env = { ...process.env }

      if (this.oomDetected) {
        console.log('⚙️  Configurando backend com limites de memória reduzidos devido a OOM anterior')
        env.NODE_OPTIONS = '--max-old-space-size=512 --max-semi-space-size=64'
        env.UV_THREADPOOL_SIZE = '2'
        // Reset OOM flag after applying settings
        this.oomDetected = false
      } else {
        // Normal memory settings
        env.NODE_OPTIONS = '--max-old-space-size=1024'
        env.UV_THREADPOOL_SIZE = '4'
      }

      const backend = spawn('pnpm', ['run', 'dev:backend:direct'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        shell: true,
        env
      })

      this.processes.set('backend', backend)

      backend.stdout.on('data', (data) => {
        const output = data.toString()
        console.log(`[Backend] ${output.trim()}`)

        if (output.includes('Server running on') || output.includes(`listening on ${this.config.backend.port}`)) {
          resolve()
        }
      })

      backend.stderr.on('data', (data) => {
        const errorText = data.toString().trim()
        console.error(`[Backend Error] ${errorText}`)

        // Detect OOM errors
        if (errorText.includes('out of memory') ||
            errorText.includes('heap out of memory') ||
            errorText.includes('allocation failed') ||
            errorText.includes('FATAL ERROR')) {
          console.error('🚨 Out of Memory detected! Backend será reiniciado com configuração reduzida.')
          this.oomDetected = true
        }
      })

      backend.on('exit', (code) => {
        if (!this.isShuttingDown) {
          console.error(`❌ Backend encerrado inesperadamente com código ${code}`)
          this.handleProcessCrash('backend')
        }
      })

      // Timeout para inicialização
      setTimeout(() => {
        if (this.processes.get('backend')) {
          resolve() // Considera como sucesso mesmo sem confirmação específica
        }
      }, 10000)
    })
  }

  async waitForBackend() {
    console.log('⏳ Aguardando backend estar pronto...')

    const maxAttempts = 30
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://${this.config.backend.host}:${this.config.backend.port}/health`)
        if (response.ok) {
          console.log('✅ Backend está respondendo')
          return
        }
      } catch {
        // Ignorar erros, continuar tentando
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }

    console.warn('⚠️  Backend pode não estar totalmente pronto, mas continuando...')
  }

  startFrontend() {
    return new Promise((resolve) => {
      console.log('🌐 Iniciando frontend...')

      const frontend = spawn('pnpm', ['run', 'dev:frontend:direct'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        shell: true
      })

      this.processes.set('frontend', frontend)

      frontend.stdout.on('data', (data) => {
        const output = data.toString()
        console.log(`[Frontend] ${output.trim()}`)

        if (output.includes('Local:') || output.includes('ready in')) {
          resolve()
        }
      })

      frontend.stderr.on('data', (data) => {
        console.error(`[Frontend Error] ${data.toString().trim()}`)
      })

      frontend.on('exit', (code) => {
        if (!this.isShuttingDown) {
          console.error(`❌ Frontend encerrado inesperadamente com código ${code}`)
          this.handleProcessCrash('frontend')
        }
      })

      // Timeout para inicialização
      setTimeout(() => resolve(), 10000)
    })
  }

  setupMonitoring() {
    console.log('👀 Configurando monitoramento...')

    // Health check periódico (com delay inicial)
    setTimeout(() => {
      this.healthCheckInterval = setInterval(async () => {
        if (this.isShuttingDown) return

        try {
          const response = await fetch(`http://${this.config.backend.host}:${this.config.backend.port}/health`)
          if (!response.ok) {
            throw new Error('Health check failed')
          }
        } catch {
          console.warn('⚠️  Backend não está respondendo, tentando recuperar...')
          this.handleProcessCrash('backend')
        }
      }, 45000) // Check a cada 45 segundos
    }, 60000) // Aguardar 60 segundos antes de iniciar health checks

    // Handlers de shutdown
    process.on('SIGINT', () => this.cleanup())
    process.on('SIGTERM', () => this.cleanup())
    process.on('beforeExit', () => this.cleanup())
  }

  async handleProcessCrash(serviceName) {
    // Prevent restart loops
    if (serviceName === 'backend') {
      const now = Date.now()

      // Check if we've exceeded restart limits
      if (this.backendRestartCount >= this.maxRestarts) {
        console.error(`❌ Backend excedeu limite máximo de ${this.maxRestarts} reinicializações. Encerrando...`)
        await this.cleanup()
        // Use setTimeout to avoid ReferenceError
        setTimeout(() => {
          require('process').exit(1)
        }, 100)
        return
      }

      // Check minimum interval between restarts
      if (now - this.lastRestartTime < this.minRestartInterval) {
        console.warn(`⏳ Aguardando intervalo mínimo antes de reiniciar (${Math.round((this.minRestartInterval - (now - this.lastRestartTime))/1000)}s)`)
        await new Promise(resolve => setTimeout(resolve, this.minRestartInterval - (now - this.lastRestartTime)))
      }

      this.backendRestartCount++
      this.lastRestartTime = Date.now()
    }

    console.log(`🔄 Tentando recuperar ${serviceName}... (tentativa ${serviceName === 'backend' ? this.backendRestartCount : '1'})`)

    // Kill existing process gracefully
    const process = this.processes.get(serviceName)
    if (process && !process.killed) {
      console.log(`🔪 Encerrando processo ${serviceName} existente...`)
      process.kill('SIGTERM')

      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Force kill if still running
      if (!process.killed) {
        process.kill('SIGKILL')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Clean ports before restart
    if (serviceName === 'backend') {
      console.log('🧹 Limpando porta do backend antes de reiniciar...')
      await this.killProcessOnPort(this.config.backend.port)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    try {
      if (serviceName === 'backend') {
        await this.startBackend()
        await this.waitForBackend()
      } else if (serviceName === 'frontend') {
        await this.startFrontend()
      }

      console.log(`✅ ${serviceName} reiniciado com sucesso`)

      // Reset restart count on successful restart
      if (serviceName === 'backend') {
        this.backendRestartCount = Math.max(0, this.backendRestartCount - 1)
      }
    } catch (error) {
      console.error(`❌ Falha ao reiniciar ${serviceName}:`, error.message)

      if (serviceName === 'backend' && this.backendRestartCount >= this.maxRestarts) {
        console.error('💥 Número máximo de tentativas de restart excedido. Encerrando aplicação.')
        await this.cleanup()
        // Use setTimeout to avoid ReferenceError
        setTimeout(() => {
          require('process').exit(1)
        }, 100)
        return
      }
    }
  }

  async cleanup() {
    if (this.isShuttingDown) return

    this.isShuttingDown = true
    console.log('🧹 Encerrando serviços...')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    for (const [name, process] of this.processes) {
      if (process && !process.killed) {
        console.log(`🔄 Encerrando ${name}...`)
        process.kill('SIGTERM')

        // Force kill após 5 segundos
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL')
          }
        }, 5000)
      }
    }

    this.processes.clear()
    console.log('✅ Cleanup concluído')
  }
}

async function main() {
  const environment = process.argv[2] || 'development'
  const devManager = new DevManager(environment)

  try {
    await devManager.initialize()
  } catch (error) {
    console.error('💥 Falha crítica:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = DevManager