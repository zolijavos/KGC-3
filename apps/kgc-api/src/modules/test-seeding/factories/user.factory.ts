/**
 * User Factory
 * Creates test users with predictable data for E2E tests.
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SeedUserRequest, SeededUser } from '../types';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Test123!';

export class UserFactory {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a test user with a unique email
   */
  async create(testRunId: string, request: SeedUserRequest): Promise<SeededUser> {
    const timestamp = Date.now();
    const email = request.email ?? `test-${testRunId}-${timestamp}@test.kgc.local`;
    const name = request.name ?? `Test User ${timestamp}`;
    const role = request.role ?? Role.OPERATOR;
    const password = request.password ?? DEFAULT_PASSWORD;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        role,
        tenantId: request.tenantId,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      password, // Return plain password for test login
    };
  }

  /**
   * Create multiple users for different roles
   */
  async createRoleSet(testRunId: string, tenantId: string): Promise<SeededUser[]> {
    const roles: Role[] = [
      Role.OPERATOR,
      Role.TECHNIKUS,
      Role.BOLTVEZETO,
      Role.ACCOUNTANT,
      Role.PARTNER_OWNER,
    ];

    const users: SeededUser[] = [];
    for (const role of roles) {
      const user = await this.create(testRunId, {
        tenantId,
        role,
        name: `Test ${role}`,
        email: `test-${testRunId}-${role.toLowerCase()}@test.kgc.local`,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Cleanup users by test run (via email pattern)
   */
  async cleanup(testRunId: string): Promise<number> {
    const result = await this.prisma.user.deleteMany({
      where: {
        email: {
          startsWith: `test-${testRunId}-`,
        },
      },
    });

    return result.count;
  }
}
