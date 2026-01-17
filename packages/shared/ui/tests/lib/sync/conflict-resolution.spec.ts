import { describe, it, expect, vi } from 'vitest';
import {
  resolveConflict,
  lastWriteWins,
  createConflictInfo,
} from '../../../src/lib/sync/conflict-resolution';
import type { SyncOperation, ConflictInfo } from '../../../src/lib/sync/types';

const createTestOperation = (overrides: Partial<SyncOperation> = {}): SyncOperation => ({
  id: 'test-op-1',
  type: 'test',
  method: 'PUT',
  url: '/api/test/1',
  payload: { name: 'Client Data', version: 1 },
  status: 'conflict',
  retryCount: 0,
  maxRetries: 3,
  priority: 'normal',
  createdAt: 1705400000000,
  metadata: {
    entityId: '1',
    entityType: 'test',
    clientVersion: 1705400000000,
  },
  ...overrides,
});

describe('Conflict Resolution', () => {
  describe('createConflictInfo', () => {
    it('should create conflict info from operation and server data', () => {
      const operation = createTestOperation();
      const serverData = { name: 'Server Data', version: 2 };
      const serverTimestamp = 1705400001000;

      const conflict = createConflictInfo(operation, serverData, serverTimestamp);

      expect(conflict.operation).toBe(operation);
      expect(conflict.clientData).toEqual(operation.payload);
      expect(conflict.serverData).toEqual(serverData);
      expect(conflict.clientTimestamp).toBe(operation.createdAt);
      expect(conflict.serverTimestamp).toBe(serverTimestamp);
      expect(conflict.resolution).toBeUndefined();
    });

    it('should use metadata clientVersion if available', () => {
      const operation = createTestOperation({
        metadata: {
          clientVersion: 1705399999000,
        },
      });
      const serverData = { name: 'Server Data' };
      const serverTimestamp = 1705400001000;

      const conflict = createConflictInfo(operation, serverData, serverTimestamp);

      expect(conflict.clientTimestamp).toBe(1705399999000);
    });
  });

  describe('lastWriteWins', () => {
    it('should return client-wins when client timestamp is newer', () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400002000, // Newer
        serverTimestamp: 1705400001000,
      };

      const resolution = lastWriteWins(conflict);

      expect(resolution).toBe('client-wins');
    });

    it('should return server-wins when server timestamp is newer', () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400001000,
        serverTimestamp: 1705400002000, // Newer
      };

      const resolution = lastWriteWins(conflict);

      expect(resolution).toBe('server-wins');
    });

    it('should return server-wins when timestamps are equal (server priority)', () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400001000,
        serverTimestamp: 1705400001000, // Equal
      };

      const resolution = lastWriteWins(conflict);

      expect(resolution).toBe('server-wins');
    });
  });

  describe('resolveConflict', () => {
    it('should apply client-wins resolution', async () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400002000,
        serverTimestamp: 1705400001000,
        resolution: 'client-wins',
      };

      const result = await resolveConflict(conflict);

      expect(result.data).toEqual(conflict.clientData);
      expect(result.resolution).toBe('client-wins');
      expect(result.shouldSync).toBe(true);
    });

    it('should apply server-wins resolution', async () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400001000,
        serverTimestamp: 1705400002000,
        resolution: 'server-wins',
      };

      const result = await resolveConflict(conflict);

      expect(result.data).toEqual(conflict.serverData);
      expect(result.resolution).toBe('server-wins');
      expect(result.shouldSync).toBe(false);
    });

    it('should use lastWriteWins when no resolution specified', async () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400002000, // Client newer
        serverTimestamp: 1705400001000,
      };

      const result = await resolveConflict(conflict);

      expect(result.resolution).toBe('client-wins');
      expect(result.data).toEqual(conflict.clientData);
    });

    it('should use custom resolver when provided', async () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400002000,
        serverTimestamp: 1705400001000,
      };

      const customResolver = vi.fn().mockResolvedValue('server-wins');

      const result = await resolveConflict(conflict, customResolver);

      expect(customResolver).toHaveBeenCalledWith(conflict);
      expect(result.resolution).toBe('server-wins');
      expect(result.data).toEqual(conflict.serverData);
    });

    it('should handle merge resolution', async () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data', clientOnly: true },
        serverData: { name: 'Server Data', serverOnly: true },
        clientTimestamp: 1705400001000,
        serverTimestamp: 1705400001000,
        resolution: 'merge',
      };

      const result = await resolveConflict(conflict);

      // Default merge: spread server then client (client wins on conflicts)
      expect(result.data).toEqual({
        name: 'Client Data', // Client wins on key conflict
        clientOnly: true,
        serverOnly: true,
      });
      expect(result.resolution).toBe('merge');
      expect(result.shouldSync).toBe(true);
    });

    it('should handle manual resolution by returning unresolved', async () => {
      const conflict: ConflictInfo = {
        operation: createTestOperation(),
        clientData: { name: 'Client Data' },
        serverData: { name: 'Server Data' },
        clientTimestamp: 1705400001000,
        serverTimestamp: 1705400001000,
        resolution: 'manual',
      };

      const result = await resolveConflict(conflict);

      expect(result.resolution).toBe('manual');
      expect(result.data).toBeUndefined();
      expect(result.shouldSync).toBe(false);
      expect(result.requiresUserInput).toBe(true);
    });
  });
});
