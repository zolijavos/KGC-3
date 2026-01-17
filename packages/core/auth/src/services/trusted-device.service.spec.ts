/**
 * Trusted Device Service Unit Tests - TDD Red-Green-Refactor
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC2: Trusted Device Validáció - eszköz regisztráció és validálás
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { TrustedDeviceService } from './trusted-device.service';

describe('TrustedDeviceService', () => {
  let trustedDeviceService: TrustedDeviceService;
  let mockPrisma: {
    trustedDevice: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  const mockDevice = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '660e8400-e29b-41d4-a716-446655440001',
    locationId: '770e8400-e29b-41d4-a716-446655440002',
    deviceName: 'Pult Terminal 1',
    deviceFingerprint: 'abc123fingerprint',
    status: 'ACTIVE',
    registeredBy: '880e8400-e29b-41d4-a716-446655440003',
    registeredAt: new Date('2026-01-15T10:00:00Z'),
    lastUsedAt: null,
  };

  beforeEach(() => {
    mockPrisma = {
      trustedDevice: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    trustedDeviceService = new TrustedDeviceService(mockPrisma as unknown as PrismaClient);
  });

  describe('findByDeviceId()', () => {
    describe('happy path', () => {
      it('should return device for valid device ID', async () => {
        // Arrange
        mockPrisma.trustedDevice.findUnique.mockResolvedValue(mockDevice);

        // Act
        const result = await trustedDeviceService.findByDeviceId(mockDevice.id);

        // Assert
        expect(result).toEqual(mockDevice);
        expect(mockPrisma.trustedDevice.findUnique).toHaveBeenCalledWith({
          where: { id: mockDevice.id },
        });
      });
    });

    describe('edge cases', () => {
      it('should return null for unknown device ID', async () => {
        // Arrange
        mockPrisma.trustedDevice.findUnique.mockResolvedValue(null);

        // Act
        const result = await trustedDeviceService.findByDeviceId('unknown-device-id');

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when Prisma is not available', async () => {
        // Arrange
        const serviceWithoutPrisma = new TrustedDeviceService(null);

        // Act
        const result = await serviceWithoutPrisma.findByDeviceId(mockDevice.id);

        // Assert
        expect(result).toBeNull();
      });
    });
  });

  describe('isDeviceTrusted()', () => {
    describe('happy path', () => {
      it('should return true for ACTIVE device', async () => {
        // Arrange
        mockPrisma.trustedDevice.findUnique.mockResolvedValue({
          ...mockDevice,
          status: 'ACTIVE',
        });

        // Act
        const result = await trustedDeviceService.isDeviceTrusted(mockDevice.id);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false for SUSPENDED device', async () => {
        // Arrange
        mockPrisma.trustedDevice.findUnique.mockResolvedValue({
          ...mockDevice,
          status: 'SUSPENDED',
        });

        // Act
        const result = await trustedDeviceService.isDeviceTrusted(mockDevice.id);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for REVOKED device', async () => {
        // Arrange
        mockPrisma.trustedDevice.findUnique.mockResolvedValue({
          ...mockDevice,
          status: 'REVOKED',
        });

        // Act
        const result = await trustedDeviceService.isDeviceTrusted(mockDevice.id);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for unknown device', async () => {
        // Arrange
        mockPrisma.trustedDevice.findUnique.mockResolvedValue(null);

        // Act
        const result = await trustedDeviceService.isDeviceTrusted('unknown-device-id');

        // Assert
        expect(result).toBe(false);
      });

      it('should return false when Prisma is not available', async () => {
        // Arrange
        const serviceWithoutPrisma = new TrustedDeviceService(null);

        // Act
        const result = await serviceWithoutPrisma.isDeviceTrusted(mockDevice.id);

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('registerDevice()', () => {
    const newDeviceData = {
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      locationId: '770e8400-e29b-41d4-a716-446655440002',
      deviceName: 'New Terminal',
      deviceFingerprint: 'newfingerprint123',
      registeredBy: '880e8400-e29b-41d4-a716-446655440003',
    };

    describe('happy path', () => {
      it('should create and return new trusted device', async () => {
        // Arrange
        const createdDevice = {
          id: '990e8400-e29b-41d4-a716-446655440004',
          ...newDeviceData,
          status: 'ACTIVE',
          registeredAt: new Date(),
          lastUsedAt: null,
        };
        mockPrisma.trustedDevice.create.mockResolvedValue(createdDevice);

        // Act
        const result = await trustedDeviceService.registerDevice(newDeviceData);

        // Assert
        expect(result).toEqual(createdDevice);
        expect(mockPrisma.trustedDevice.create).toHaveBeenCalledWith({
          data: {
            ...newDeviceData,
            status: 'ACTIVE',
          },
        });
      });
    });

    describe('edge cases', () => {
      it('should return null when Prisma is not available', async () => {
        // Arrange
        const serviceWithoutPrisma = new TrustedDeviceService(null);

        // Act
        const result = await serviceWithoutPrisma.registerDevice(newDeviceData);

        // Assert
        expect(result).toBeNull();
      });
    });
  });

  describe('updateLastUsed()', () => {
    it('should update lastUsedAt timestamp', async () => {
      // Arrange
      const now = new Date();
      const updatedDevice = { ...mockDevice, lastUsedAt: now };
      mockPrisma.trustedDevice.update.mockResolvedValue(updatedDevice);

      // Act
      await trustedDeviceService.updateLastUsed(mockDevice.id);

      // Assert
      expect(mockPrisma.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: mockDevice.id },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });
});
