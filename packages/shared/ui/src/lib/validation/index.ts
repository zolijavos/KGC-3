import { z, ZodErrorMap, ZodIssueCode } from 'zod';

/**
 * Hungarian error map for Zod validation
 */
export const hungarianErrorMap: ZodErrorMap = (issue, ctx) => {
  let message: string;

  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        message = 'Kötelező mező';
      } else {
        message = `Érvénytelen típus: ${issue.expected} helyett ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        message = 'Érvénytelen email cím';
      } else if (issue.validation === 'url') {
        message = 'Érvénytelen URL';
      } else if (issue.validation === 'uuid') {
        message = 'Érvénytelen UUID';
      } else if (issue.validation === 'regex') {
        message = 'Érvénytelen formátum';
      } else {
        message = 'Érvénytelen szöveg';
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === 'string') {
        if (issue.minimum === 1) {
          message = 'Kötelező mező';
        } else {
          message = `Minimum ${issue.minimum} karakter`;
        }
      } else if (issue.type === 'number') {
        if (issue.inclusive) {
          message = `Legalább ${issue.minimum}`;
        } else {
          message = `Nagyobb, mint ${issue.minimum}`;
        }
      } else if (issue.type === 'array') {
        message = `Legalább ${issue.minimum} elem szükséges`;
      } else {
        message = 'Túl kicsi érték';
      }
      break;
    case ZodIssueCode.too_big:
      if (issue.type === 'string') {
        message = `Maximum ${issue.maximum} karakter`;
      } else if (issue.type === 'number') {
        if (issue.inclusive) {
          message = `Legfeljebb ${issue.maximum}`;
        } else {
          message = `Kisebb, mint ${issue.maximum}`;
        }
      } else if (issue.type === 'array') {
        message = `Legfeljebb ${issue.maximum} elem`;
      } else {
        message = 'Túl nagy érték';
      }
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Érvénytelen érték. Választható: ${issue.options.join(', ')}`;
      break;
    case ZodIssueCode.invalid_date:
      message = 'Érvénytelen dátum';
      break;
    default:
      message = ctx.defaultError;
  }

  return { message };
};

// Set global error map
z.setErrorMap(hungarianErrorMap);

/**
 * Common validation schemas with Hungarian error messages
 */
export const commonSchemas = {
  /** Email validation */
  email: z.string().min(1, 'Kötelező mező').email('Érvénytelen email cím'),

  /** Hungarian phone number */
  phone: z
    .string()
    .min(1, 'Kötelező mező')
    .regex(/^(\+36|06)[0-9]{8,9}$/, 'Érvénytelen telefonszám (pl: +36201234567)'),

  /** Hungarian tax number (adószám) */
  taxNumber: z
    .string()
    .regex(/^\d{8}-\d-\d{2}$/, 'Érvénytelen adószám formátum (pl: 12345678-1-12)'),

  /** IBAN number */
  iban: z
    .string()
    .min(15, 'IBAN szám túl rövid')
    .max(34, 'IBAN szám túl hosszú')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Érvénytelen IBAN formátum'),

  /** Password with minimum requirements */
  password: z
    .string()
    .min(8, 'Minimum 8 karakter')
    .max(100, 'Maximum 100 karakter'),

  /** 4-digit PIN */
  pin: z
    .string()
    .length(4, 'A PIN kód 4 számjegyből áll')
    .regex(/^\d{4}$/, 'A PIN kód csak számokat tartalmazhat'),

  /** Required string (non-empty) */
  requiredString: z.string().min(1, 'Kötelező mező'),

  /** Optional string (can be empty) */
  optionalString: z.string().optional(),

  /** Positive number */
  positiveNumber: z.number().positive('Pozitív számot adj meg'),

  /** Non-negative number */
  nonNegativeNumber: z.number().nonnegative('Nem lehet negatív'),

  /** Date (past or present) */
  pastDate: z.date().max(new Date(), 'A dátum nem lehet a jövőben'),

  /** Date (future) */
  futureDate: z.date().min(new Date(), 'A dátum nem lehet a múltban'),

  /** UUID */
  uuid: z.string().uuid('Érvénytelen azonosító'),
};

/**
 * Helper to create a validation schema from an object shape
 */
export function createValidationSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

/**
 * Type helper to infer schema types
 */
export type InferSchema<T extends z.ZodType> = z.infer<T>;

// Re-export zod for convenience
export { z };
