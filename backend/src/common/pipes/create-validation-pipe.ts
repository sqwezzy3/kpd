import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { capitalizeMessage } from '../filters/russian-http-exception.filter.js';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      for (const [key, raw] of Object.entries(error.constraints)) {
        if (key === 'whitelistValidation') {
          messages.push(
            capitalizeMessage(`Свойство «${error.property}» недопустимо`),
          );
          continue;
        }
        messages.push(capitalizeMessage(raw));
      }
    }

    if (error.children?.length) {
      messages.push(...flattenValidationErrors(error.children));
    }
  }

  return messages;
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException(flattenValidationErrors(errors)),
  });
}
