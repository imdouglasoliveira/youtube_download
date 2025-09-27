import { Router } from 'express'
import {
  downloadVideo,
  getVideoInfo,
  getDownloadProgress,
  validateUrl,
  getAvailableFormats,
  getDefaultPath
} from '../controllers/download.controller'

const router: Router = Router()

/**
 * @swagger
 * /api/validate:
 *   post:
 *     summary: Valida uma URL do YouTube
 *     description: Verifica se a URL fornecida é uma URL válida do YouTube
 *     tags: [Validation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationRequest'
 *     responses:
 *       200:
 *         description: URL válida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Valid YouTube URL"
 *       400:
 *         description: URL inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               error: "Invalid YouTube URL"
 */
router.post('/validate', validateUrl)

/**
 * @swagger
 * /api/info:
 *   get:
 *     summary: Obtém informações do vídeo
 *     description: Retorna metadados detalhados de um vídeo do YouTube
 *     tags: [Video Info]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: URL do vídeo do YouTube
 *         example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *     responses:
 *       200:
 *         description: Informações do vídeo obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VideoInfo'
 *       400:
 *         description: URL inválida ou erro ao obter informações
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/info', getVideoInfo)

/**
 * @swagger
 * /api/download:
 *   post:
 *     summary: Inicia o download de um vídeo
 *     description: Inicia o processo de download de um vídeo do YouTube
 *     tags: [Download]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DownloadRequest'
 *     responses:
 *       200:
 *         description: Download iniciado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 downloadId:
 *                   type: string
 *                 filePath:
 *                   type: string
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro durante o download
 */
router.post('/download', downloadVideo)

/**
 * @swagger
 * /api/progress/{id}:
 *   get:
 *     summary: Consulta o progresso de um download
 *     description: Retorna o status atual e progresso de um download específico
 *     tags: [Download]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do download
 *     responses:
 *       200:
 *         description: Progresso do download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DownloadProgress'
 *       404:
 *         description: Download não encontrado
 */
router.get('/progress/:id', getDownloadProgress)

/**
 * @swagger
 * /api/formats:
 *   get:
 *     summary: Lista formatos disponíveis
 *     description: Retorna a lista de formatos de vídeo e áudio suportados
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Lista de formatos disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     video:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["mp4", "webm", "mkv", "avi"]
 *                     audio:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["mp3", "aac", "flac", "wav"]
 */
router.get('/formats', getAvailableFormats)

/**
 * @swagger
 * /api/default-path:
 *   get:
 *     summary: Obtém o diretório de download padrão
 *     description: Retorna o caminho padrão da pasta Downloads do usuário
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Caminho padrão obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     path:
 *                       type: string
 */
router.get('/default-path', getDefaultPath)

export default router