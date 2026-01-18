import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AvizoService,
  IAvizoRepository,
  IAvizoItemRepository,
  IAuditService,
} from './avizo.service';
import { IAvizo, AvizoStatus } from '../interfaces/avizo.interface';
import { CreateAvizoDto } from '../dto/avizo.dto';

const mockAvizoRepository: IAvizoRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findBySupplier: vi.fn(),
  findPending: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
};

const mockItemRepository: IAvizoItemRepository = {
  createMany: vi.fn(),
  findByAvizoId: vi.fn(),
  update: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('AvizoService', () => {
  let service: AvizoService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockSupplierId = '00000000-0000-0000-0000-000000000001';
  const mockProductId = '00000000-0000-0000-0000-000000000002';

  const mockAvizo: IAvizo = {
    id: 'avizo-1',
    tenantId: mockTenantId,
    avizoNumber: 'AV-2026-0001',
    supplierId: mockSupplierId,
    supplierName: 'Makita Kft.',
    expectedDate: new Date('2026-01-20'),
    status: AvizoStatus.PENDING,
    totalItems: 2,
    totalQuantity: 15,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validCreateDto: CreateAvizoDto = {
    supplierId: mockSupplierId,
    supplierName: 'Makita Kft.',
    expectedDate: new Date('2026-01-20'),
    items: [
      {
        productId: mockProductId,
        productCode: 'MAK-001',
        productName: 'Akkumulátor 18V',
        expectedQuantity: 10,
        unitPrice: 15000,
      },
      {
        productId: '00000000-0000-0000-0000-000000000003',
        productCode: 'MAK-002',
        productName: 'Töltő',
        expectedQuantity: 5,
        unitPrice: 8000,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AvizoService(mockAvizoRepository, mockItemRepository, mockAuditService);
  });

  it('should create an avizo successfully', async () => {
    (mockAvizoRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (mockAvizoRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockAvizo);
    (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await service.createAvizo(validCreateDto, mockTenantId, mockUserId);

    expect(result.avizoNumber).toMatch(/^AV-\d{4}-\d{4}$/);
    expect(mockAvizoRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: mockTenantId,
        status: AvizoStatus.PENDING,
        totalItems: 2,
        totalQuantity: 15,
      }),
    );
    expect(mockItemRepository.createMany).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'avizo_created',
      }),
    );
  });

  it('should get avizo by id with tenant check', async () => {
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAvizo);

    const result = await service.getAvizoById('avizo-1', mockTenantId);

    expect(result).toEqual(mockAvizo);
  });

  it('should throw error when avizo not found', async () => {
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.getAvizoById('avizo-1', mockTenantId)).rejects.toThrow('Avizo not found');
  });

  it('should throw error on tenant mismatch', async () => {
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAvizo);

    await expect(service.getAvizoById('avizo-1', 'other-tenant')).rejects.toThrow('Access denied');
  });

  it('should get pending avizos', async () => {
    (mockAvizoRepository.findPending as ReturnType<typeof vi.fn>).mockResolvedValue([mockAvizo]);

    const result = await service.getPendingAvizos(mockTenantId);

    expect(result).toHaveLength(1);
    expect(mockAvizoRepository.findPending).toHaveBeenCalledWith(mockTenantId);
  });

  it('should update avizo with PDF URL', async () => {
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAvizo);
    (mockAvizoRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockAvizo, ...data }),
    );

    const result = await service.updateAvizo(
      'avizo-1',
      { pdfUrl: 'https://example.com/avizo.pdf' },
      mockTenantId,
      mockUserId,
    );

    expect(result.pdfUrl).toBe('https://example.com/avizo.pdf');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'avizo_updated',
      }),
    );
  });

  it('should not allow updating non-pending avizo', async () => {
    const receivedAvizo = { ...mockAvizo, status: AvizoStatus.RECEIVED };
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(receivedAvizo);

    await expect(
      service.updateAvizo('avizo-1', { notes: 'test' }, mockTenantId, mockUserId),
    ).rejects.toThrow('Can only update pending avizos');
  });

  it('should cancel avizo', async () => {
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAvizo);
    (mockAvizoRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockAvizo, ...data }),
    );

    const result = await service.cancelAvizo('avizo-1', mockTenantId, mockUserId);

    expect(result.status).toBe(AvizoStatus.CANCELLED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'avizo_cancelled',
      }),
    );
  });

  it('should not allow cancelling non-pending avizo', async () => {
    const receivedAvizo = { ...mockAvizo, status: AvizoStatus.RECEIVED };
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(receivedAvizo);

    await expect(service.cancelAvizo('avizo-1', mockTenantId, mockUserId)).rejects.toThrow(
      'Can only cancel pending avizos',
    );
  });
});
