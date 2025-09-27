#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Carregar configurações de porta
const portsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/ports.json'), 'utf8'));

function configureEnvironment(environment = 'development') {
  console.log(`🔧 Configurando ambiente: ${environment}`);

  const config = portsConfig[environment];
  if (!config) {
    console.error(`❌ Ambiente '${environment}' não encontrado`);
    process.exit(1);
  }

  // Configurar backend
  const backendEnvPath = path.join(__dirname, '../apps/backend/.env');
  const frontendUrl = `http://${config.frontend.host}:${config.frontend.port}`;

  const backendEnvContent = `PORT=${config.backend.port}
NODE_ENV=${environment}
CORS_ORIGIN=${frontendUrl}
DEFAULT_DOWNLOAD_PATH=C:\\\\Users\\\\dsoliveira\\\\Videos\\\\YouTube_Downloads
MAX_FILE_SIZE=5368709120
ALLOWED_FORMATS=mp4,webm,mkv,avi,mp3,aac,flac,wav
YT_DLP_PATH=python -m yt_dlp
`;

  fs.writeFileSync(backendEnvPath, backendEnvContent);
  console.log(`✅ Backend configurado: porta ${config.backend.port}, CORS: ${frontendUrl}`);

  // Configurar frontend
  const frontendEnvPath = path.join(__dirname, '../apps/frontend/.env');
  const backendUrl = `http://${config.backend.host}:${config.backend.port}`;

  const frontendEnvContent = `VITE_API_URL=${backendUrl}
VITE_APP_TITLE=YouTube Downloader
VITE_ENV=${environment}
`;

  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log(`✅ Frontend configurado: API URL: ${backendUrl}`);

  // Atualizar package.json com scripts dinâmicos
  updatePackageJsonScripts(config);

  console.log(`🎉 Configuração completa para ambiente '${environment}'!`);
  console.log(`📡 Backend: http://${config.backend.host}:${config.backend.port}`);
  console.log(`🌐 Frontend: http://${config.frontend.host}:${config.frontend.port}`);
}

function updatePackageJsonScripts(config) {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Atualizar scripts com portas corretas
  packageJson.scripts = {
    ...packageJson.scripts,
    "dev:backend": `cd apps/backend && npm run dev`,
    "dev:frontend": `cd apps/frontend && npm run dev -- --port ${config.frontend.port}`,
    "dev": `concurrently "npm run dev:backend" "npm run dev:frontend"`,
    "configure": "node scripts/configure-env.js",
    "configure:prod": "node scripts/configure-env.js production",
    "configure:test": "node scripts/configure-env.js testing"
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`✅ Scripts do package.json atualizados`);
}

// Executar configuração
const environment = process.argv[2] || 'development';
configureEnvironment(environment);