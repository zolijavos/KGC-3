/**
 * KGC ERP API - Database Seed
 * Creates initial data for development/testing
 */

import { PrismaClient, Role, TenantStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'kgc-demo' },
    update: {},
    create: {
      name: 'KGC Demo Tenant',
      slug: 'kgc-demo',
      status: TenantStatus.ACTIVE,
      settings: {
        currency: 'HUF',
        timezone: 'Europe/Budapest',
        language: 'hu',
      },
    },
  });

  console.log(`Created tenant: ${tenant.name} (${tenant.id})`);

  // Create default location
  const location = await prisma.location.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      name: 'Központi Telephely',
      address: 'Budapest, Demo utca 1.',
      isActive: true,
    },
  });

  console.log(`Created location: ${location.name}`);

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kgc.hu' },
    update: {},
    create: {
      email: 'admin@kgc.hu',
      passwordHash,
      name: 'Admin User',
      role: Role.SUPER_ADMIN,
      tenantId: tenant.id,
      locationId: location.id,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  // Create test operator user
  const operatorHash = await bcrypt.hash('operator123', 10);

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@kgc.hu' },
    update: {},
    create: {
      email: 'operator@kgc.hu',
      passwordHash: operatorHash,
      name: 'Test Operator',
      role: Role.OPERATOR,
      tenantId: tenant.id,
      locationId: location.id,
      status: UserStatus.ACTIVE,
      pinHash: await bcrypt.hash('1234', 10), // PIN: 1234
    },
  });

  console.log(`Created operator user: ${operatorUser.email}`);

  console.log('Seeding completed!');
  console.log('');
  console.log('Test credentials:');
  console.log('  Admin:    admin@kgc.hu / admin123');
  console.log('  Operator: operator@kgc.hu / operator123 (PIN: 1234)');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
