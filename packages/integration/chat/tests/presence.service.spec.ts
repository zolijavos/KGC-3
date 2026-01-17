import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresenceService } from '../src/services/presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new PresenceService({
      awayTimeout: 5000, // 5 seconds for testing
      offlineTimeout: 1000, // 1 second for testing
      heartbeatInterval: 1000,
    });
  });

  afterEach(() => {
    service.cleanup();
    vi.useRealTimers();
  });

  describe('setOnline', () => {
    it('should track user as online', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');

      const presence = service.getPresence('user-1');
      expect(presence).not.toBeNull();
      expect(presence?.status).toBe('online');
      expect(presence?.tenantId).toBe('tenant-1');
      expect(presence?.socketId).toBe('socket-1');
    });

    it('should update lastSeenAt timestamp', () => {
      const before = new Date();
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      const after = new Date();

      const presence = service.getPresence('user-1');
      expect(presence?.lastSeenAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(presence?.lastSeenAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should clear pending offline timer', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.scheduleOffline('user-1');
      service.setOnline('user-1', 'tenant-1', 'socket-2');

      vi.advanceTimersByTime(2000);

      const presence = service.getPresence('user-1');
      expect(presence?.status).toBe('online');
    });
  });

  describe('setOffline', () => {
    it('should track user as offline', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOffline('user-1');

      const presence = service.getPresence('user-1');
      expect(presence?.status).toBe('offline');
      expect(presence?.socketId).toBeUndefined();
    });

    it('should update lastSeenAt timestamp', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      vi.advanceTimersByTime(1000);
      service.setOffline('user-1');

      const presence = service.getPresence('user-1');
      expect(presence?.lastSeenAt).toBeDefined();
    });

    it('should handle non-existent user', () => {
      expect(() => service.setOffline('non-existent')).not.toThrow();
    });
  });

  describe('scheduleOffline', () => {
    it('should set user offline after timeout', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.scheduleOffline('user-1');

      expect(service.getPresence('user-1')?.status).toBe('online');

      vi.advanceTimersByTime(1000);

      expect(service.getPresence('user-1')?.status).toBe('offline');
    });

    it('should cancel previous offline timer', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.scheduleOffline('user-1');
      service.scheduleOffline('user-1');

      vi.advanceTimersByTime(500);
      expect(service.getPresence('user-1')?.status).toBe('online');

      vi.advanceTimersByTime(500);
      expect(service.getPresence('user-1')?.status).toBe('offline');
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivityAt timestamp', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      const firstActivity = service.getPresence('user-1')?.lastActivityAt;

      vi.advanceTimersByTime(1000);
      service.updateActivity('user-1');

      const secondActivity = service.getPresence('user-1')?.lastActivityAt;
      expect(secondActivity?.getTime()).toBeGreaterThan(firstActivity!.getTime());
    });

    it('should bring user back from away to online', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');

      // Advance to trigger away
      vi.advanceTimersByTime(5000);
      expect(service.getPresence('user-1')?.status).toBe('away');

      // Activity should bring back online
      service.updateActivity('user-1');
      expect(service.getPresence('user-1')?.status).toBe('online');
    });

    it('should reset away timer', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');

      vi.advanceTimersByTime(3000);
      service.updateActivity('user-1');

      vi.advanceTimersByTime(3000);
      // Should still be online (timer reset)
      expect(service.getPresence('user-1')?.status).toBe('online');

      vi.advanceTimersByTime(2000);
      // Now should be away
      expect(service.getPresence('user-1')?.status).toBe('away');
    });

    it('should handle non-existent user', () => {
      expect(() => service.updateActivity('non-existent')).not.toThrow();
    });
  });

  describe('automatic away status', () => {
    it('should set user away after inactivity timeout', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');

      expect(service.getPresence('user-1')?.status).toBe('online');

      vi.advanceTimersByTime(5000);

      expect(service.getPresence('user-1')?.status).toBe('away');
    });

    it('should not set already offline user to away', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOffline('user-1');

      vi.advanceTimersByTime(5000);

      expect(service.getPresence('user-1')?.status).toBe('offline');
    });
  });

  describe('getPresence', () => {
    it('should return presence for existing user', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');

      const presence = service.getPresence('user-1');
      expect(presence).not.toBeNull();
      expect(presence?.userId).toBe('user-1');
    });

    it('should return null for non-existent user', () => {
      const presence = service.getPresence('non-existent');
      expect(presence).toBeNull();
    });
  });

  describe('getOnlineUsers', () => {
    it('should return online users in tenant', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOnline('user-2', 'tenant-1', 'socket-2');
      service.setOnline('user-3', 'tenant-2', 'socket-3');

      const users = service.getOnlineUsers('tenant-1');

      expect(users).toHaveLength(2);
      expect(users.map((u) => u.userId)).toContain('user-1');
      expect(users.map((u) => u.userId)).toContain('user-2');
      expect(users.map((u) => u.userId)).not.toContain('user-3');
    });

    it('should include away users', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      vi.advanceTimersByTime(5000);

      const users = service.getOnlineUsers('tenant-1');

      expect(users).toHaveLength(1);
      expect(users[0]?.status).toBe('away');
    });

    it('should not include offline users', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOffline('user-1');

      const users = service.getOnlineUsers('tenant-1');

      expect(users).toHaveLength(0);
    });

    it('should return empty array for tenant with no users', () => {
      const users = service.getOnlineUsers('empty-tenant');
      expect(users).toHaveLength(0);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users including offline', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOnline('user-2', 'tenant-1', 'socket-2');
      service.setOffline('user-1');

      const users = service.getAllUsers('tenant-1');

      expect(users).toHaveLength(2);
    });
  });

  describe('isOnline', () => {
    it('should return true for online user', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      expect(service.isOnline('user-1')).toBe(true);
    });

    it('should return true for away user', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      vi.advanceTimersByTime(5000);
      expect(service.isOnline('user-1')).toBe(true);
    });

    it('should return false for offline user', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOffline('user-1');
      expect(service.isOnline('user-1')).toBe(false);
    });

    it('should return false for non-existent user', () => {
      expect(service.isOnline('non-existent')).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return online status', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      expect(service.getStatus('user-1')).toBe('online');
    });

    it('should return away status', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      vi.advanceTimersByTime(5000);
      expect(service.getStatus('user-1')).toBe('away');
    });

    it('should return offline status', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOffline('user-1');
      expect(service.getStatus('user-1')).toBe('offline');
    });

    it('should return offline for non-existent user', () => {
      expect(service.getStatus('non-existent')).toBe('offline');
    });
  });

  describe('getLastSeen', () => {
    it('should return lastSeenAt for existing user', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');

      const lastSeen = service.getLastSeen('user-1');
      expect(lastSeen).not.toBeNull();
    });

    it('should return null for non-existent user', () => {
      const lastSeen = service.getLastSeen('non-existent');
      expect(lastSeen).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clear all timers and data', () => {
      service.setOnline('user-1', 'tenant-1', 'socket-1');
      service.setOnline('user-2', 'tenant-1', 'socket-2');

      service.cleanup();

      expect(service.getPresence('user-1')).toBeNull();
      expect(service.getPresence('user-2')).toBeNull();
    });
  });
});
