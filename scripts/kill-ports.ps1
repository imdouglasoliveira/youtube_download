param([switch]$Force)

$ErrorActionPreference = "SilentlyContinue"

$BACKEND_PORT = 5000
$FRONTEND_PORT = 3000

function Kill-ProcessOnPort {
    param($Port)

    Write-Host "Verificando porta $Port..." -ForegroundColor Yellow

    # Método 1: netstat com regex mais abrangente
    $netstatResult = netstat -ano | Where-Object { $_ -match ":$Port\s" }
    $pids = @()

    if ($netstatResult) {
        foreach ($line in $netstatResult) {
            if ($line -match '\s+(\d+)\s*$') {
                $pids += $matches[1]
            }
        }
    }

    # Método 2: Get-NetTCPConnection (mais confiável no Windows 10+)
    try {
        $tcpConnections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($conn in $tcpConnections) {
            if ($conn.OwningProcess -and $conn.OwningProcess -notin $pids) {
                $pids += $conn.OwningProcess
            }
        }
    } catch {
        # Falback para netstat apenas
    }

    # Remover duplicatas
    $pids = $pids | Sort-Object -Unique

    if ($pids.Count -gt 0) {
        foreach ($pid in $pids) {
            try {
                $process = Get-Process -Id $pid -ErrorAction Stop
                Write-Host "Matando processo $($process.ProcessName) (PID: $pid) na porta $Port" -ForegroundColor Red
                Stop-Process -Id $pid -Force
                Write-Host "Processo na porta $Port encerrado" -ForegroundColor Green
            } catch {
                Write-Host "Processo PID $pid ja foi encerrado ou nao acessivel" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Porta $Port esta livre" -ForegroundColor Green
    }
}

function Kill-NodeProcesses {
    Write-Host "Procurando processos Node.js..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Matando $($nodeProcesses.Count) processo(s) Node.js" -ForegroundColor Red
        $nodeProcesses | Stop-Process -Force
        Write-Host "Processos Node.js encerrados" -ForegroundColor Green
    } else {
        Write-Host "Nenhum processo Node.js encontrado" -ForegroundColor Green
    }
}

function Kill-ViteProcesses {
    Write-Host "Procurando processos Vite..." -ForegroundColor Yellow
    # Procurar por processos que contenham "vite" no comando
    $viteProcesses = Get-WmiObject Win32_Process | Where-Object {
        $_.CommandLine -and ($_.CommandLine -like "*vite*" -or $_.ProcessName -eq "vite.exe")
    }
    if ($viteProcesses) {
        foreach ($proc in $viteProcesses) {
            try {
                Write-Host "Matando processo Vite (PID: $($proc.ProcessId))" -ForegroundColor Red
                Stop-Process -Id $proc.ProcessId -Force
            } catch {
                Write-Host "Processo Vite PID $($proc.ProcessId) ja foi encerrado" -ForegroundColor Yellow
            }
        }
        Write-Host "Processos Vite encerrados" -ForegroundColor Green
    } else {
        Write-Host "Nenhum processo Vite encontrado" -ForegroundColor Green
    }
}

Write-Host "YouTube Downloader - Limpeza de Portas" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Primeira passada - matar processos específicos nas portas
Kill-ProcessOnPort $BACKEND_PORT
Kill-ProcessOnPort $FRONTEND_PORT

if ($Force) {
    Kill-NodeProcesses
    Kill-ViteProcesses
}

# Aguardar para garantir que os processos foram encerrados
Start-Sleep -Seconds 2

# Segunda verificação para garantir que as portas estão livres
Write-Host ""
Write-Host "Verificacao final..." -ForegroundColor Cyan

$finalCheck5000 = netstat -ano | Where-Object { $_ -match ":$BACKEND_PORT\s" }
$finalCheck3000 = netstat -ano | Where-Object { $_ -match ":$FRONTEND_PORT\s" }

if ($finalCheck5000) {
    Write-Host "AVISO: Porta $BACKEND_PORT ainda tem processos!" -ForegroundColor Red
} else {
    Write-Host "Porta $BACKEND_PORT confirmada livre" -ForegroundColor Green
}

if ($finalCheck3000) {
    Write-Host "AVISO: Porta $FRONTEND_PORT ainda tem processos!" -ForegroundColor Red
} else {
    Write-Host "Porta $FRONTEND_PORT confirmada livre" -ForegroundColor Green
}

Write-Host ""
Write-Host "Limpeza concluida!" -ForegroundColor Green
Write-Host ""