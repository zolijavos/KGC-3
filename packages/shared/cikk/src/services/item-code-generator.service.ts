import { Injectable, BadRequestException } from '@nestjs/common';
import { format } from 'date-fns';
import { ItemType, ITEM_CODE_PREFIX } from '../interfaces/item.interface';

/**
 * Maximum sequence number per day
 */
const MAX_SEQUENCE = 9999;

/**
 * ItemCodeGeneratorService - Auto code generation for items
 * Story 8-1: Cikk CRUD - AC2: Cikk Kód Generálás
 *
 * Code format: {PREFIX}-{YYYYMMDD}-{SEQUENCE}
 * - PREFIX: PRD (termék), PRT (alkatrész), SVC (szolgáltatás)
 * - YYYYMMDD: Current date
 * - SEQUENCE: 4 digit sequential number (0001-9999) per prefix+date+tenant
 *
 * Examples:
 * - PRD-20260116-0001 (first product today)
 * - PRT-20260116-0042 (42nd part today)
 * - SVC-20260116-0001 (first service today)
 *
 * @kgc/cikk
 */
@Injectable()
export class ItemCodeGeneratorService {
  constructor(private readonly prisma: any) {} // PrismaService

  /**
   * Generate a unique item code
   *
   * @param itemType - Item type (PRODUCT, PART, SERVICE)
   * @param tenantId - Tenant context
   * @returns Generated code in format PREFIX-YYYYMMDD-XXXX
   */
  async generateCode(itemType: ItemType, tenantId: string): Promise<string> {
    const prefix = ITEM_CODE_PREFIX[itemType];
    const date = format(new Date(), 'yyyyMMdd');
    const sequence = await this.getNextSequence(prefix, date, tenantId);

    // Check for sequence overflow
    if (sequence > MAX_SEQUENCE) {
      throw new BadRequestException(
        `Napi cikkszám limit elérve (${MAX_SEQUENCE}) a ${prefix} típushoz. Próbálja újra holnap.`
      );
    }

    return `${prefix}-${date}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Get next sequence number for prefix+date+tenant combination
   * Uses upsert to atomically increment or create sequence
   *
   * @param prefix - Code prefix (PRD, PRT, SVC)
   * @param date - Date in YYYYMMDD format
   * @param tenantId - Tenant context
   * @returns Next sequence number
   */
  private async getNextSequence(prefix: string, date: string, tenantId: string): Promise<number> {
    const result = await this.prisma.itemCodeSequence.upsert({
      where: {
        tenantId_prefix_date: {
          tenantId,
          prefix,
          date,
        },
      },
      create: {
        tenantId,
        prefix,
        date,
        sequence: 1,
      },
      update: {
        sequence: { increment: 1 },
      },
    });

    return result.sequence;
  }
}
