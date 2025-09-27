import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Evitar múltiplas respostas
  if (res.headersSent) {
    return
  }

  if (err instanceof AppError) {
    logger.error({
      message: err.message,
      statusCode: err.statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.url,
      method: req.method,
      query: req.query,
      body: req.body
    })

    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
  }

  // Erro não tratado
  logger.error({
    message: err.message || 'Unknown error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    query: req.query,
    body: req.body,
    type: 'UNHANDLED_ERROR'
  })

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development'
      ? err.message || 'Internal server error'
      : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}