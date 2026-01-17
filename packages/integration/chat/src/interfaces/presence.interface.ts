/**
 * Presence tracking interfaces for @kgc/chat
 */

import type { UserStatus } from './chat.interface';

/**
 * User presence information
 */
export interface UserPresence {
  userId: string;
  tenantId: string;
  status: UserStatus;
  lastSeenAt: Date;
  lastActivityAt: Date;
  /** Socket ID if connected */
  socketId?: string;
}

/**
 * Presence update event
 */
export interface PresenceUpdateEvent {
  userId: string;
  status: UserStatus;
  lastSeenAt?: Date;
}

/**
 * Presence service configuration
 */
export interface PresenceConfig {
  /** Time in ms before user becomes 'away' (default: 5 minutes) */
  awayTimeout: number;
  /** Time in ms before user becomes 'offline' after disconnect (default: 30 seconds) */
  offlineTimeout: number;
  /** Heartbeat interval in ms (default: 30 seconds) */
  heartbeatInterval: number;
}

/**
 * Default presence configuration
 */
export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  awayTimeout: 5 * 60 * 1000, // 5 minutes
  offlineTimeout: 30 * 1000, // 30 seconds
  heartbeatInterval: 30 * 1000, // 30 seconds
};

/**
 * Presence service interface
 */
export interface IPresenceService {
  /** Track user coming online */
  setOnline(userId: string, tenantId: string, socketId: string): void;

  /** Track user going offline */
  setOffline(userId: string): void;

  /** Update user activity (heartbeat) */
  updateActivity(userId: string): void;

  /** Get user's current presence */
  getPresence(userId: string): UserPresence | null;

  /** Get all online users in a tenant */
  getOnlineUsers(tenantId: string): UserPresence[];

  /** Check if user is online */
  isOnline(userId: string): boolean;

  /** Get user's last seen timestamp */
  getLastSeen(userId: string): Date | null;
}

/**
 * Presence WebSocket events (server → client)
 */
export enum PresenceServerEvent {
  USER_ONLINE = 'presence:online',
  USER_AWAY = 'presence:away',
  USER_OFFLINE = 'presence:offline',
  PRESENCE_LIST = 'presence:list',
}

/**
 * Presence WebSocket events (client → server)
 */
export enum PresenceClientEvent {
  HEARTBEAT = 'presence:heartbeat',
  GET_PRESENCE = 'presence:get',
  GET_ONLINE_USERS = 'presence:list',
}
