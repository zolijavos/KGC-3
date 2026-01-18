/**
 * @kgc/service-warranty - Warranty Check Service Tests
 * Epic 19: Warranty Claims - Story 19.1
 *
 * TDD: Unit tesztek a garancia ellenőrzéshez
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  WarrantyCheckService,
  IDeviceRegistryService,
  IWarrantyHistoryService,
  DEVICE_REGISTRY_SERVICE,
  WARRANTY_HISTORY_SERVICE,
} from './warranty-check.service';
import {
  WarrantySupplier,
  WarrantyType,
} from '../interfaces/warranty-claim.interface';
import {
  IDeviceWarrantyInfo,
  WarrantyRejectionReason,
  WarrantyWarningType,
} from '../interfaces/warranty-check.interface';

describe('WarrantyCheckService', () => {
  let service: WarrantyCheckService;
  let deviceRegistry: IDeviceRegistryService;
  let warrantyHistory: IWarrantyHistoryService;

  const mockTenantId = 'tenant-123';
  const mockSerialNumber = 'MAKITA-123456';

  const createMockDeviceInfo = (
    overrides: Partial<IDeviceWarrantyInfo> = {},
  ): IDeviceWarrantyInfo => ({
    serialNumber: mockSerialNumber,
    deviceName: 'Makita DHP486',
    supplier: WarrantySupplier.MAKITA,
    purchaseDate: new Date('2024-01-15'),
    standardWarrantyMonths: 24,
    extendedWarrantyMonths: undefined,
    warrantyExpiresAt: new Date('2026-01-15'),
    hasActiveWarranty: true,
    previousWarrantyRepairs: 0,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyCheckService,
        {
          provide: DEVICE_REGISTRY_SERVICE,
          useValue: {
            getDeviceInfo: vi.fn(),
            getPurchaseInfo: vi.fn(),
          },
        },
        {
          provide: WARRANTY_HISTORY_SERVICE,
          useValue: {
            getPreviousRepairCount: vi.fn(),
            hasUnauthorizedRepair: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WarrantyCheckService>(WarrantyCheckService);
    deviceRegistry = module.get<IDeviceRegistryService>(DEVICE_REGISTRY_SERVICE);
    warrantyHistory = module.get<IWarrantyHistoryService>(WARRANTY_HISTORY_SERVICE);
  });

  describe('checkWarranty', () => {
    it('should return warranty eligible result for valid device with active warranty', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year in future
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });
      vi.mocked(warrantyHistory.getPreviousRepairCount).mockResolvedValue(0);
      vi.mocked(warrantyHistory.hasUnauthorizedRepair).mockResolvedValue(false);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(true);
      expect(result.warrantyType).toBe(WarrantyType.MANUFACTURER);
      expect(result.supplier).toBe(WarrantySupplier.MAKITA);
      expect(result.rejectionReason).toBeNull();
      expect(result.recommendedAction).toBe('WARRANTY_CLAIM');
    });

    it('should reject unknown device', async () => {
      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(null);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: 'UNKNOWN-123',
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(false);
      expect(result.rejectionReason).toBe(WarrantyRejectionReason.UNKNOWN_DEVICE);
      expect(result.recommendedAction).toBe('PAID_REPAIR');
    });

    it('should reject device without purchase proof', async () => {
      const deviceInfo = createMockDeviceInfo();
      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue(null);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(false);
      expect(result.rejectionReason).toBe(WarrantyRejectionReason.NO_PURCHASE_PROOF);
    });

    it('should reject unregistered Makita device (registration required)', async () => {
      const deviceInfo = createMockDeviceInfo();
      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: false, // Not registered!
      });

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(false);
      expect(result.rejectionReason).toBe(WarrantyRejectionReason.NOT_REGISTERED);
    });

    it('should reject expired warranty', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date('2024-01-01'), // Expired
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
        checkDate: new Date('2025-01-15'),
      });

      expect(result.isWarranty).toBe(false);
      expect(result.rejectionReason).toBe(WarrantyRejectionReason.EXPIRED);
      expect(result.remainingDays).toBeLessThan(0);
    });

    it('should reject when max warranty repairs exceeded', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });
      vi.mocked(warrantyHistory.getPreviousRepairCount).mockResolvedValue(3); // Max is 3 for Makita
      vi.mocked(warrantyHistory.hasUnauthorizedRepair).mockResolvedValue(false);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(false);
      expect(result.rejectionReason).toBe(WarrantyRejectionReason.USER_DAMAGE);
    });

    it('should reject when unauthorized repair detected', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });
      vi.mocked(warrantyHistory.getPreviousRepairCount).mockResolvedValue(0);
      vi.mocked(warrantyHistory.hasUnauthorizedRepair).mockResolvedValue(true);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(false);
      expect(result.rejectionReason).toBe(WarrantyRejectionReason.UNAUTHORIZED_REPAIR);
    });

    it('should add warning when warranty expiring soon', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });
      vi.mocked(warrantyHistory.getPreviousRepairCount).mockResolvedValue(0);
      vi.mocked(warrantyHistory.hasUnauthorizedRepair).mockResolvedValue(false);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(true);
      expect(result.warnings.some(w => w.type === WarrantyWarningType.EXPIRING_SOON)).toBe(true);
    });

    it('should add warning for multiple previous repairs', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });
      vi.mocked(warrantyHistory.getPreviousRepairCount).mockResolvedValue(2);
      vi.mocked(warrantyHistory.hasUnauthorizedRepair).mockResolvedValue(false);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(true);
      expect(result.warnings.some(w => w.type === WarrantyWarningType.MULTIPLE_REPAIRS)).toBe(true);
    });

    it('should detect extended warranty', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        extendedWarrantyMonths: 12,
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });
      vi.mocked(warrantyHistory.getPreviousRepairCount).mockResolvedValue(0);
      vi.mocked(warrantyHistory.hasUnauthorizedRepair).mockResolvedValue(false);

      const result = await service.checkWarranty(mockTenantId, {
        serialNumber: mockSerialNumber,
        faultType: 'motor failure',
      });

      expect(result.isWarranty).toBe(true);
      expect(result.warrantyType).toBe(WarrantyType.EXTENDED);
      expect(result.warnings.some(w => w.type === WarrantyWarningType.EXTENDED_WARRANTY)).toBe(true);
    });
  });

  describe('getSupplierWarrantyRules', () => {
    it('should return correct rules for Makita', () => {
      const rules = service.getSupplierWarrantyRules(WarrantySupplier.MAKITA);

      expect(rules.standardWarrantyMonths).toBe(24);
      expect(rules.registrationRequired).toBe(true);
      expect(rules.usesNormaSystem).toBe(true);
      expect(rules.maxWarrantyRepairs).toBe(3);
    });

    it('should return correct rules for Milwaukee (5 year warranty)', () => {
      const rules = service.getSupplierWarrantyRules(WarrantySupplier.MILWAUKEE);

      expect(rules.standardWarrantyMonths).toBe(60);
      expect(rules.registrationRequired).toBe(false);
    });

    it('should return correct rules for DeWalt', () => {
      const rules = service.getSupplierWarrantyRules(WarrantySupplier.DEWALT);

      expect(rules.standardWarrantyMonths).toBe(12);
      expect(rules.extendedWarrantyAvailable).toBe(true);
      expect(rules.maxWarrantyRepairs).toBe(2);
    });
  });

  describe('calculateWarrantyExpiration', () => {
    it('should calculate standard warranty expiration', () => {
      const purchaseDate = new Date('2025-01-15');
      const expiration = service.calculateWarrantyExpiration(
        purchaseDate,
        WarrantySupplier.MAKITA,
        false,
      );

      expect(expiration.getFullYear()).toBe(2027);
      expect(expiration.getMonth()).toBe(0); // January
      expect(expiration.getDate()).toBe(15);
    });

    it('should calculate extended warranty expiration for Makita', () => {
      const purchaseDate = new Date('2025-01-15');
      const expiration = service.calculateWarrantyExpiration(
        purchaseDate,
        WarrantySupplier.MAKITA,
        true,
      );

      expect(expiration.getFullYear()).toBe(2028); // 36 months = 3 years
      expect(expiration.getMonth()).toBe(0);
    });

    it('should not extend warranty for suppliers without extended option', () => {
      const purchaseDate = new Date('2025-01-15');
      const expiration = service.calculateWarrantyExpiration(
        purchaseDate,
        WarrantySupplier.STIHL,
        true, // Request extended but not available
      );

      // Should still be standard 24 months
      expect(expiration.getFullYear()).toBe(2027);
    });
  });

  describe('checkWarrantySimple', () => {
    it('should return simplified warranty check result', async () => {
      const deviceInfo = createMockDeviceInfo({
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      vi.mocked(deviceRegistry.getDeviceInfo).mockResolvedValue(deviceInfo);
      vi.mocked(deviceRegistry.getPurchaseInfo).mockResolvedValue({
        purchaseDate: deviceInfo.purchaseDate,
        hasProof: true,
        isRegistered: true,
      });
      vi.mocked(warrantyHistory.getPreviousRepairCount).mockResolvedValue(0);
      vi.mocked(warrantyHistory.hasUnauthorizedRepair).mockResolvedValue(false);

      const result = await service.checkWarrantySimple(mockTenantId, mockSerialNumber);

      expect(result.isWarranty).toBe(true);
      expect(result.supplier).toBe(WarrantySupplier.MAKITA);
      expect(result.warnings).toBeInstanceOf(Array);
    });
  });
});
