/**
 * Zod Validation Pipe - NestJS pipe for Zod schema validation
 * Refactor: Replace manual validation in controllers with declarative pipe
 *
 * Usage:
 * @Post()
 * async createUser(
 *   @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
 * )
 *
 * Benefits:
 * - DRY: No repeated validation code in every endpoint
 * - NestJS native: Works with exception filters and interceptors
 * - Type-safe: Zod schema inference ensures DTO types match
 * - Consistent errors: Standardized error format across all endpoints
 */

import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation error response format per project conventions
 */
export interface ZodValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

/**
 * Generic Zod validation pipe for NestJS
 * @template T - The Zod schema type
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    // Transform Zod errors to our standard format
    const validationError = this.formatZodError(result.error);
    throw new BadRequestException(validationError);
  }

  /**
   * Format Zod error to our standard validation error format
   */
  private formatZodError(zodError: ZodError): ZodValidationError {
    const fields: Record<string, string> = {};

    for (const issue of zodError.issues) {
      const path = issue.path.join('.') || '_root';
      fields[path] = issue.message;
    }

    return {
      code: 'VALIDATION_ERROR',
      message: 'Érvénytelen bemenet', // Hungarian: Invalid input
      fields,
    };
  }
}

/**
 * Factory function to create ZodValidationPipe with type inference
 * @param schema - Zod schema to validate against
 * @returns Configured ZodValidationPipe
 */
export function createZodPipe<T>(schema: ZodSchema<T>): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}
