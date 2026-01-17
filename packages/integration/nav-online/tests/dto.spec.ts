/**
 * DTO Validation Tests
 * @package @kgc/nav-online
 */

import { describe, it, expect } from 'vitest';
import { validateCreateInvoice } from '../src/dto/create-invoice.dto';

describe('CreateInvoiceDto', () => {
  const validDto = {
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
    partnerId: '123e4567-e89b-12d3-a456-426614174001',
    paymentMethod: 'készpénz',
    items: [
      {
        name: 'Test Product',
        quantity: 1,
        unit: 'db',
        unitPriceNet: 10000,
        vatRate: '27',
      },
    ],
    createdBy: '123e4567-e89b-12d3-a456-426614174002',
  };

  describe('validateCreateInvoice', () => {
    it('should validate a correct DTO', () => {
      const result = validateCreateInvoice(validDto);

      expect(result.tenantId).toBe(validDto.tenantId);
      expect(result.partnerId).toBe(validDto.partnerId);
      expect(result.type).toBe('CUSTOMER'); // Default value
    });

    it('should reject invalid tenantId', () => {
      const invalidDto = { ...validDto, tenantId: 'not-a-uuid' };

      expect(() => validateCreateInvoice(invalidDto)).toThrow();
    });

    it('should reject empty items array', () => {
      const invalidDto = { ...validDto, items: [] };

      expect(() => validateCreateInvoice(invalidDto)).toThrow();
    });

    it('should reject invalid VAT rate', () => {
      const invalidDto = {
        ...validDto,
        items: [{ ...validDto.items[0], vatRate: '30' }],
      };

      expect(() => validateCreateInvoice(invalidDto)).toThrow();
    });

    it('should reject negative quantity', () => {
      const invalidDto = {
        ...validDto,
        items: [{ ...validDto.items[0], quantity: -1 }],
      };

      expect(() => validateCreateInvoice(invalidDto)).toThrow();
    });

    it('should accept valid VAT rates', () => {
      const vatRates = ['27', '18', '5', '0', 'AAM', 'TAM', 'EU', 'EUK', 'MAA'];

      for (const vatRate of vatRates) {
        const dto = {
          ...validDto,
          items: [{ ...validDto.items[0], vatRate }],
        };

        expect(() => validateCreateInvoice(dto)).not.toThrow();
      }
    });

    it('should accept valid payment methods', () => {
      const paymentMethods = ['készpénz', 'átutalás', 'bankkártya', 'utánvét'];

      for (const paymentMethod of paymentMethods) {
        const dto = { ...validDto, paymentMethod };

        expect(() => validateCreateInvoice(dto)).not.toThrow();
      }
    });

    it('should accept optional fields', () => {
      const dtoWithOptionals = {
        ...validDto,
        rentalId: '123e4567-e89b-12d3-a456-426614174003',
        serviceOrderId: '123e4567-e89b-12d3-a456-426614174004',
        invoiceDate: '2026-01-15',
        notes: 'Test notes',
      };

      const result = validateCreateInvoice(dtoWithOptionals);

      expect(result.rentalId).toBe(dtoWithOptionals.rentalId);
      expect(result.notes).toBe('Test notes');
    });

    it('should coerce date strings to Date objects', () => {
      const dtoWithDates = {
        ...validDto,
        invoiceDate: '2026-01-15',
        fulfillmentDate: '2026-01-15',
        dueDate: '2026-01-23',
      };

      const result = validateCreateInvoice(dtoWithDates);

      expect(result.invoiceDate).toBeInstanceOf(Date);
      expect(result.fulfillmentDate).toBeInstanceOf(Date);
      expect(result.dueDate).toBeInstanceOf(Date);
    });

    it('should accept STORNO type with referenced invoice', () => {
      const stornoDto = {
        ...validDto,
        type: 'STORNO',
        referencedInvoiceId: '123e4567-e89b-12d3-a456-426614174005',
      };

      const result = validateCreateInvoice(stornoDto);

      expect(result.type).toBe('STORNO');
      expect(result.referencedInvoiceId).toBe(stornoDto.referencedInvoiceId);
    });

    it('should reject notes longer than 1000 characters', () => {
      const invalidDto = {
        ...validDto,
        notes: 'x'.repeat(1001),
      };

      expect(() => validateCreateInvoice(invalidDto)).toThrow();
    });

    it('should accept product item with productId', () => {
      const dto = {
        ...validDto,
        items: [
          {
            ...validDto.items[0],
            productId: '123e4567-e89b-12d3-a456-426614174006',
          },
        ],
      };

      const result = validateCreateInvoice(dto);

      expect(result.items[0]?.productId).toBe(dto.items[0]?.productId);
    });
  });
});
