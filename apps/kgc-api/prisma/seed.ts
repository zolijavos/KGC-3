/**
 * KGC ERP API - Database Seed
 * Creates comprehensive demo data for development/testing/demo environments
 */

import {
  CashRegisterStatus,
  EquipmentStatus,
  InvoiceStatus,
  InvoiceType,
  PartnerStatus,
  PartnerType,
  PaymentStatusPOS,
  PrismaClient,
  ProductStatus,
  ProductType,
  RentalStatus,
  Role,
  SaleStatus,
  TaskStatus,
  TaskType,
  TenantStatus,
  UserStatus,
  WarehouseStatus,
  WarehouseType,
  WorksheetPriority,
  WorksheetStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding database with demo data...');

  // ============================================
  // TENANT & LOCATION
  // ============================================
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
        vatRate: 27,
      },
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

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
  console.log(`✅ Location: ${location.name}`);

  // ============================================
  // USERS
  // ============================================
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
  console.log(`✅ Admin user: ${adminUser.email}`);

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
      pinHash: await bcrypt.hash('1234', 10),
    },
  });
  console.log(`✅ Operator user: ${operatorUser.email}`);

  // ============================================
  // WAREHOUSE
  // ============================================
  const warehouse = await prisma.warehouse.upsert({
    where: {
      id: '00000000-0000-0000-0000-000000000010',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      tenantId: tenant.id,
      code: 'WH-KOZP',
      name: 'Központi Raktár',
      address: 'Budapest, Raktár utca 1.',
      city: 'Budapest',
      postalCode: '1111',
      isDefault: true,
      isActive: true,
      type: WarehouseType.BRANCH,
      status: WarehouseStatus.ACTIVE,
      contactName: 'Raktáros János',
      contactPhone: '+36 30 111 2222',
      contactEmail: 'raktar@kgc.hu',
    },
  });
  console.log(`✅ Warehouse: ${warehouse.name}`);

  // ============================================
  // PRODUCT CATEGORIES
  // ============================================
  const categoryKisgepek = await prisma.productCategory.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'CAT-KISGEP' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CAT-KISGEP',
      name: 'Kisgépek',
      description: 'Kézi és hordozható elektromos kisgépek',
      level: 0,
      path: '/kisgepek/',
      isActive: true,
    },
  });

  const categoryFurogepek = await prisma.productCategory.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'CAT-FURO' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CAT-FURO',
      name: 'Fúrógépek',
      description: 'Ütvefúrók, fúrókalapácsok',
      parentId: categoryKisgepek.id,
      level: 1,
      path: '/kisgepek/furogepek/',
      isActive: true,
    },
  });

  const categoryCsiszolo = await prisma.productCategory.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'CAT-CSISZ' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CAT-CSISZ',
      name: 'Csiszológépek',
      description: 'Sarok- és rezgőcsiszolók',
      parentId: categoryKisgepek.id,
      level: 1,
      path: '/kisgepek/csiszologepek/',
      isActive: true,
    },
  });

  const categoryKertgep = await prisma.productCategory.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'CAT-KERT' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CAT-KERT',
      name: 'Kerti gépek',
      description: 'Fűnyírók, sövényvágók, fűkaszák',
      level: 0,
      path: '/kertigepek/',
      isActive: true,
    },
  });
  console.log(`✅ Product categories created`);

  // ============================================
  // PRODUCTS (Rental Equipment Types)
  // ============================================
  const productMakitaHR2470 = await prisma.product.upsert({
    where: {
      tenantId_sku: { tenantId: tenant.id, sku: 'MAK-HR2470' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      sku: 'MAK-HR2470',
      name: 'Makita HR2470 Fúrókalapács',
      shortName: 'HR2470',
      description: '780W SDS-Plus fúrókalapács, 2.4J ütési energia',
      type: ProductType.RENTAL_EQUIPMENT,
      status: ProductStatus.ACTIVE,
      categoryId: categoryFurogepek.id,
      unit: 'db',
      listPrice: new Decimal(89900),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const productBoschGBH = await prisma.product.upsert({
    where: {
      tenantId_sku: { tenantId: tenant.id, sku: 'BOSCH-GBH226' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      sku: 'BOSCH-GBH226',
      name: 'Bosch GBH 2-26 DFR Fúrókalapács',
      shortName: 'GBH 2-26',
      description: '800W SDS-Plus fúrókalapács cserélhető tokmánnyal',
      type: ProductType.RENTAL_EQUIPMENT,
      status: ProductStatus.ACTIVE,
      categoryId: categoryFurogepek.id,
      unit: 'db',
      listPrice: new Decimal(109900),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const productMakitaGA5030 = await prisma.product.upsert({
    where: {
      tenantId_sku: { tenantId: tenant.id, sku: 'MAK-GA5030' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      sku: 'MAK-GA5030',
      name: 'Makita GA5030 Sarokcsiszoló',
      shortName: 'GA5030',
      description: '720W, 125mm sarokcsiszoló',
      type: ProductType.RENTAL_EQUIPMENT,
      status: ProductStatus.ACTIVE,
      categoryId: categoryCsiszolo.id,
      unit: 'db',
      listPrice: new Decimal(29900),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const productStihlFS55 = await prisma.product.upsert({
    where: {
      tenantId_sku: { tenantId: tenant.id, sku: 'STIHL-FS55' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      sku: 'STIHL-FS55',
      name: 'Stihl FS 55 Fűkasza',
      shortName: 'FS 55',
      description: 'Benzinmotoros fűkasza, 27.2cc',
      type: ProductType.RENTAL_EQUIPMENT,
      status: ProductStatus.ACTIVE,
      categoryId: categoryKertgep.id,
      unit: 'db',
      listPrice: new Decimal(159900),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const productHusqvarnaLC140 = await prisma.product.upsert({
    where: {
      tenantId_sku: { tenantId: tenant.id, sku: 'HUSQ-LC140' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      sku: 'HUSQ-LC140',
      name: 'Husqvarna LC 140 Fűnyíró',
      shortName: 'LC 140',
      description: 'Benzines fűnyíró, 40cm vágószélesség',
      type: ProductType.RENTAL_EQUIPMENT,
      status: ProductStatus.ACTIVE,
      categoryId: categoryKertgep.id,
      unit: 'db',
      listPrice: new Decimal(139900),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Products created`);

  // ============================================
  // PARTNERS (Customers)
  // ============================================
  const partnerKovacs = await prisma.partner.upsert({
    where: {
      tenantId_partnerCode: { tenantId: tenant.id, partnerCode: 'P-000001' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      partnerCode: 'P-000001',
      name: 'Kovács István',
      type: PartnerType.INDIVIDUAL,
      status: PartnerStatus.ACTIVE,
      email: 'kovacs.istvan@email.hu',
      phone: '+36 20 123 4567',
      country: 'HU',
      postalCode: '1052',
      city: 'Budapest',
      address: 'Váci utca 12.',
      idCardNumber: '123456AB',
      creditLimit: new Decimal(100000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const partnerNagy = await prisma.partner.upsert({
    where: {
      tenantId_partnerCode: { tenantId: tenant.id, partnerCode: 'P-000002' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      partnerCode: 'P-000002',
      name: 'Nagy Péter',
      type: PartnerType.INDIVIDUAL,
      status: PartnerStatus.ACTIVE,
      email: 'nagy.peter@email.hu',
      phone: '+36 30 234 5678',
      country: 'HU',
      postalCode: '1134',
      city: 'Budapest',
      address: 'Róbert Károly krt. 82.',
      creditLimit: new Decimal(150000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const partnerEpitokft = await prisma.partner.upsert({
    where: {
      tenantId_partnerCode: { tenantId: tenant.id, partnerCode: 'C-000001' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      partnerCode: 'C-000001',
      name: 'Építő Kft.',
      companyName: 'Építő és Szerelő Korlátolt Felelősségű Társaság',
      type: PartnerType.COMPANY,
      status: PartnerStatus.ACTIVE,
      taxNumber: '12345678-2-41',
      email: 'info@epitokft.hu',
      phone: '+36 1 234 5678',
      contactName: 'Szabó Gábor',
      country: 'HU',
      postalCode: '1138',
      city: 'Budapest',
      address: 'Népfürdő utca 22.',
      creditLimit: new Decimal(500000),
      paymentTermDays: 15,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const partnerKertesz = await prisma.partner.upsert({
    where: {
      tenantId_partnerCode: { tenantId: tenant.id, partnerCode: 'C-000002' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      partnerCode: 'C-000002',
      name: 'Zöld Kertész Bt.',
      companyName: 'Zöld Kertész Betéti Társaság',
      type: PartnerType.COMPANY,
      status: PartnerStatus.ACTIVE,
      taxNumber: '87654321-1-13',
      email: 'rendeles@zoldkertesz.hu',
      phone: '+36 70 345 6789',
      contactName: 'Tóth Anna',
      country: 'HU',
      postalCode: '2030',
      city: 'Érd',
      address: 'Fő utca 100.',
      creditLimit: new Decimal(300000),
      paymentTermDays: 8,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Partners created`);

  // ============================================
  // RENTAL EQUIPMENT (Physical machines)
  // ============================================
  const equipment1 = await prisma.rentalEquipment.upsert({
    where: {
      tenantId_equipmentCode: { tenantId: tenant.id, equipmentCode: 'EQ-001' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      equipmentCode: 'EQ-001',
      serialNumber: 'MAK-HR2470-001',
      productId: productMakitaHR2470.id,
      warehouseId: warehouse.id,
      status: EquipmentStatus.AVAILABLE,
      condition: 'GOOD',
      dailyRate: new Decimal(5000),
      weeklyRate: new Decimal(25000),
      monthlyRate: new Decimal(80000),
      depositAmount: new Decimal(50000),
      purchaseDate: new Date('2023-06-15'),
      purchasePrice: new Decimal(89900),
      currentValue: new Decimal(65000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const _equipment2 = await prisma.rentalEquipment.upsert({
    where: {
      tenantId_equipmentCode: { tenantId: tenant.id, equipmentCode: 'EQ-002' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      equipmentCode: 'EQ-002',
      serialNumber: 'MAK-HR2470-002',
      productId: productMakitaHR2470.id,
      warehouseId: warehouse.id,
      status: EquipmentStatus.AVAILABLE,
      condition: 'NEW',
      dailyRate: new Decimal(5500),
      weeklyRate: new Decimal(27500),
      monthlyRate: new Decimal(88000),
      depositAmount: new Decimal(50000),
      purchaseDate: new Date('2024-01-10'),
      purchasePrice: new Decimal(94900),
      currentValue: new Decimal(85000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const equipment3 = await prisma.rentalEquipment.upsert({
    where: {
      tenantId_equipmentCode: { tenantId: tenant.id, equipmentCode: 'EQ-003' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      equipmentCode: 'EQ-003',
      serialNumber: 'BOSCH-GBH226-001',
      productId: productBoschGBH.id,
      warehouseId: warehouse.id,
      status: EquipmentStatus.RENTED,
      condition: 'GOOD',
      dailyRate: new Decimal(6000),
      weeklyRate: new Decimal(30000),
      monthlyRate: new Decimal(96000),
      depositAmount: new Decimal(60000),
      purchaseDate: new Date('2023-03-20'),
      purchasePrice: new Decimal(109900),
      currentValue: new Decimal(75000),
      totalRentals: 15,
      totalRevenue: new Decimal(225000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const _equipment4 = await prisma.rentalEquipment.upsert({
    where: {
      tenantId_equipmentCode: { tenantId: tenant.id, equipmentCode: 'EQ-004' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      equipmentCode: 'EQ-004',
      serialNumber: 'MAK-GA5030-001',
      productId: productMakitaGA5030.id,
      warehouseId: warehouse.id,
      status: EquipmentStatus.AVAILABLE,
      condition: 'GOOD',
      dailyRate: new Decimal(3000),
      weeklyRate: new Decimal(15000),
      monthlyRate: new Decimal(48000),
      depositAmount: new Decimal(25000),
      purchaseDate: new Date('2023-09-01'),
      purchasePrice: new Decimal(29900),
      currentValue: new Decimal(22000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const equipment5 = await prisma.rentalEquipment.upsert({
    where: {
      tenantId_equipmentCode: { tenantId: tenant.id, equipmentCode: 'EQ-005' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      equipmentCode: 'EQ-005',
      serialNumber: 'STIHL-FS55-001',
      productId: productStihlFS55.id,
      warehouseId: warehouse.id,
      status: EquipmentStatus.RENTED,
      condition: 'GOOD',
      dailyRate: new Decimal(8000),
      weeklyRate: new Decimal(40000),
      monthlyRate: new Decimal(128000),
      depositAmount: new Decimal(80000),
      purchaseDate: new Date('2023-04-15'),
      purchasePrice: new Decimal(159900),
      currentValue: new Decimal(120000),
      totalRentals: 22,
      totalRevenue: new Decimal(440000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const equipment6 = await prisma.rentalEquipment.upsert({
    where: {
      tenantId_equipmentCode: { tenantId: tenant.id, equipmentCode: 'EQ-006' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      equipmentCode: 'EQ-006',
      serialNumber: 'HUSQ-LC140-001',
      productId: productHusqvarnaLC140.id,
      warehouseId: warehouse.id,
      status: EquipmentStatus.AVAILABLE,
      condition: 'NEW',
      dailyRate: new Decimal(7000),
      weeklyRate: new Decimal(35000),
      monthlyRate: new Decimal(112000),
      depositAmount: new Decimal(70000),
      purchaseDate: new Date('2024-03-01'),
      purchasePrice: new Decimal(139900),
      currentValue: new Decimal(130000),
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Rental equipment created (6 items)`);

  // ============================================
  // RENTALS (Active and completed)
  // ============================================
  const today = new Date();
  const startDate1 = new Date(today);
  startDate1.setDate(today.getDate() - 3);
  const expectedEnd1 = new Date(today);
  expectedEnd1.setDate(today.getDate() + 4);

  const rental1 = await prisma.rental.upsert({
    where: {
      tenantId_rentalCode: { tenantId: tenant.id, rentalCode: 'R-2024-001' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      rentalCode: 'R-2024-001',
      partnerId: partnerEpitokft.id,
      status: RentalStatus.ACTIVE,
      startDate: startDate1,
      expectedEnd: expectedEnd1,
      warehouseId: warehouse.id,
      subtotal: new Decimal(42000),
      discountAmount: new Decimal(0),
      lateFeeAmount: new Decimal(0),
      totalAmount: new Decimal(42000),
      vatAmount: new Decimal(11340),
      grandTotal: new Decimal(53340),
      depositRequired: new Decimal(60000),
      depositPaid: new Decimal(60000),
      issuedBy: operatorUser.id,
      issuedAt: startDate1,
      notes: 'Építési projekt - Róbert Károly körút felújítás',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });

  // RentalItem for rental1
  await prisma.rentalItem.upsert({
    where: { id: '00000000-0000-0000-0001-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000001',
      rentalId: rental1.id,
      equipmentId: equipment3.id,
      quantity: 1,
      dailyRate: new Decimal(6000),
      weeklyRate: new Decimal(30000),
      appliedRate: new Decimal(6000),
      totalDays: 7,
      itemTotal: new Decimal(42000),
    },
  });
  console.log(`✅ Rental R-2024-001 (ACTIVE): ${partnerEpitokft.name}`);

  // Rental 2 - Active, garden work
  const startDate2 = new Date(today);
  startDate2.setDate(today.getDate() - 1);
  const expectedEnd2 = new Date(today);
  expectedEnd2.setDate(today.getDate() + 2);

  const rental2 = await prisma.rental.upsert({
    where: {
      tenantId_rentalCode: { tenantId: tenant.id, rentalCode: 'R-2024-002' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      rentalCode: 'R-2024-002',
      partnerId: partnerKertesz.id,
      status: RentalStatus.ACTIVE,
      startDate: startDate2,
      expectedEnd: expectedEnd2,
      warehouseId: warehouse.id,
      subtotal: new Decimal(24000),
      discountAmount: new Decimal(2400),
      discountReason: 'Törzsvásárlói kedvezmény 10%',
      lateFeeAmount: new Decimal(0),
      totalAmount: new Decimal(21600),
      vatAmount: new Decimal(5832),
      grandTotal: new Decimal(27432),
      depositRequired: new Decimal(80000),
      depositPaid: new Decimal(80000),
      issuedBy: operatorUser.id,
      issuedAt: startDate2,
      notes: 'Érd, családi ház kert rendezés',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });

  await prisma.rentalItem.upsert({
    where: { id: '00000000-0000-0000-0001-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000002',
      rentalId: rental2.id,
      equipmentId: equipment5.id,
      quantity: 1,
      dailyRate: new Decimal(8000),
      weeklyRate: new Decimal(40000),
      appliedRate: new Decimal(8000),
      totalDays: 3,
      itemTotal: new Decimal(24000),
    },
  });
  console.log(`✅ Rental R-2024-002 (ACTIVE): ${partnerKertesz.name}`);

  // Rental 3 - Completed last week
  const startDate3 = new Date(today);
  startDate3.setDate(today.getDate() - 10);
  const expectedEnd3 = new Date(today);
  expectedEnd3.setDate(today.getDate() - 5);

  const rental3 = await prisma.rental.upsert({
    where: {
      tenantId_rentalCode: { tenantId: tenant.id, rentalCode: 'R-2024-003' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      rentalCode: 'R-2024-003',
      partnerId: partnerKovacs.id,
      status: RentalStatus.COMPLETED,
      startDate: startDate3,
      expectedEnd: expectedEnd3,
      actualEnd: expectedEnd3,
      returnedAt: expectedEnd3,
      warehouseId: warehouse.id,
      subtotal: new Decimal(25000),
      discountAmount: new Decimal(0),
      lateFeeAmount: new Decimal(0),
      totalAmount: new Decimal(25000),
      vatAmount: new Decimal(6750),
      grandTotal: new Decimal(31750),
      depositRequired: new Decimal(50000),
      depositPaid: new Decimal(50000),
      depositReturned: new Decimal(50000),
      issuedBy: operatorUser.id,
      issuedAt: startDate3,
      returnedBy: operatorUser.id,
      returnNotes: 'Gép rendben visszahozva, tiszta állapotban',
      notes: 'Háztartási felújítás',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });

  await prisma.rentalItem.upsert({
    where: { id: '00000000-0000-0000-0001-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000003',
      rentalId: rental3.id,
      equipmentId: equipment1.id,
      quantity: 1,
      dailyRate: new Decimal(5000),
      weeklyRate: new Decimal(25000),
      appliedRate: new Decimal(5000),
      totalDays: 5,
      itemTotal: new Decimal(25000),
      returnedAt: expectedEnd3,
      condition: 'GOOD',
    },
  });
  console.log(`✅ Rental R-2024-003 (COMPLETED): ${partnerKovacs.name}`);

  // Rental 4 - Draft (reservation)
  const startDate4 = new Date(today);
  startDate4.setDate(today.getDate() + 3);
  const expectedEnd4 = new Date(today);
  expectedEnd4.setDate(today.getDate() + 10);

  const rental4 = await prisma.rental.upsert({
    where: {
      tenantId_rentalCode: { tenantId: tenant.id, rentalCode: 'R-2024-004' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      rentalCode: 'R-2024-004',
      partnerId: partnerNagy.id,
      status: RentalStatus.DRAFT,
      startDate: startDate4,
      expectedEnd: expectedEnd4,
      warehouseId: warehouse.id,
      subtotal: new Decimal(35000),
      discountAmount: new Decimal(0),
      lateFeeAmount: new Decimal(0),
      totalAmount: new Decimal(35000),
      vatAmount: new Decimal(9450),
      grandTotal: new Decimal(44450),
      depositRequired: new Decimal(70000),
      depositPaid: new Decimal(0),
      notes: 'Előfoglalás - hétvégi kerti munka',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });

  await prisma.rentalItem.upsert({
    where: { id: '00000000-0000-0000-0001-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000004',
      rentalId: rental4.id,
      equipmentId: equipment6.id,
      quantity: 1,
      dailyRate: new Decimal(7000),
      weeklyRate: new Decimal(35000),
      appliedRate: new Decimal(5000),
      totalDays: 7,
      itemTotal: new Decimal(35000),
    },
  });
  console.log(`✅ Rental R-2024-004 (DRAFT): ${partnerNagy.name}`);

  // ============================================
  // WORKSHEETS (Munkalapok)
  // ============================================
  const worksheet1 = await prisma.worksheet.upsert({
    where: { id: '00000000-0000-0000-0002-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000001',
      tenantId: tenant.id,
      worksheetNumber: 'ML-2024-00001',
      partnerId: partnerKovacs.id,
      status: WorksheetStatus.IN_PROGRESS,
      priority: WorksheetPriority.HIGH,
      brand: 'Makita',
      model: 'HR2470',
      serialNumber: 'MAK-12345',
      reportedIssue: 'Fúrókalapács nem üt, csak forog. Szénkefe ellenőrzés szükséges.',
      diagnosticNotes: 'Szénkefe kopott, csere szükséges. Motor rendben.',
      customerCostLimit: new Decimal(25000),
      estimatedCost: new Decimal(15000),
      receivedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      diagnosedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      startedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      promisedDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      laborCost: new Decimal(8000),
      partsCost: new Decimal(5500),
      subtotal: new Decimal(13500),
      vatAmount: new Decimal(3645),
      totalAmount: new Decimal(17145),
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Worksheet ML-2024-00001 (IN_PROGRESS): Makita HR2470`);

  const worksheet2 = await prisma.worksheet.upsert({
    where: { id: '00000000-0000-0000-0002-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000002',
      tenantId: tenant.id,
      worksheetNumber: 'ML-2024-00002',
      partnerId: partnerEpitokft.id,
      status: WorksheetStatus.COMPLETED,
      priority: WorksheetPriority.WARRANTY,
      isWarranty: true,
      brand: 'Bosch',
      model: 'GBH 2-26 DFR',
      serialNumber: 'BOSCH-67890',
      purchaseDate: new Date('2024-06-15'),
      warrantyEndDate: new Date('2026-06-15'),
      reportedIssue: 'Tokmány nem rögzít megfelelően, kiesik a fúró.',
      diagnosticNotes: 'Tokmány sérült, garanciális csere.',
      internalNotes: 'Garanciális igény elfogadva - Bosch Hungary',
      receivedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      diagnosedAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
      startedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      laborCost: new Decimal(0),
      partsCost: new Decimal(0),
      subtotal: new Decimal(0),
      vatAmount: new Decimal(0),
      totalAmount: new Decimal(0),
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Worksheet ML-2024-00002 (COMPLETED): Bosch GBH 2-26 (garanciális)`);

  const worksheet3 = await prisma.worksheet.upsert({
    where: { id: '00000000-0000-0000-0002-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000003',
      tenantId: tenant.id,
      worksheetNumber: 'ML-2024-00003',
      partnerId: partnerKertesz.id,
      status: WorksheetStatus.WAITING_PARTS,
      priority: WorksheetPriority.NORMAL,
      brand: 'Stihl',
      model: 'FS 55',
      serialNumber: 'STIHL-11223',
      reportedIssue: 'Fűkasza nem indul, berántó kötél szakadt.',
      diagnosticNotes: 'Starter egység sérült, új alkatrész rendelve.',
      customerCostLimit: new Decimal(50000),
      estimatedCost: new Decimal(28000),
      requiresQuote: true,
      receivedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      diagnosedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      promisedDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
      laborCost: new Decimal(12000),
      partsCost: new Decimal(16000),
      subtotal: new Decimal(28000),
      vatAmount: new Decimal(7560),
      totalAmount: new Decimal(35560),
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Worksheet ML-2024-00003 (WAITING_PARTS): Stihl FS 55`);

  const _worksheet4 = await prisma.worksheet.upsert({
    where: { id: '00000000-0000-0000-0002-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0002-000000000004',
      tenantId: tenant.id,
      worksheetNumber: 'ML-2024-00004',
      partnerId: partnerNagy.id,
      status: WorksheetStatus.DRAFT,
      priority: WorksheetPriority.NORMAL,
      brand: 'Makita',
      model: 'GA5030',
      reportedIssue: 'Sarokcsiszoló rezeg, zörög használat közben.',
      receivedAt: new Date(),
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Worksheet ML-2024-00004 (DRAFT): Makita GA5030`);

  // Worksheet items for worksheet1
  await prisma.worksheetItem.upsert({
    where: { id: '00000000-0000-0000-0003-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000001',
      worksheetId: worksheet1.id,
      itemType: 'PART',
      description: 'Makita szénkefe pár CB-303',
      quantity: new Decimal(1),
      unit: 'pár',
      unitPrice: new Decimal(5500),
      totalPrice: new Decimal(5500),
    },
  });

  await prisma.worksheetItem.upsert({
    where: { id: '00000000-0000-0000-0003-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0003-000000000002',
      worksheetId: worksheet1.id,
      itemType: 'LABOR',
      description: 'Szénkefe csere munkadíj',
      quantity: new Decimal(1),
      unit: 'óra',
      unitPrice: new Decimal(8000),
      totalPrice: new Decimal(8000),
    },
  });
  console.log(`✅ Worksheet items created`);

  // ============================================
  // INVOICES (Számlák)
  // ============================================
  const invoice1 = await prisma.invoice.upsert({
    where: { id: '00000000-0000-0000-0004-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000001',
      tenantId: tenant.id,
      invoiceNumber: 'KGC-2024-00001',
      partnerId: partnerEpitokft.id,
      type: InvoiceType.STANDARD,
      status: InvoiceStatus.PAID,
      issueDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      deliveryDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      paidAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      subtotal: new Decimal(42000),
      vatAmount: new Decimal(11340),
      totalAmount: new Decimal(53340),
      paidAmount: new Decimal(53340),
      balanceDue: new Decimal(0),
      paymentMethod: 'TRANSFER',
      notes: 'Bérlési díj - R-2024-001',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Invoice KGC-2024-00001 (PAID): ${partnerEpitokft.name}`);

  const invoice2 = await prisma.invoice.upsert({
    where: { id: '00000000-0000-0000-0004-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000002',
      tenantId: tenant.id,
      invoiceNumber: 'KGC-2024-00002',
      partnerId: partnerKovacs.id,
      type: InvoiceType.STANDARD,
      status: InvoiceStatus.SENT,
      issueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
      deliveryDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      subtotal: new Decimal(25000),
      vatAmount: new Decimal(6750),
      totalAmount: new Decimal(31750),
      paidAmount: new Decimal(0),
      balanceDue: new Decimal(31750),
      paymentMethod: 'TRANSFER',
      sentAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      sentTo: 'kovacs.istvan@email.hu',
      notes: 'Bérlési díj - R-2024-003',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Invoice KGC-2024-00002 (SENT): ${partnerKovacs.name}`);

  const _invoice3 = await prisma.invoice.upsert({
    where: { id: '00000000-0000-0000-0004-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000003',
      tenantId: tenant.id,
      invoiceNumber: 'KGC-2024-00003',
      partnerId: partnerKertesz.id,
      type: InvoiceType.PROFORMA,
      status: InvoiceStatus.DRAFT,
      issueDate: new Date(),
      dueDate: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000),
      subtotal: new Decimal(35560),
      vatAmount: new Decimal(9601),
      totalAmount: new Decimal(45161),
      paidAmount: new Decimal(0),
      balanceDue: new Decimal(45161),
      notes: 'Szerviz munkadíj - ML-2024-00003',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Invoice KGC-2024-00003 (DRAFT proforma): ${partnerKertesz.name}`);

  const _invoice4 = await prisma.invoice.upsert({
    where: { id: '00000000-0000-0000-0004-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000004',
      tenantId: tenant.id,
      invoiceNumber: 'KGC-2024-00004',
      partnerId: partnerNagy.id,
      type: InvoiceType.STANDARD,
      status: InvoiceStatus.OVERDUE,
      issueDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      deliveryDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      subtotal: new Decimal(15000),
      vatAmount: new Decimal(4050),
      totalAmount: new Decimal(19050),
      paidAmount: new Decimal(0),
      balanceDue: new Decimal(19050),
      paymentMethod: 'TRANSFER',
      sentAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      sentTo: 'nagy.peter@email.hu',
      notes: 'Sarokcsiszoló javítás',
      createdBy: operatorUser.id,
      updatedBy: operatorUser.id,
    },
  });
  console.log(`✅ Invoice KGC-2024-00004 (OVERDUE): ${partnerNagy.name}`);

  // Invoice items
  await prisma.invoiceItem.upsert({
    where: { id: '00000000-0000-0000-0005-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0005-000000000001',
      invoiceId: invoice1.id,
      itemType: 'RENTAL',
      description: 'Bosch GBH 2-26 DFR bérlés (7 nap)',
      quantity: new Decimal(7),
      unit: 'nap',
      unitPrice: new Decimal(6000),
      vatPercent: new Decimal(27),
      vatAmount: new Decimal(11340),
      totalPrice: new Decimal(53340),
      referenceType: 'RENTAL',
      referenceId: rental1.id,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: '00000000-0000-0000-0005-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0005-000000000002',
      invoiceId: invoice2.id,
      itemType: 'RENTAL',
      description: 'Makita HR2470 bérlés (5 nap)',
      quantity: new Decimal(5),
      unit: 'nap',
      unitPrice: new Decimal(5000),
      vatPercent: new Decimal(27),
      vatAmount: new Decimal(6750),
      totalPrice: new Decimal(31750),
      referenceType: 'RENTAL',
      referenceId: rental3.id,
    },
  });
  console.log(`✅ Invoice items created`);

  // ============================================
  // TASKS (Feladatok)
  // ============================================
  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0006-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000001',
      tenantId: tenant.id,
      locationId: location.id,
      type: TaskType.TODO,
      status: TaskStatus.OPEN,
      title: 'Makita HR2470 szénkefe csere befejezése',
      description: 'ML-2024-00001 munkalaphoz tartozó javítás befejezése',
      assignedToIds: JSON.stringify([operatorUser.id]),
      dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
      priority: 2, // Sürgős
      worksheetId: worksheet1.id,
      createdBy: adminUser.id,
    },
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0006-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000002',
      tenantId: tenant.id,
      locationId: location.id,
      type: TaskType.SHOPPING,
      status: TaskStatus.OPEN,
      title: 'Stihl starter alkatrész rendelés',
      description: 'FS 55 starter egység - 1 db',
      quantity: 1,
      unit: 'db',
      assignedToIds: JSON.stringify([adminUser.id]),
      dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      priority: 1, // Magas
      worksheetId: worksheet3.id,
      createdBy: operatorUser.id,
    },
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0006-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000003',
      tenantId: tenant.id,
      locationId: location.id,
      type: TaskType.TODO,
      status: TaskStatus.IN_PROGRESS,
      title: 'Heti készletleltár',
      description: 'Elektromos kisgépek készletének ellenőrzése a központi raktárban',
      assignedToIds: JSON.stringify([operatorUser.id]),
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      priority: 0, // Normál
      createdBy: adminUser.id,
    },
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0006-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000004',
      tenantId: tenant.id,
      locationId: location.id,
      type: TaskType.MESSAGE,
      status: TaskStatus.OPEN,
      title: 'Ügyfél visszahívás - Nagy Péter',
      description: 'Lejárt számlával kapcsolatban egyeztetés szükséges',
      assignedToIds: JSON.stringify([adminUser.id]),
      dueDate: new Date(),
      priority: 2, // Sürgős
      createdBy: operatorUser.id,
    },
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0006-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000005',
      tenantId: tenant.id,
      locationId: location.id,
      type: TaskType.TODO,
      status: TaskStatus.COMPLETED,
      title: 'Bosch garanciális igény lezárása',
      description: 'ML-2024-00002 dokumentáció és lezárás',
      assignedToIds: JSON.stringify([operatorUser.id]),
      dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      priority: 1,
      worksheetId: worksheet2.id,
      completedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      completedBy: operatorUser.id,
      createdBy: adminUser.id,
    },
  });

  await prisma.task.upsert({
    where: { id: '00000000-0000-0000-0006-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-0006-000000000006',
      tenantId: tenant.id,
      locationId: location.id,
      type: TaskType.NOTE,
      status: TaskStatus.OPEN,
      title: 'Személyes emlékeztető',
      description: 'Holnap reggel 8:00 - Építő Kft. találkozó',
      isPrivate: true,
      assignedToIds: JSON.stringify([adminUser.id]),
      priority: 0,
      createdBy: adminUser.id,
    },
  });
  console.log(`✅ Tasks created (6 items)`);

  // ============================================
  // CASH REGISTER SESSIONS & SALES (POS)
  // ============================================
  const session1 = await prisma.cashRegisterSession.upsert({
    where: { id: '00000000-0000-0000-0007-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0007-000000000001',
      tenantId: tenant.id,
      sessionNumber: 'KASSZA-2024-0001',
      locationId: warehouse.id,
      status: CashRegisterStatus.OPEN,
      openedAt: new Date(today.setHours(8, 0, 0, 0)),
      openingBalance: new Decimal(50000),
      openedBy: operatorUser.id,
    },
  });
  console.log(`✅ Cash register session: ${session1.sessionNumber}`);

  // Sale 1 - Completed sale with payment
  const sale1 = await prisma.saleTransaction.upsert({
    where: { id: '00000000-0000-0000-0008-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0008-000000000001',
      tenantId: tenant.id,
      sessionId: session1.id,
      transactionNumber: 'ELADAS-2024-0001',
      customerId: partnerKovacs.id,
      customerName: partnerKovacs.name,
      subtotal: new Decimal(89900),
      taxAmount: new Decimal(24273),
      discountAmount: new Decimal(0),
      total: new Decimal(114173),
      paymentStatus: PaymentStatusPOS.PAID,
      paidAmount: new Decimal(115000),
      changeAmount: new Decimal(827),
      status: SaleStatus.COMPLETED,
      createdBy: operatorUser.id,
      createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  await prisma.saleItem.upsert({
    where: { id: '00000000-0000-0000-0009-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000001',
      transactionId: sale1.id,
      tenantId: tenant.id,
      productId: productMakitaHR2470.id,
      productCode: 'MAK-HR2470',
      productName: 'Makita HR2470 Fúrókalapács',
      quantity: new Decimal(1),
      unitPrice: new Decimal(89900),
      taxRate: new Decimal(27),
      discountPercent: new Decimal(0),
      lineSubtotal: new Decimal(89900),
      lineTax: new Decimal(24273),
      lineTotal: new Decimal(114173),
      inventoryDeducted: true,
      warehouseId: warehouse.id,
    },
  });
  console.log(`✅ Sale ELADAS-2024-0001 (COMPLETED): ${partnerKovacs.name}`);

  // Sale 2 - Completed sale with discount
  const sale2 = await prisma.saleTransaction.upsert({
    where: { id: '00000000-0000-0000-0008-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0008-000000000002',
      tenantId: tenant.id,
      sessionId: session1.id,
      transactionNumber: 'ELADAS-2024-0002',
      customerId: partnerEpitokft.id,
      customerName: partnerEpitokft.name,
      customerTaxNumber: partnerEpitokft.taxNumber,
      subtotal: new Decimal(134820),
      taxAmount: new Decimal(36401),
      discountAmount: new Decimal(13980),
      total: new Decimal(171221),
      paymentStatus: PaymentStatusPOS.PAID,
      paidAmount: new Decimal(171221),
      changeAmount: new Decimal(0),
      status: SaleStatus.COMPLETED,
      createdBy: operatorUser.id,
      createdAt: new Date(today.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
  });

  await prisma.saleItem.upsert({
    where: { id: '00000000-0000-0000-0009-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000002',
      transactionId: sale2.id,
      tenantId: tenant.id,
      productId: productBoschGBH.id,
      productCode: 'BOSCH-GBH226',
      productName: 'Bosch GBH 2-26 DFR Fúrókalapács',
      quantity: new Decimal(1),
      unitPrice: new Decimal(109900),
      taxRate: new Decimal(27),
      discountPercent: new Decimal(10),
      lineSubtotal: new Decimal(98910),
      lineTax: new Decimal(26706),
      lineTotal: new Decimal(125616),
      inventoryDeducted: true,
      warehouseId: warehouse.id,
    },
  });

  await prisma.saleItem.upsert({
    where: { id: '00000000-0000-0000-0009-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000003',
      transactionId: sale2.id,
      tenantId: tenant.id,
      productId: productMakitaGA5030.id,
      productCode: 'MAK-GA5030',
      productName: 'Makita GA5030 Sarokcsiszoló',
      quantity: new Decimal(2),
      unitPrice: new Decimal(29900),
      taxRate: new Decimal(27),
      discountPercent: new Decimal(10),
      lineSubtotal: new Decimal(53820),
      lineTax: new Decimal(14531),
      lineTotal: new Decimal(68351),
      inventoryDeducted: true,
      warehouseId: warehouse.id,
    },
  });
  console.log(`✅ Sale ELADAS-2024-0002 (COMPLETED): ${partnerEpitokft.name}`);

  // Sale 3 - In progress (cart)
  const sale3 = await prisma.saleTransaction.upsert({
    where: { id: '00000000-0000-0000-0008-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0008-000000000003',
      tenantId: tenant.id,
      sessionId: session1.id,
      transactionNumber: 'ELADAS-2024-0003',
      subtotal: new Decimal(159900),
      taxAmount: new Decimal(43173),
      discountAmount: new Decimal(0),
      total: new Decimal(203073),
      paymentStatus: PaymentStatusPOS.PENDING,
      paidAmount: new Decimal(0),
      changeAmount: new Decimal(0),
      status: SaleStatus.IN_PROGRESS,
      createdBy: operatorUser.id,
      createdAt: new Date(today.getTime() - 10 * 60 * 1000), // 10 minutes ago
    },
  });

  await prisma.saleItem.upsert({
    where: { id: '00000000-0000-0000-0009-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000004',
      transactionId: sale3.id,
      tenantId: tenant.id,
      productId: productStihlFS55.id,
      productCode: 'STIHL-FS55',
      productName: 'Stihl FS 55 Fűkasza',
      quantity: new Decimal(1),
      unitPrice: new Decimal(159900),
      taxRate: new Decimal(27),
      discountPercent: new Decimal(0),
      lineSubtotal: new Decimal(159900),
      lineTax: new Decimal(43173),
      lineTotal: new Decimal(203073),
      inventoryDeducted: false,
      warehouseId: warehouse.id,
    },
  });
  console.log(`✅ Sale ELADAS-2024-0003 (IN_PROGRESS): Aktív kosár`);

  // Sale 4 - Voided transaction
  const sale4 = await prisma.saleTransaction.upsert({
    where: { id: '00000000-0000-0000-0008-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0008-000000000004',
      tenantId: tenant.id,
      sessionId: session1.id,
      transactionNumber: 'ELADAS-2024-0004',
      customerId: partnerNagy.id,
      customerName: partnerNagy.name,
      subtotal: new Decimal(29900),
      taxAmount: new Decimal(8073),
      discountAmount: new Decimal(0),
      total: new Decimal(37973),
      paymentStatus: PaymentStatusPOS.PENDING,
      paidAmount: new Decimal(0),
      changeAmount: new Decimal(0),
      status: SaleStatus.VOIDED,
      voidedAt: new Date(today.getTime() - 30 * 60 * 1000),
      voidedBy: operatorUser.id,
      voidReason: 'Vevő meggondolta magát',
      createdBy: operatorUser.id,
      createdAt: new Date(today.getTime() - 45 * 60 * 1000), // 45 minutes ago
    },
  });

  await prisma.saleItem.upsert({
    where: { id: '00000000-0000-0000-0009-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000005',
      transactionId: sale4.id,
      tenantId: tenant.id,
      productId: productMakitaGA5030.id,
      productCode: 'MAK-GA5030',
      productName: 'Makita GA5030 Sarokcsiszoló',
      quantity: new Decimal(1),
      unitPrice: new Decimal(29900),
      taxRate: new Decimal(27),
      discountPercent: new Decimal(0),
      lineSubtotal: new Decimal(29900),
      lineTax: new Decimal(8073),
      lineTotal: new Decimal(37973),
      inventoryDeducted: false,
    },
  });
  console.log(`✅ Sale ELADAS-2024-0004 (VOIDED): ${partnerNagy.name}`);

  // Sale 5 - Pending payment
  const sale5 = await prisma.saleTransaction.upsert({
    where: { id: '00000000-0000-0000-0008-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0008-000000000005',
      tenantId: tenant.id,
      sessionId: session1.id,
      transactionNumber: 'ELADAS-2024-0005',
      customerId: partnerKertesz.id,
      customerName: partnerKertesz.name,
      customerTaxNumber: partnerKertesz.taxNumber,
      subtotal: new Decimal(139900),
      taxAmount: new Decimal(37773),
      discountAmount: new Decimal(0),
      total: new Decimal(177673),
      paymentStatus: PaymentStatusPOS.PENDING,
      paidAmount: new Decimal(0),
      changeAmount: new Decimal(0),
      status: SaleStatus.PENDING_PAYMENT,
      createdBy: operatorUser.id,
      createdAt: new Date(today.getTime() - 5 * 60 * 1000), // 5 minutes ago
    },
  });

  await prisma.saleItem.upsert({
    where: { id: '00000000-0000-0000-0009-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000006',
      transactionId: sale5.id,
      tenantId: tenant.id,
      productId: productHusqvarnaLC140.id,
      productCode: 'HUSQ-LC140',
      productName: 'Husqvarna LC 140 Fűnyíró',
      quantity: new Decimal(1),
      unitPrice: new Decimal(139900),
      taxRate: new Decimal(27),
      discountPercent: new Decimal(0),
      lineSubtotal: new Decimal(139900),
      lineTax: new Decimal(37773),
      lineTotal: new Decimal(177673),
      inventoryDeducted: false,
      warehouseId: warehouse.id,
    },
  });
  console.log(`✅ Sale ELADAS-2024-0005 (PENDING_PAYMENT): ${partnerKertesz.name}`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('🎉 Seeding completed successfully!');
  console.log('════════════════════════════════════════════════════════');
  console.log('');
  console.log('📊 Data created:');
  console.log('   • 1 Tenant (KGC Demo)');
  console.log('   • 1 Location (Központi Telephely)');
  console.log('   • 1 Warehouse (Központi Raktár)');
  console.log('   • 2 Users (admin, operator)');
  console.log('   • 4 Product Categories');
  console.log('   • 5 Products (rental equipment types)');
  console.log('   • 4 Partners (2 individuals, 2 companies)');
  console.log('   • 6 Rental Equipment items');
  console.log('   • 4 Rentals (2 active, 1 completed, 1 draft)');
  console.log('   • 4 Worksheets (1 draft, 1 in_progress, 1 waiting_parts, 1 completed)');
  console.log('   • 4 Invoices (1 paid, 1 sent, 1 draft, 1 overdue)');
  console.log('   • 6 Tasks (2 open, 1 in_progress, 1 completed, + shopping, note)');
  console.log('   • 1 Cash Register Session (OPEN)');
  console.log('   • 5 Sales (2 completed, 1 in_progress, 1 pending_payment, 1 voided)');
  console.log('');
  console.log('🔑 Test credentials:');
  console.log('   Admin:    admin@kgc.hu / admin123');
  console.log('   Operator: operator@kgc.hu / operator123 (PIN: 1234)');
  console.log('');
  console.log('📍 Sample codes:');
  console.log('   Rentals: R-2024-001 to R-2024-004');
  console.log('   Worksheets: ML-2024-00001 to ML-2024-00004');
  console.log('   Invoices: KGC-2024-00001 to KGC-2024-00004');
  console.log('   Sales: ELADAS-2024-0001 to ELADAS-2024-0005');
  console.log('');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
