#!/bin/bash

# Script para matar processos nas portas padrão do projeto
set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Portas padrão do projeto
BACKEND_PORT=5000
FRONTEND_PORT=3000

kill_process_on_port() {
    local port=$1
    echo -e "${YELLOW}🔍 Verificando porta $port...${NC}"

    # Encontrar PID na porta
    local pid=$(lsof -ti:$port 2>/dev/null || true)

    if [ -n "$pid" ]; then
        echo -e "${RED}🔪 Matando processo(s) PID $pid na porta $port${NC}"
        kill -9 $pid 2>/dev/null || true
        echo -e "${GREEN}✅ Processo na porta $port encerrado com sucesso${NC}"
    else
        echo -e "${GREEN}✅ Porta $port está livre${NC}"
    fi
}

kill_node_processes() {
    echo -e "${YELLOW}🔍 Procurando processos Node.js...${NC}"
    local node_pids=$(pgrep node 2>/dev/null || true)

    if [ -n "$node_pids" ]; then
        echo -e "${RED}🔪 Matando processos Node.js: $node_pids${NC}"
        pkill -f node 2>/dev/null || true
        echo -e "${GREEN}✅ Processos Node.js encerrados${NC}"
    else
        echo -e "${GREEN}✅ Nenhum processo Node.js encontrado${NC}"
    fi
}

echo -e "${CYAN}🚀 YouTube Downloader - Limpeza de Portas${NC}"
echo -e "${CYAN}===========================================${NC}"

# Matar processos nas portas específicas
kill_process_on_port $BACKEND_PORT
kill_process_on_port $FRONTEND_PORT

# Se --force for passado, mata todos os processos Node
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    kill_node_processes
fi

echo ""
echo -e "${GREEN}🎉 Limpeza concluída! As portas $BACKEND_PORT e $FRONTEND_PORT estão livres.${NC}"
echo ""