/**
 * Zod Validation Pipe - Local copy for users package
 * Story 2.1: User CRUD Operations
 *
 * M1 FIX: Declarative validation using Zod schemas
 *
 * This is a local copy to avoid cross-package dependency issues.
 * The pattern is the same as @kgc/auth's ZodValidationPipe.
 */

import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType, ZodError, ZodTypeDef } from 'zod';

/**
 * Generic Zod validation pipe for NestJS
 * Validates input against a Zod schema and throws BadRequestException on failure
 *
 * Uses relaxed generic constraints to support schemas with transforms
 * (where input type differs from output type, e.g., query string to number)
 */
export class ZodValidationPipe<TOutput, TDef extends ZodTypeDef = ZodTypeDef, TInput = TOutput>
  implements PipeTransform<unknown, TOutput>
{
  constructor(private readonly schema: ZodType<TOutput, TDef, TInput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Érvénytelen bemenet', // Hungarian: Invalid input
        details: this.formatZodError(result.error),
      });
    }

    return result.data;
  }

  /**
   * Format Zod errors into a structured object
   */
  private formatZodError(error: ZodError): Record<string, string> {
    const formatted: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      formatted[path] = issue.message;
    }
    return formatted;
  }
}
