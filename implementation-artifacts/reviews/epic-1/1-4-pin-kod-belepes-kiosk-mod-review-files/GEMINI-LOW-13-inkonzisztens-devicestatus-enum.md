# Hiba: Inkonzisztens `DeviceStatus` enum használat

**Fájl:** `packages/core/auth/src/services/trusted-device.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `registerDevice` metódus `DeviceStatus.ACTIVE`-ot használ, de az `isDeviceTrusted` metódus a `device.status`-t egy string literállal (`'ACTIVE'`) hasonlítja össze. A konzisztencia érdekében jobb lenne mindkét helyen az enumot használni.

## Bizonyíték

```typescript
// trusted-device.service.ts
async isDeviceTrusted(deviceId: string): Promise<boolean> {
  // ...
  return device.status === 'ACTIVE'; // String literál
}

async registerDevice(data: RegisterDeviceInput): Promise<TrustedDevice | null> {
  // ...
  const device = await this.prisma.trustedDevice.create({
    data: {
      // ...
      status: DeviceStatus.ACTIVE, // Enum
    },
  });
  // ...
}
```

## Megoldás

Használja a `DeviceStatus.ACTIVE` enumot az `isDeviceTrusted` metódusban is.

```typescript
// trusted-device.service.ts
async isDeviceTrusted(deviceId: string): Promise<boolean> {
  // ...
  return device.status === DeviceStatus.ACTIVE;
}
```
