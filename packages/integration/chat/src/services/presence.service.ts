import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { UserStatus } from '../interfaces/chat.interface';
import {
  type UserPresence,
  type PresenceConfig,
  type IPresenceService,
  DEFAULT_PRESENCE_CONFIG,
  PresenceServerEvent,
} from '../interfaces/presence.interface';

/**
 * Injection token for presence configuration
 */
export const PRESENCE_CONFIG = 'PRESENCE_CONFIG';

/**
 * Presence service for tracking user online/offline/away status
 *
 * Features:
 * - Real-time status tracking
 * - Automatic away detection (5 min inactivity)
 * - Last seen timestamps
 * - Tenant-scoped presence lists
 */
@Injectable()
export class PresenceService implements IPresenceService {
  private readonly logger = new Logger(PresenceService.name);

  /** User presence map: Map<userId, UserPresence> */
  private presenceMap = new Map<string, UserPresence>();

  /** Inactivity timers: Map<userId, NodeJS.Timeout> */
  private awayTimers = new Map<string, NodeJS.Timeout>();

  /** Offline timers: Map<userId, NodeJS.Timeout> */
  private offlineTimers = new Map<string, NodeJS.Timeout>();

  /** Configuration */
  private config: PresenceConfig;

  /** WebSocket server reference for broadcasting */
  private server?: Server;

  constructor(
    @Optional() @Inject(PRESENCE_CONFIG) config?: Partial<PresenceConfig>,
  ) {
    this.config = { ...DEFAULT_PRESENCE_CONFIG, ...config };
  }

  /**
   * Set the WebSocket server for broadcasting
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Track user coming online
   */
  setOnline(userId: string, tenantId: string, socketId: string): void {
    // Clear any pending offline timer
    this.clearOfflineTimer(userId);

    const now = new Date();

    const presence: UserPresence = {
      userId,
      tenantId,
      status: 'online',
      lastSeenAt: now,
      lastActivityAt: now,
      socketId,
    };

    this.presenceMap.set(userId, presence);

    // Start inactivity timer for away status
    this.startAwayTimer(userId);

    // Broadcast to tenant
    this.broadcastPresence(tenantId, {
      userId,
      status: 'online',
    });

    this.logger.debug(`User ${userId} is now online`);
  }

  /**
   * Track user going offline
   */
  setOffline(userId: string): void {
    const presence = this.presenceMap.get(userId);

    if (!presence) {
      return;
    }

    // Clear timers
    this.clearAwayTimer(userId);
    this.clearOfflineTimer(userId);

    // Update presence
    presence.status = 'offline';
    presence.lastSeenAt = new Date();
    delete presence.socketId;

    // Broadcast to tenant
    this.broadcastPresence(presence.tenantId, {
      userId,
      status: 'offline',
      lastSeenAt: presence.lastSeenAt,
    });

    this.logger.debug(`User ${userId} is now offline`);
  }

  /**
   * Schedule offline status after disconnect
   * Allows for brief reconnections without showing as offline
   */
  scheduleOffline(userId: string): void {
    // Clear any existing offline timer
    this.clearOfflineTimer(userId);

    const timer = setTimeout(() => {
      this.setOffline(userId);
      this.offlineTimers.delete(userId);
    }, this.config.offlineTimeout);

    this.offlineTimers.set(userId, timer);
  }

  /**
   * Update user activity (heartbeat)
   */
  updateActivity(userId: string): void {
    const presence = this.presenceMap.get(userId);

    if (!presence) {
      return;
    }

    const wasAway = presence.status === 'away';
    presence.lastActivityAt = new Date();

    // If user was away, bring them back online
    if (wasAway) {
      presence.status = 'online';
      this.broadcastPresence(presence.tenantId, {
        userId,
        status: 'online',
      });
      this.logger.debug(`User ${userId} is back online from away`);
    }

    // Reset away timer
    this.startAwayTimer(userId);
  }

  /**
   * Set user to away status
   */
  private setAway(userId: string): void {
    const presence = this.presenceMap.get(userId);

    if (!presence || presence.status !== 'online') {
      return;
    }

    presence.status = 'away';

    // Broadcast to tenant
    this.broadcastPresence(presence.tenantId, {
      userId,
      status: 'away',
    });

    this.logger.debug(`User ${userId} is now away (inactivity)`);
  }

  /**
   * Get user's current presence
   */
  getPresence(userId: string): UserPresence | null {
    return this.presenceMap.get(userId) ?? null;
  }

  /**
   * Get all online users in a tenant
   */
  getOnlineUsers(tenantId: string): UserPresence[] {
    const users: UserPresence[] = [];

    for (const presence of this.presenceMap.values()) {
      if (
        presence.tenantId === tenantId &&
        (presence.status === 'online' || presence.status === 'away')
      ) {
        users.push(presence);
      }
    }

    return users;
  }

  /**
   * Get all users with their presence (including offline with last seen)
   */
  getAllUsers(tenantId: string): UserPresence[] {
    const users: UserPresence[] = [];

    for (const presence of this.presenceMap.values()) {
      if (presence.tenantId === tenantId) {
        users.push(presence);
      }
    }

    return users;
  }

  /**
   * Check if user is online
   */
  isOnline(userId: string): boolean {
    const presence = this.presenceMap.get(userId);
    return presence?.status === 'online' || presence?.status === 'away';
  }

  /**
   * Get user's status
   */
  getStatus(userId: string): UserStatus {
    const presence = this.presenceMap.get(userId);
    return presence?.status ?? 'offline';
  }

  /**
   * Get user's last seen timestamp
   */
  getLastSeen(userId: string): Date | null {
    const presence = this.presenceMap.get(userId);
    return presence?.lastSeenAt ?? null;
  }

  /**
   * Start away timer for user
   */
  private startAwayTimer(userId: string): void {
    // Clear existing timer
    this.clearAwayTimer(userId);

    const timer = setTimeout(() => {
      this.setAway(userId);
      this.awayTimers.delete(userId);
    }, this.config.awayTimeout);

    this.awayTimers.set(userId, timer);
  }

  /**
   * Clear away timer for user
   */
  private clearAwayTimer(userId: string): void {
    const timer = this.awayTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.awayTimers.delete(userId);
    }
  }

  /**
   * Clear offline timer for user
   */
  private clearOfflineTimer(userId: string): void {
    const timer = this.offlineTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.offlineTimers.delete(userId);
    }
  }

  /**
   * Broadcast presence update to tenant
   */
  private broadcastPresence(
    tenantId: string,
    event: { userId: string; status: UserStatus; lastSeenAt?: Date }
  ): void {
    if (!this.server) {
      return;
    }

    const eventName =
      event.status === 'online'
        ? PresenceServerEvent.USER_ONLINE
        : event.status === 'away'
          ? PresenceServerEvent.USER_AWAY
          : PresenceServerEvent.USER_OFFLINE;

    this.server.to(`tenant:${tenantId}`).emit(eventName, event);
  }

  /**
   * Clean up all timers (for shutdown)
   */
  cleanup(): void {
    for (const timer of this.awayTimers.values()) {
      clearTimeout(timer);
    }
    this.awayTimers.clear();

    for (const timer of this.offlineTimers.values()) {
      clearTimeout(timer);
    }
    this.offlineTimers.clear();

    this.presenceMap.clear();
  }
}
