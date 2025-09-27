import swaggerJsdoc from 'swagger-jsdoc'
import { config } from './env'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'YouTube Downloader API',
      version: '1.0.0',
      description: 'API para download de vídeos do YouTube usando yt-dlp',
      contact: {
        name: 'YouTube Downloader',
        url: 'https://github.com/user/youtube-downloader'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de desenvolvimento'
      }
    ],
    components: {
      schemas: {
        VideoInfo: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Título do vídeo'
            },
            duration: {
              type: 'number',
              description: 'Duração em segundos'
            },
            thumbnail: {
              type: 'string',
              description: 'URL da thumbnail'
            },
            channel: {
              type: 'string',
              description: 'Nome do canal'
            },
            description: {
              type: 'string',
              description: 'Descrição do vídeo'
            },
            uploadDate: {
              type: 'string',
              description: 'Data de upload (YYYYMMDD)'
            },
            viewCount: {
              type: 'number',
              description: 'Número de visualizações'
            },
            availableFormats: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/VideoFormat'
              }
            }
          }
        },
        VideoFormat: {
          type: 'object',
          properties: {
            formatId: {
              type: 'string',
              description: 'ID do formato'
            },
            ext: {
              type: 'string',
              description: 'Extensão do arquivo'
            },
            quality: {
              type: 'string',
              description: 'Qualidade do formato'
            },
            filesize: {
              type: 'number',
              description: 'Tamanho do arquivo em bytes'
            },
            fps: {
              type: 'number',
              description: 'Frames por segundo'
            },
            vcodec: {
              type: 'string',
              description: 'Codec de vídeo'
            },
            acodec: {
              type: 'string',
              description: 'Codec de áudio'
            }
          }
        },
        DownloadRequest: {
          type: 'object',
          required: ['url', 'format'],
          properties: {
            url: {
              type: 'string',
              description: 'URL do vídeo do YouTube',
              example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            format: {
              type: 'string',
              description: 'Formato desejado',
              enum: ['mp4', 'webm', 'mkv', 'avi', 'mp3', 'aac', 'flac', 'wav'],
              example: 'mp4'
            },
            quality: {
              type: 'string',
              description: 'Qualidade do vídeo',
              enum: ['best', '1080p', '720p', '480p', '360p'],
              example: 'best'
            },
            audioOnly: {
              type: 'boolean',
              description: 'Download apenas do áudio',
              default: false
            },
            outputPath: {
              type: 'string',
              description: 'Caminho de saída personalizado'
            }
          }
        },
        DownloadProgress: {
          type: 'object',
          properties: {
            downloadId: {
              type: 'string',
              description: 'ID único do download'
            },
            status: {
              type: 'string',
              enum: ['downloading', 'completed', 'error'],
              description: 'Status atual do download'
            },
            progress: {
              type: 'number',
              description: 'Progresso em porcentagem (0-100)'
            },
            speed: {
              type: 'string',
              description: 'Velocidade de download'
            },
            eta: {
              type: 'string',
              description: 'Tempo estimado para conclusão'
            },
            error: {
              type: 'string',
              description: 'Mensagem de erro, se houver'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica se a operação foi bem-sucedida'
            },
            message: {
              type: 'string',
              description: 'Mensagem de resposta'
            },
            data: {
              description: 'Dados da resposta'
            }
          }
        },
        ValidationRequest: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              description: 'URL do YouTube para validar',
              example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './dist/routes/*.js',
    './dist/controllers/*.js'
  ]
}

export const specs = swaggerJsdoc(options)