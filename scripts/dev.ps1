# YouTube Downloader Development Script
param(
    [string]$Environment = "development",
    [string]$BackendPort = "",
    [string]$FrontendPort = "",
    [switch]$Configure = $false,
    [switch]$Start = $false,
    [switch]$Help = $false
)

function Show-Help {
    Write-Host "📋 YouTube Downloader - Script de Desenvolvimento" -ForegroundColor Green
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\scripts\dev.ps1 -Configure                    # Configurar ambiente padrão"
    Write-Host "  .\scripts\dev.ps1 -Configure -Environment prod  # Configurar ambiente produção"
    Write-Host "  .\scripts\dev.ps1 -Start                        # Iniciar serviços"
    Write-Host "  .\scripts\dev.ps1 -BackendPort 5001 -FrontendPort 3001 -Start  # Portas customizadas"
    Write-Host ""
    Write-Host "Parâmetros:" -ForegroundColor Yellow
    Write-Host "  -Environment    development|production|testing (padrão: development)"
    Write-Host "  -BackendPort    Porta do backend (sobrescreve configuração)"
    Write-Host "  -FrontendPort   Porta do frontend (sobrescreve configuração)"
    Write-Host "  -Configure      Executar apenas configuração"
    Write-Host "  -Start          Iniciar os serviços"
    Write-Host "  -Help           Mostrar esta ajuda"
}

function Configure-Environment {
    param([string]$Env)

    Write-Host "🔧 Configurando ambiente: $Env" -ForegroundColor Blue

    # Executar script de configuração Node.js
    node scripts/configure-env.js $Env

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Configuração completa!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro na configuração" -ForegroundColor Red
        exit 1
    }
}

function Start-Services {
    param([string]$BPort, [string]$FPort)

    Write-Host "🚀 Iniciando serviços..." -ForegroundColor Blue

    # Matar processos existentes nas portas
    if ($BPort) {
        $backendProcess = Get-NetTCPConnection -LocalPort $BPort -ErrorAction SilentlyContinue
        if ($backendProcess) {
            Write-Host "🔄 Liberando porta $BPort..." -ForegroundColor Yellow
            Stop-Process -Id $backendProcess.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }

    if ($FPort) {
        $frontendProcess = Get-NetTCPConnection -LocalPort $FPort -ErrorAction SilentlyContinue
        if ($frontendProcess) {
            Write-Host "🔄 Liberando porta $FPort..." -ForegroundColor Yellow
            Stop-Process -Id $frontendProcess.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }

    # Construir comandos
    $backendCmd = "cd apps/backend && npm run dev"
    $frontendCmd = "cd apps/frontend && npm run dev"

    if ($BPort) {
        $env:PORT = $BPort
        $backendCmd = "cd apps/backend && set PORT=$BPort && npm run dev"
    }

    if ($FPort) {
        $frontendCmd = "cd apps/frontend && npm run dev -- --port $FPort"
    }

    Write-Host "📡 Iniciando backend..." -ForegroundColor Cyan
    Write-Host "🌐 Iniciando frontend..." -ForegroundColor Cyan

    # Usar concurrently se disponível, senão usar start-process
    if (Get-Command "concurrently" -ErrorAction SilentlyContinue) {
        concurrently "`"$backendCmd`"" "`"$frontendCmd`""
    } else {
        Write-Host "⚠️ Instalando concurrently..." -ForegroundColor Yellow
        npm install -g concurrently
        concurrently "`"$backendCmd`"" "`"$frontendCmd`""
    }
}

# Main logic
if ($Help) {
    Show-Help
    exit 0
}

if ($Configure) {
    Configure-Environment -Env $Environment
}

if ($Start) {
    Start-Services -BPort $BackendPort -FPort $FrontendPort
}

if (!$Configure -and !$Start) {
    Write-Host "⚠️ Nenhuma ação especificada. Use -Help para ver opções." -ForegroundColor Yellow
    Show-Help
}