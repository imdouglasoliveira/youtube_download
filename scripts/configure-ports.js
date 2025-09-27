const fs = require('fs')
const path = require('path')

/**
 * Script de configuração automática de portas
 * Lê config/ports.json e configura variáveis de ambiente
 */

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'ports.json')
const ENV_FRONTEND_PATH = path.join(__dirname, '..', 'apps', 'frontend', '.env.local')
const ENV_BACKEND_PATH = path.join(__dirname, '..', 'apps', 'backend', '.env.local')

function loadPortsConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(`Arquivo de configuração não encontrado: ${CONFIG_PATH}`)
    }

    const configData = fs.readFileSync(CONFIG_PATH, 'utf8')
    return JSON.parse(configData)
  } catch (error) {
    console.error('❌ Erro ao carregar configuração de portas:', error.message)
    process.exit(1)
  }
}

function createEnvContent(environment, config) {
  const { backend, frontend } = config[environment]

  const backendUrl = `http://${backend.host}:${backend.port}`
  const frontendUrl = `http://${frontend.host}:${frontend.port}`

  return {
    frontend: `# Configuração automática de portas - ${environment.toUpperCase()}
# Este arquivo é gerado automaticamente por scripts/configure-ports.js
# Não edite manualmente - faça alterações em config/ports.json

VITE_API_URL=${backendUrl}
VITE_FRONTEND_URL=${frontendUrl}
VITE_ENVIRONMENT=${environment}
VITE_BACKEND_PORT=${backend.port}
VITE_FRONTEND_PORT=${frontend.port}
`,
    backend: `# Configuração automática de portas - ${environment.toUpperCase()}
# Este arquivo é gerado automaticamente por scripts/configure-ports.js
# Não edite manualmente - faça alterações em config/ports.json

PORT=${backend.port}
HOST=${backend.host}
FRONTEND_URL=${frontendUrl}
BACKEND_URL=${backendUrl}
ENVIRONMENT=${environment}
CORS_ORIGIN=${frontendUrl}
`
  }
}

function writeEnvFile(filePath, content) {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Configuração criada: ${path.relative(process.cwd(), filePath)}`)
  } catch (error) {
    console.error(`❌ Erro ao criar ${filePath}:`, error.message)
    throw error
  }
}

function validatePorts(config, environment) {
  const { backend, frontend } = config[environment]

  if (!backend || !frontend) {
    throw new Error(`Configuração incompleta para ambiente: ${environment}`)
  }

  if (!backend.port || !frontend.port) {
    throw new Error(`Portas não definidas para ambiente: ${environment}`)
  }

  if (backend.port === frontend.port) {
    throw new Error(`Conflito de portas: backend e frontend não podem usar a mesma porta (${backend.port})`)
  }

  console.log(`🔍 Validação OK para ${environment}:`)
  console.log(`   Backend: ${backend.host}:${backend.port}`)
  console.log(`   Frontend: ${frontend.host}:${frontend.port}`)
}

function main() {
  const environment = process.argv[2] || 'development'

  console.log('🔧 Configurando portas para ambiente:', environment.toUpperCase())
  console.log('📂 Carregando configuração de:', CONFIG_PATH)

  const config = loadPortsConfig()

  if (!config[environment]) {
    console.error(`❌ Ambiente não encontrado: ${environment}`)
    console.log('Ambientes disponíveis:', Object.keys(config).join(', '))
    process.exit(1)
  }

  try {
    validatePorts(config, environment)

    const envContent = createEnvContent(environment, config)

    writeEnvFile(ENV_FRONTEND_PATH, envContent.frontend)
    writeEnvFile(ENV_BACKEND_PATH, envContent.backend)

    console.log('🎉 Configuração de portas concluída com sucesso!')
    console.log('💡 Execute `pnpm dev` para iniciar o desenvolvimento')

  } catch (error) {
    console.error('❌ Erro durante configuração:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { loadPortsConfig, createEnvContent, validatePorts }