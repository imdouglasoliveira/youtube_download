const { exec } = require('child_process')

/**
 * Script de limpeza forçada
 * Mata todos os processos relacionados e limpa portas antes de iniciar desenvolvimento
 */

async function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        resolve('') // Não rejeitar, apenas resolver vazio
      } else {
        resolve(stdout)
      }
    })
  })
}

async function forceCleanup() {
  console.log('🧹 Iniciando limpeza forçada...')

  const isWindows = process.platform === 'win32'

  if (isWindows) {
    console.log('🪟 Limpeza Windows...')

    // Kill all node processes
    await execPromise('taskkill /F /IM node.exe /T 2>nul')
    console.log('🔪 Processos node.exe encerrados')

    // Kill all npm processes
    await execPromise('taskkill /F /IM npm.exe /T 2>nul')
    console.log('🔪 Processos npm.exe encerrados')

    // Kill all nodemon processes
    await execPromise('taskkill /F /IM nodemon.exe /T 2>nul')
    console.log('🔪 Processos nodemon.exe encerrados')

    // Kill specific ports
    const ports = [3000, 3001, 5000, 5001, 5002, 5003]
    for (const port of ports) {
      try {
        const result = await execPromise(`netstat -ano | findstr :${port}`)
        if (result) {
          const lines = result.split('\n')
          const pids = new Set()

          lines.forEach(line => {
            const match = line.match(/\s+(\d+)\s*$/)
            if (match && match[1] !== '0') {
              pids.add(match[1])
            }
          })

          for (const pid of pids) {
            await execPromise(`taskkill /F /PID ${pid}`)
          }

          if (pids.size > 0) {
            console.log(`🔧 Porta ${port} liberada (PIDs: ${Array.from(pids).join(', ')})`)
          }
        }
      } catch (error) {
        // Continue mesmo se der erro
      }
    }

    // PowerShell cleanup
    await execPromise(`powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'node' -or $_.ProcessName -eq 'npm' -or $_.ProcessName -eq 'nodemon'} | Stop-Process -Force"`)
    console.log('🔪 PowerShell cleanup executado')

  } else {
    console.log('🐧 Limpeza Unix/Linux...')

    // Kill node processes
    await execPromise('pkill -f node')
    console.log('🔪 Processos node encerrados')

    // Kill npm processes
    await execPromise('pkill -f npm')
    console.log('🔪 Processos npm encerrados')

    // Kill specific ports
    const ports = [3000, 3001, 5000, 5001, 5002, 5003]
    for (const port of ports) {
      try {
        const result = await execPromise(`lsof -ti:${port}`)
        if (result) {
          const pids = result.trim().split('\n').filter(Boolean)
          if (pids.length > 0) {
            await execPromise(`kill -9 ${pids.join(' ')}`)
            console.log(`🔧 Porta ${port} liberada (PIDs: ${pids.join(', ')})`)
          }
        }
      } catch (error) {
        // Continue mesmo se der erro
      }
    }
  }

  // Wait for processes to actually die
  await new Promise(resolve => setTimeout(resolve, 3000))

  console.log('✅ Limpeza forçada concluída!')
  console.log('💡 Agora você pode executar: npm run dev')
}

if (require.main === module) {
  forceCleanup().catch(error => {
    console.error('❌ Erro durante limpeza:', error.message)
    process.exit(1)
  })
}

module.exports = { forceCleanup }