/**
 * Trusted Device Service - Device trust management for kiosk mode
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC2: Trusted Device Validáció
 *
 * Responsibilities:
 * - Find trusted device by ID
 * - Check if device is trusted (ACTIVE status)
 * - Register new trusted devices
 * - Track device usage
 *
 * Security:
 * - Only ACTIVE devices can be used for PIN login
 * - SUSPENDED and REVOKED devices are rejected
 * - Device fingerprint for additional validation (optional)
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

/** Device status enum matching database values */
export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

/** Trusted device data structure */
export interface TrustedDevice {
  id: string;
  tenantId: string;
  locationId: string;
  deviceName: string;
  deviceFingerprint: string | null;
  status: string;
  registeredBy: string | null;
  registeredAt: Date;
  lastUsedAt: Date | null;
}

/** Input for registering a new device */
export interface RegisterDeviceInput {
  tenantId: string;
  locationId: string;
  deviceName: string;
  deviceFingerprint?: string;
  registeredBy?: string;
}

@Injectable()
export class TrustedDeviceService {
  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma?: PrismaClient | null
  ) {}

  /**
   * Find a trusted device by its ID
   * @param deviceId - UUID of the device
   * @returns TrustedDevice or null if not found
   */
  async findByDeviceId(deviceId: string): Promise<TrustedDevice | null> {
    if (!this.prisma) {
      return null;
    }

    const device = await this.prisma.trustedDevice.findUnique({
      where: { id: deviceId },
    });

    return device;
  }

  /**
   * Check if a device is trusted and active
   * @param deviceId - UUID of the device to check
   * @returns true if device exists and has ACTIVE status
   */
  async isDeviceTrusted(deviceId: string): Promise<boolean> {
    const device = await this.findByDeviceId(deviceId);

    if (!device) {
      return false;
    }

    return device.status === DeviceStatus.ACTIVE;
  }

  /**
   * Register a new trusted device
   * @param data - Device registration data
   * @returns Created TrustedDevice or null if Prisma not available
   */
  async registerDevice(data: RegisterDeviceInput): Promise<TrustedDevice | null> {
    if (!this.prisma) {
      return null;
    }

    const device = await this.prisma.trustedDevice.create({
      data: {
        tenantId: data.tenantId,
        locationId: data.locationId,
        deviceName: data.deviceName,
        deviceFingerprint: data.deviceFingerprint ?? null,
        registeredBy: data.registeredBy ?? null,
        status: DeviceStatus.ACTIVE,
      },
    });

    return device;
  }

  /**
   * Update the lastUsedAt timestamp for a device
   * Called on successful PIN login
   * @param deviceId - UUID of the device
   */
  async updateLastUsed(deviceId: string): Promise<void> {
    if (!this.prisma) {
      return;
    }

    await this.prisma.trustedDevice.update({
      where: { id: deviceId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Get device by fingerprint for additional validation
   * @param tenantId - Tenant ID
   * @param fingerprint - Device fingerprint
   * @returns TrustedDevice or null
   */
  async findByFingerprint(tenantId: string, fingerprint: string): Promise<TrustedDevice | null> {
    if (!this.prisma) {
      return null;
    }

    const device = await this.prisma.trustedDevice.findFirst({
      where: {
        tenantId,
        deviceFingerprint: fingerprint,
        status: DeviceStatus.ACTIVE,
      },
    });

    return device;
  }
}
