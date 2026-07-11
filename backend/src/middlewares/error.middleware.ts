import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  let error = { ...err };
  error.message = err.message;

  // Log the detailed error
  logger.error(`${err.message} \nStack: ${err.stack}`);

  // Handle Zod Schema validation errors
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Handle Mongoose cast error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new AppError(message, 404, 'NOT_FOUND');
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate field value entered for: ${field}. Please use another value.`;
    error = new AppError(message, 409, 'DUPLICATE_KEY');
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_SERVER_ERROR';
  const responseMessage = error.message || 'Something went wrong on the server';

  res.status(statusCode).json({
    success: false,
    error: {
      message: responseMessage,
      code: errorCode,
      status: statusCode,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    },
  });
};
