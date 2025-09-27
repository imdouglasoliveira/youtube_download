# YouTube Downloader

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Sistema completo para download de vídeos do YouTube com interface web moderna e API robusta.

## 🚀 Características

- **Interface Web Intuitiva**: Frontend React moderno e responsivo
- **API RESTful Completa**: Backend Node.js/TypeScript robusto
- **Download de Alta Qualidade**: Suporte a múltiplos formatos (MP4, WebM, MKV, MP3, etc.)
- **Preview de Vídeos**: Visualização de metadados antes do download
- **Monitoramento de Progresso**: Acompanhamento em tempo real dos downloads
- **Sistema Resiliente**: Recuperação automática de falhas e gerenciamento inteligente de recursos
- **Documentação Swagger**: API totalmente documentada

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js 18+** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Express.js** - Framework web
- **Swagger/OpenAPI** - Documentação da API
- **yt-dlp** - Engine de download de vídeos
- **Python/Poetry** - Gerenciamento de dependências Python

### Frontend
- **React 18** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Vite** - Build tool moderna
- **TailwindCSS** - Framework CSS utilitário

### DevOps & Tooling
- **pnpm** - Gerenciador de pacotes
- **Turbo** - Sistema de build monorepo
- **ESLint** - Linting de código
- **Prettier** - Formatação de código
- **Husky** - Git hooks

## 📋 Pré-requisitos

- **Node.js** 18.0.0 ou superior
- **pnpm** 8.0.0 ou superior
- **Python** 3.8 ou superior
- **Poetry** (para dependências Python)

## 🔧 Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/imdouglasoliveira/youtube_download.git
   cd youtube_download
   ```

2. **Instale as dependências**
   ```bash
   pnpm install
   ```

3. **Configuração automática**
   ```bash
   npm run setup
   ```

## 🚀 Execução

### Desenvolvimento

```bash
# Iniciar ambiente de desenvolvimento completo
npm run dev

# Ou iniciar serviços individualmente
npm run dev:backend    # Backend na porta 5002
npm run dev:frontend   # Frontend na porta 3001
```

### Produção

```bash
# Build do projeto
npm run build

# Configurar para produção
npm run configure:prod

# Iniciar em modo produção
npm run dev:production
```

## 📚 API Endpoints

### Base URL
- **Desenvolvimento**: `http://localhost:5002`
- **Produção**: Configurável via variáveis de ambiente

### Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/health` | Health check do servidor |
| `GET` | `/api-docs` | Documentação Swagger interativa |
| `POST` | `/api/validate` | Validar URL do YouTube |
| `GET` | `/api/info` | Obter informações do vídeo |
| `POST` | `/api/download` | Iniciar download |
| `GET` | `/api/progress/{id}` | Consultar progresso do download |
| `GET` | `/api/formats` | Listar formatos suportados |
| `GET` | `/api/default-path` | Obter pasta de download padrão |

### Exemplos de Uso

#### Obter informações de um vídeo
```bash
curl "http://localhost:5002/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

#### Iniciar download
```bash
curl -X POST "http://localhost:5002/api/download" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "format": "mp4",
    "quality": "720p"
  }'
```

## 📖 Documentação da API

Acesse a documentação interativa do Swagger em:

**http://localhost:5002/api-docs**

A documentação inclui:
- Especificações detalhadas de todos os endpoints
- Exemplos de requisições e respostas
- Schemas de dados
- Interface para testes interativos

## 🏗️ Estrutura do Projeto

```
youtube_download/
├── apps/
│   ├── backend/          # API Node.js/TypeScript
│   └── frontend/         # Interface React/TypeScript
├── packages/
│   ├── shared/           # Tipos e utilitários compartilhados
│   ├── eslint-config/    # Configuração ESLint
│   └── typescript-config/# Configuração TypeScript
├── scripts/              # Scripts de automação
├── docs/                 # Documentação do projeto
└── config/               # Configurações centralizadas
```

## ⚙️ Configuração

### Portas Padrão

| Ambiente | Backend | Frontend |
|----------|---------|----------|
| Development | 5002 | 3001 |
| Production | 8080 | 3000 |
| Testing | 5555 | 3555 |

### Variáveis de Ambiente

As configurações são gerenciadas automaticamente pelo sistema de portas. Para configurações personalizadas:

```bash
# Configurar ambiente específico
npm run configure:dev     # Desenvolvimento
npm run configure:prod    # Produção
npm run configure:test    # Testes
```

## 🛠️ Scripts Disponíveis

### Desenvolvimento
- `npm run dev` - Iniciar desenvolvimento completo
- `npm run dev:clean` - Limpar portas e iniciar
- `npm run configure` - Configurar portas automaticamente

### Build & Deploy
- `npm run build` - Build completo do projeto
- `npm run build:frontend` - Build apenas do frontend
- `npm run build:backend` - Build apenas do backend

### Qualidade de Código
- `npm run lint` - Verificar problemas de linting
- `npm run type-check` - Verificar tipos TypeScript
- `npm run format` - Formatar código com Prettier

### Utilitários
- `npm run kill-ports` - Limpar portas ocupadas
- `npm run clean` - Limpar builds e dependências

## 🔧 Solução de Problemas

### Problemas de Porta
```bash
# Limpar portas ocupadas
npm run kill-ports:force

# Reconfigurar portas
npm run configure
```

### Problemas de Dependências
```bash
# Reinstalar dependências
npm run clean
pnpm install
npm run setup
```

### Logs de Debug
Os logs detalhados são salvos em `docs/logs/logs.txt` durante a execução.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Documentação Adicional

Consulte a pasta `docs/` para documentação técnica detalhada:
- `docs/PORTS_MANAGEMENT.md` - Gerenciamento de portas
- `docs/robust-system.md` - Sistema robusto de desenvolvimento
- `docs/memory-management-fix.md` - Otimizações de memória

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Douglas Oliveira**
- GitHub: [@imdouglasoliveira](https://github.com/imdouglasoliveira)
- Repositório: [youtube_download](https://github.com/imdouglasoliveira/youtube_download)

---

⭐ **Gostou do projeto? Deixe uma estrela no repositório!**