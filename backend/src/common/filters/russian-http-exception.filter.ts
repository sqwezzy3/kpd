import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

const ERROR_TITLES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Некорректный запрос',
  [HttpStatus.UNAUTHORIZED]: 'Не авторизован',
  [HttpStatus.FORBIDDEN]: 'Доступ запрещён',
  [HttpStatus.NOT_FOUND]: 'Не найдено',
  [HttpStatus.CONFLICT]: 'Конфликт',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Необрабатываемый объект',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Внутренняя ошибка сервера',
};

const DEFAULT_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Некорректный запрос',
  [HttpStatus.UNAUTHORIZED]: 'Необходима авторизация',
  [HttpStatus.FORBIDDEN]: 'Доступ запрещён',
  [HttpStatus.NOT_FOUND]: 'Ресурс не найден',
  [HttpStatus.CONFLICT]: 'Конфликт данных',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Внутренняя ошибка сервера',
};

const ENGLISH_DEFAULT_MESSAGES = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Conflict',
  'Unprocessable Entity',
  'Internal Server Error',
]);

export function capitalizeMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('ru-RU') + trimmed.slice(1);
}

function normalizeMessage(
  raw: string,
  status: number,
): string {
  if (ENGLISH_DEFAULT_MESSAGES.has(raw)) {
    return DEFAULT_MESSAGES[status] ?? 'Произошла ошибка';
  }
  return capitalizeMessage(raw);
}

@Catch(HttpException)
export class RussianHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[] =
      DEFAULT_MESSAGES[status] ?? 'Произошла ошибка';

    if (typeof exceptionResponse === 'string') {
      message = normalizeMessage(exceptionResponse, status);
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const body = exceptionResponse as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.map((item) =>
          normalizeMessage(String(item), status),
        );
      } else if (typeof body.message === 'string') {
        message = normalizeMessage(body.message, status);
      }
    }

    response.status(status).json({
      statusCode: status,
      error: ERROR_TITLES[status] ?? 'Ошибка',
      message,
    });
  }
}
