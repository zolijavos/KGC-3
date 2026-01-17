import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ItemCodeGeneratorService } from './item-code-generator.service';
import { ItemType, ITEM_CODE_PREFIX } from '../interfaces/item.interface';

/**
 * TDD Tests for ItemCodeGeneratorService
 * Story 8-1: Cikk CRUD - AC2: Cikk Kód Generálás
 * RED phase - minimum 8 tesztek
 *
 * Code format: {PREFIX}-{YYYYMMDD}-{SEQUENCE}
 * PREFIX: PRD (termék), PRT (alkatrész), SVC (szolgáltatás)
 * SEQUENCE: 4 számjegyű szekvenciális szám (0001-9999)
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

// Mock PrismaService
const mockPrismaService = {
  itemCodeSequence: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: typeof mockPrismaService) => Promise<unknown>) => {
    return callback(mockPrismaService);
  }),
};

describe('ItemCodeGeneratorService', () => {
  let codeGeneratorService: ItemCodeGeneratorService;
  const fixedDate = new Date('2026-01-16T10:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
    codeGeneratorService = new ItemCodeGeneratorService(mockPrismaService as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================
  // GENERATE CODE TESTS (5 tesztek)
  // =========================================
  describe('generateCode()', () => {
    it('should generate code with PRD prefix for PRODUCT type', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });

      const code = await codeGeneratorService.generateCode(ItemType.PRODUCT, TENANT_ID);

      expect(code).toBe('PRD-20260116-0001');
    });

    it('should generate code with PRT prefix for PART type', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });

      const code = await codeGeneratorService.generateCode(ItemType.PART, TENANT_ID);

      expect(code).toBe('PRT-20260116-0001');
    });

    it('should generate code with SVC prefix for SERVICE type', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });

      const code = await codeGeneratorService.generateCode(ItemType.SERVICE, TENANT_ID);

      expect(code).toBe('SVC-20260116-0001');
    });

    it('should increment sequence for same prefix and date', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 42 });

      const code = await codeGeneratorService.generateCode(ItemType.PRODUCT, TENANT_ID);

      expect(code).toBe('PRD-20260116-0042');
    });

    it('should pad sequence to 4 digits', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 5 });

      const code = await codeGeneratorService.generateCode(ItemType.PRODUCT, TENANT_ID);

      expect(code).toBe('PRD-20260116-0005');
    });
  });

  // =========================================
  // GET NEXT SEQUENCE TESTS (3 tesztek)
  // =========================================
  describe('getNextSequence()', () => {
    it('should create new sequence if not exists (returns 1)', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });

      await codeGeneratorService.generateCode(ItemType.PRODUCT, TENANT_ID);

      expect(mockPrismaService.itemCodeSequence.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_prefix_date: {
            tenantId: TENANT_ID,
            prefix: 'PRD',
            date: '20260116',
          },
        },
        create: {
          tenantId: TENANT_ID,
          prefix: 'PRD',
          date: '20260116',
          sequence: 1,
        },
        update: {
          sequence: { increment: 1 },
        },
      });
    });

    it('should use correct date format YYYYMMDD', async () => {
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });

      await codeGeneratorService.generateCode(ItemType.PRODUCT, TENANT_ID);

      expect(mockPrismaService.itemCodeSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_prefix_date: expect.objectContaining({
              date: '20260116',
            }),
          }),
        })
      );
    });

    it('should scope sequence per tenant', async () => {
      const anotherTenantId = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
      mockPrismaService.itemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });

      await codeGeneratorService.generateCode(ItemType.PRODUCT, anotherTenantId);

      expect(mockPrismaService.itemCodeSequence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_prefix_date: expect.objectContaining({
              tenantId: anotherTenantId,
            }),
          }),
        })
      );
    });
  });

  // =========================================
  // PREFIX MAPPING TEST (1 teszt)
  // =========================================
  describe('prefix mapping', () => {
    it('should use correct prefix mapping for all item types', () => {
      expect(ITEM_CODE_PREFIX[ItemType.PRODUCT]).toBe('PRD');
      expect(ITEM_CODE_PREFIX[ItemType.PART]).toBe('PRT');
      expect(ITEM_CODE_PREFIX[ItemType.SERVICE]).toBe('SVC');
    });
  });
});
