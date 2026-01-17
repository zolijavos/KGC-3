/**
 * @kgc/inventory - AlertService TDD Tests
 * Story 9-6: Minimum stock alert
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertService } from './alert.service';
import {
  StockLevelSetting,
  StockAlert,
  AlertSummary,
  IAlertRepository,
} from '../interfaces/alert.interface';
import {
  CreateStockLevelSettingInput,
  SnoozeAlertInput,
} from '../dto/alert.dto';

// ============================================
// TEST DATA - Valid UUIDs
// ============================================

const TEST_IDS = {
  SETTING_1: '11111111-1111-1111-1111-111111111111',
  SETTING_2: '22222222-2222-2222-2222-222222222222',
  ALERT_1: '33333333-3333-3333-3333-333333333333',
  ALERT_2: '44444444-4444-4444-4444-444444444444',
  TENANT: '55555555-5555-5555-5555-555555555555',
  PRODUCT_1: '66666666-6666-6666-6666-666666666666',
  PRODUCT_2: '77777777-7777-7777-7777-777777777777',
  WAREHOUSE: '88888888-8888-8888-8888-888888888888',
  USER: '99999999-9999-9999-9999-999999999999',
};

// ============================================
// MOCK REPOSITORY
// ============================================

const createMockRepository = (): IAlertRepository => ({
  // Stock Level Settings
  createStockLevelSetting: vi.fn(),
  findStockLevelSettingById: vi.fn(),
  findStockLevelSettingByProduct: vi.fn(),
  queryStockLevelSettings: vi.fn(),
  updateStockLevelSetting: vi.fn(),
  deleteStockLevelSetting: vi.fn(),

  // Alerts
  createAlert: vi.fn(),
  findAlertById: vi.fn(),
  findActiveAlertForProduct: vi.fn(),
  queryAlerts: vi.fn(),
  updateAlert: vi.fn(),
  getAlertSummary: vi.fn(),
  resolveAlertsByProduct: vi.fn(),
});

// ============================================
// TEST DATA FACTORIES
// ============================================

const createTestSetting = (
  overrides: Partial<StockLevelSetting> = {},
): StockLevelSetting => ({
  id: TEST_IDS.SETTING_1,
  tenantId: TEST_IDS.TENANT,
  productId: TEST_IDS.PRODUCT_1,
  warehouseId: TEST_IDS.WAREHOUSE,
  minimumLevel: 10,
  reorderPoint: 20,
  reorderQuantity: 50,
  maximumLevel: 100,
  unit: 'db',
  leadTimeDays: 5,
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

const createTestAlert = (overrides: Partial<StockAlert> = {}): StockAlert => ({
  id: TEST_IDS.ALERT_1,
  tenantId: TEST_IDS.TENANT,
  productId: TEST_IDS.PRODUCT_1,
  warehouseId: TEST_IDS.WAREHOUSE,
  productName: 'Test Product',
  warehouseName: 'Fő raktár',
  type: 'LOW_STOCK',
  priority: 'HIGH',
  status: 'ACTIVE',
  currentQuantity: 5,
  minimumLevel: 10,
  deficit: 5,
  unit: 'db',
  message: 'Alacsony készletszint',
  createdAt: new Date(),
  ...overrides,
});

// ============================================
// TEST SUITE
// ============================================

describe('AlertService', () => {
  let service: AlertService;
  let mockRepository: IAlertRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new AlertService(mockRepository);
  });

  // ============================================
  // STOCK LEVEL SETTING TESTS
  // ============================================

  describe('Stock Level Settings', () => {
    describe('createStockLevelSetting', () => {
      const validInput: CreateStockLevelSettingInput = {
        productId: TEST_IDS.PRODUCT_1,
        warehouseId: TEST_IDS.WAREHOUSE,
        minimumLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        unit: 'db',
        isActive: true,
      };

      it('készlet szint beállítás létrehozása sikeres', async () => {
        const expectedSetting = createTestSetting();
        vi.mocked(mockRepository.findStockLevelSettingByProduct).mockResolvedValue(null);
        vi.mocked(mockRepository.createStockLevelSetting).mockResolvedValue(expectedSetting);

        const result = await service.createStockLevelSetting(TEST_IDS.TENANT, validInput);

        expect(result).toEqual(expectedSetting);
        expect(mockRepository.createStockLevelSetting).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: TEST_IDS.TENANT,
            productId: TEST_IDS.PRODUCT_1,
            minimumLevel: 10,
            reorderPoint: 20,
          }),
        );
      });

      it('duplikált beállítás esetén hiba', async () => {
        vi.mocked(mockRepository.findStockLevelSettingByProduct).mockResolvedValue(
          createTestSetting(),
        );

        await expect(
          service.createStockLevelSetting(TEST_IDS.TENANT, validInput),
        ).rejects.toThrow('A termékhez már létezik készletszint beállítás');
      });

      it('reorderPoint < minimumLevel esetén hiba', async () => {
        const invalidInput = {
          ...validInput,
          minimumLevel: 30,
          reorderPoint: 20,
        };

        await expect(
          service.createStockLevelSetting(TEST_IDS.TENANT, invalidInput as CreateStockLevelSettingInput),
        ).rejects.toThrow();
      });

      it('maximumLevel beállítással létrehozás', async () => {
        const inputWithMax: CreateStockLevelSettingInput = {
          ...validInput,
          maximumLevel: 100,
        };
        vi.mocked(mockRepository.findStockLevelSettingByProduct).mockResolvedValue(null);
        vi.mocked(mockRepository.createStockLevelSetting).mockResolvedValue(
          createTestSetting({ maximumLevel: 100 }),
        );

        const result = await service.createStockLevelSetting(TEST_IDS.TENANT, inputWithMax);

        expect(result.maximumLevel).toBe(100);
      });

      it('raktár nélküli globális beállítás', async () => {
        const globalInput: CreateStockLevelSettingInput = {
          productId: TEST_IDS.PRODUCT_1,
          minimumLevel: 10,
          reorderPoint: 20,
          reorderQuantity: 50,
          unit: 'db',
        };
        vi.mocked(mockRepository.findStockLevelSettingByProduct).mockResolvedValue(null);
        vi.mocked(mockRepository.createStockLevelSetting).mockResolvedValue(
          createTestSetting({ warehouseId: undefined }),
        );

        const result = await service.createStockLevelSetting(TEST_IDS.TENANT, globalInput);

        expect(result.warehouseId).toBeUndefined();
      });
    });

    describe('updateStockLevelSetting', () => {
      it('minimum szint frissítése', async () => {
        const existingSetting = createTestSetting();
        const updatedSetting = createTestSetting({ minimumLevel: 15 });
        vi.mocked(mockRepository.findStockLevelSettingById).mockResolvedValue(existingSetting);
        vi.mocked(mockRepository.updateStockLevelSetting).mockResolvedValue(updatedSetting);

        const result = await service.updateStockLevelSetting(
          TEST_IDS.SETTING_1,
          TEST_IDS.TENANT,
          { minimumLevel: 15 },
        );

        expect(result.minimumLevel).toBe(15);
      });

      it('nem létező beállítás frissítése hiba', async () => {
        vi.mocked(mockRepository.findStockLevelSettingById).mockResolvedValue(null);

        await expect(
          service.updateStockLevelSetting(
            TEST_IDS.SETTING_1,
            TEST_IDS.TENANT,
            { minimumLevel: 15 },
          ),
        ).rejects.toThrow('Készletszint beállítás nem található');
      });

      it('beállítás inaktiválása', async () => {
        const existingSetting = createTestSetting();
        const updatedSetting = createTestSetting({ isActive: false });
        vi.mocked(mockRepository.findStockLevelSettingById).mockResolvedValue(existingSetting);
        vi.mocked(mockRepository.updateStockLevelSetting).mockResolvedValue(updatedSetting);

        const result = await service.updateStockLevelSetting(
          TEST_IDS.SETTING_1,
          TEST_IDS.TENANT,
          { isActive: false },
        );

        expect(result.isActive).toBe(false);
      });
    });

    describe('deleteStockLevelSetting', () => {
      it('beállítás törlése sikeres', async () => {
        const existingSetting = createTestSetting();
        vi.mocked(mockRepository.findStockLevelSettingById).mockResolvedValue(existingSetting);
        vi.mocked(mockRepository.deleteStockLevelSetting).mockResolvedValue(undefined);

        await expect(
          service.deleteStockLevelSetting(TEST_IDS.SETTING_1, TEST_IDS.TENANT),
        ).resolves.not.toThrow();
      });

      it('nem létező beállítás törlése hiba', async () => {
        vi.mocked(mockRepository.findStockLevelSettingById).mockResolvedValue(null);

        await expect(
          service.deleteStockLevelSetting(TEST_IDS.SETTING_1, TEST_IDS.TENANT),
        ).rejects.toThrow('Készletszint beállítás nem található');
      });
    });

    describe('queryStockLevelSettings', () => {
      it('beállítások lekérdezése', async () => {
        const settings = [
          createTestSetting(),
          createTestSetting({ id: TEST_IDS.SETTING_2, productId: TEST_IDS.PRODUCT_2 }),
        ];
        vi.mocked(mockRepository.queryStockLevelSettings).mockResolvedValue({
          items: settings,
          total: 2,
        });

        const result = await service.queryStockLevelSettings({
          tenantId: TEST_IDS.TENANT,
        });

        expect(result.items).toHaveLength(2);
      });
    });
  });

  // ============================================
  // STOCK CHECK TESTS
  // ============================================

  describe('Stock Checking', () => {
    describe('checkStockLevel', () => {
      it('normál készletszint ellenőrzése', () => {
        const setting = createTestSetting({
          minimumLevel: 10,
          reorderPoint: 20,
          maximumLevel: 100,
        });

        const result = service.checkStockLevel(50, setting);

        expect(result.levelStatus).toBe('NORMAL');
        expect(result.alertRequired).toBe(false);
      });

      it('újrarendelési pont alatt', () => {
        const setting = createTestSetting({
          minimumLevel: 10,
          reorderPoint: 20,
        });

        const result = service.checkStockLevel(15, setting);

        expect(result.levelStatus).toBe('BELOW_REORDER');
        expect(result.alertRequired).toBe(true);
        expect(result.suggestedPriority).toBe('MEDIUM');
      });

      it('minimum szint alatt', () => {
        const setting = createTestSetting({
          minimumLevel: 10,
          reorderPoint: 20,
        });

        const result = service.checkStockLevel(5, setting);

        expect(result.levelStatus).toBe('BELOW_MINIMUM');
        expect(result.alertRequired).toBe(true);
        expect(result.suggestedPriority).toBe('HIGH');
      });

      it('nulla készlet', () => {
        const setting = createTestSetting({
          minimumLevel: 10,
          reorderPoint: 20,
        });

        const result = service.checkStockLevel(0, setting);

        expect(result.levelStatus).toBe('OUT_OF_STOCK');
        expect(result.alertRequired).toBe(true);
        expect(result.suggestedPriority).toBe('CRITICAL');
      });

      it('túl magas készlet (overstock)', () => {
        const setting = createTestSetting({
          minimumLevel: 10,
          reorderPoint: 20,
          maximumLevel: 100,
        });

        const result = service.checkStockLevel(150, setting);

        expect(result.levelStatus).toBe('OVERSTOCK');
        expect(result.alertRequired).toBe(true);
        expect(result.suggestedPriority).toBe('LOW');
      });

      it('javasolt rendelési mennyiség számítása', () => {
        const setting = createTestSetting({
          minimumLevel: 10,
          reorderPoint: 20,
          reorderQuantity: 50,
        });

        const result = service.checkStockLevel(5, setting);

        expect(result.suggestedReorderQuantity).toBe(50);
      });
    });

    describe('calculateDeficit', () => {
      it('deficit számítása minimum szint alapján', () => {
        const deficit = service.calculateDeficit(5, 10);
        expect(deficit).toBe(5);
      });

      it('nulla deficit ha a készlet megfelelő', () => {
        const deficit = service.calculateDeficit(15, 10);
        expect(deficit).toBe(0);
      });

      it('nulla készletnél teljes deficit', () => {
        const deficit = service.calculateDeficit(0, 10);
        expect(deficit).toBe(10);
      });
    });
  });

  // ============================================
  // ALERT MANAGEMENT TESTS
  // ============================================

  describe('Alert Management', () => {
    describe('createAlert', () => {
      it('alacsony készlet alert létrehozása', async () => {
        const expectedAlert = createTestAlert();
        vi.mocked(mockRepository.findActiveAlertForProduct).mockResolvedValue(null);
        vi.mocked(mockRepository.createAlert).mockResolvedValue(expectedAlert);

        const result = await service.createLowStockAlert(
          TEST_IDS.TENANT,
          TEST_IDS.PRODUCT_1,
          5, // currentQuantity
          10, // minimumLevel
          'db',
          TEST_IDS.WAREHOUSE,
        );

        expect(result.type).toBe('LOW_STOCK');
        expect(result.status).toBe('ACTIVE');
      });

      it('létező aktív alert esetén nem hoz létre újat, de frissíti ha változott', async () => {
        // A meglévő alert más priority-val (HIGH), de a számított MEDIUM lesz
        const existingAlert = createTestAlert({ priority: 'HIGH' });
        const updatedAlert = createTestAlert({ priority: 'MEDIUM' });
        vi.mocked(mockRepository.findActiveAlertForProduct).mockResolvedValue(existingAlert);
        vi.mocked(mockRepository.updateAlert).mockResolvedValue(updatedAlert);

        const result = await service.createLowStockAlert(
          TEST_IDS.TENANT,
          TEST_IDS.PRODUCT_1,
          5, // currentQuantity
          10, // minimumLevel -> deficit = 5, ratio = 0.5 -> priority = MEDIUM
          'db',
          TEST_IDS.WAREHOUSE,
        );

        // createAlert nem hívódik, de updateAlert igen mert a priority változott
        expect(mockRepository.createAlert).not.toHaveBeenCalled();
        expect(mockRepository.updateAlert).toHaveBeenCalled();
        expect(result.priority).toBe('MEDIUM');
      });

      it('létező aktív alert változatlan marad ha minden egyezik', async () => {
        // A meglévő alert MEDIUM priority-val (számított érték is ez lesz)
        const existingAlert = createTestAlert({
          currentQuantity: 5,
          deficit: 5,
          priority: 'MEDIUM', // ratio = 0.5 -> MEDIUM
        });
        vi.mocked(mockRepository.findActiveAlertForProduct).mockResolvedValue(existingAlert);

        const result = await service.createLowStockAlert(
          TEST_IDS.TENANT,
          TEST_IDS.PRODUCT_1,
          5, // currentQuantity - ugyanaz
          10, // minimumLevel -> deficit = 5 - ugyanaz, priority = MEDIUM - ugyanaz
          'db',
          TEST_IDS.WAREHOUSE,
        );

        // Sem createAlert, sem updateAlert nem hívódik
        expect(mockRepository.createAlert).not.toHaveBeenCalled();
        expect(mockRepository.updateAlert).not.toHaveBeenCalled();
        expect(result).toEqual(existingAlert);
      });

      it('out of stock alert létrehozása', async () => {
        const expectedAlert = createTestAlert({ type: 'OUT_OF_STOCK', priority: 'CRITICAL' });
        vi.mocked(mockRepository.findActiveAlertForProduct).mockResolvedValue(null);
        vi.mocked(mockRepository.createAlert).mockResolvedValue(expectedAlert);

        const result = await service.createOutOfStockAlert(
          TEST_IDS.TENANT,
          TEST_IDS.PRODUCT_1,
          'db',
          TEST_IDS.WAREHOUSE,
        );

        expect(result.type).toBe('OUT_OF_STOCK');
        expect(result.priority).toBe('CRITICAL');
      });
    });

    describe('acknowledgeAlert', () => {
      it('alert tudomásul vétele', async () => {
        const existingAlert = createTestAlert();
        const acknowledgedAlert = createTestAlert({
          status: 'ACKNOWLEDGED',
          acknowledgedBy: TEST_IDS.USER,
          acknowledgedAt: new Date(),
        });
        vi.mocked(mockRepository.findAlertById).mockResolvedValue(existingAlert);
        vi.mocked(mockRepository.updateAlert).mockResolvedValue(acknowledgedAlert);

        const result = await service.acknowledgeAlert(
          TEST_IDS.ALERT_1,
          TEST_IDS.TENANT,
          TEST_IDS.USER,
        );

        expect(result.status).toBe('ACKNOWLEDGED');
        expect(result.acknowledgedBy).toBe(TEST_IDS.USER);
      });

      it('nem létező alert tudomásul vétele hiba', async () => {
        vi.mocked(mockRepository.findAlertById).mockResolvedValue(null);

        await expect(
          service.acknowledgeAlert(TEST_IDS.ALERT_1, TEST_IDS.TENANT, TEST_IDS.USER),
        ).rejects.toThrow('Alert nem található');
      });

      it('már tudomásul vett alert', async () => {
        const acknowledgedAlert = createTestAlert({ status: 'ACKNOWLEDGED' });
        vi.mocked(mockRepository.findAlertById).mockResolvedValue(acknowledgedAlert);

        await expect(
          service.acknowledgeAlert(TEST_IDS.ALERT_1, TEST_IDS.TENANT, TEST_IDS.USER),
        ).rejects.toThrow('Az alert már tudomásul van véve');
      });
    });

    describe('resolveAlert', () => {
      it('alert megoldása', async () => {
        const existingAlert = createTestAlert();
        const resolvedAlert = createTestAlert({
          status: 'RESOLVED',
          resolvedAt: new Date(),
        });
        vi.mocked(mockRepository.findAlertById).mockResolvedValue(existingAlert);
        vi.mocked(mockRepository.updateAlert).mockResolvedValue(resolvedAlert);

        const result = await service.resolveAlert(
          TEST_IDS.ALERT_1,
          TEST_IDS.TENANT,
        );

        expect(result.status).toBe('RESOLVED');
        expect(result.resolvedAt).toBeDefined();
      });

      it('már megoldott alert nem oldható meg újra', async () => {
        const resolvedAlert = createTestAlert({ status: 'RESOLVED' });
        vi.mocked(mockRepository.findAlertById).mockResolvedValue(resolvedAlert);

        await expect(
          service.resolveAlert(TEST_IDS.ALERT_1, TEST_IDS.TENANT),
        ).rejects.toThrow('Az alert már meg van oldva');
      });
    });

    describe('snoozeAlert', () => {
      it('alert elhalasztása', async () => {
        const existingAlert = createTestAlert();
        const snoozeInput: SnoozeAlertInput = { snoozeDays: 7 };
        const snoozedAlert = createTestAlert({
          status: 'SNOOZED',
          snoozedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        vi.mocked(mockRepository.findAlertById).mockResolvedValue(existingAlert);
        vi.mocked(mockRepository.updateAlert).mockResolvedValue(snoozedAlert);

        const result = await service.snoozeAlert(
          TEST_IDS.ALERT_1,
          TEST_IDS.TENANT,
          snoozeInput,
        );

        expect(result.status).toBe('SNOOZED');
        expect(result.snoozedUntil).toBeDefined();
      });

      it('már megoldott alert nem halasztható el', async () => {
        const resolvedAlert = createTestAlert({ status: 'RESOLVED' });
        vi.mocked(mockRepository.findAlertById).mockResolvedValue(resolvedAlert);

        await expect(
          service.snoozeAlert(TEST_IDS.ALERT_1, TEST_IDS.TENANT, { snoozeDays: 7 }),
        ).rejects.toThrow('Megoldott alert nem halasztható el');
      });
    });

    describe('queryAlerts', () => {
      it('alertek lekérdezése szűrőkkel', async () => {
        const alerts = [
          createTestAlert(),
          createTestAlert({ id: TEST_IDS.ALERT_2 }),
        ];
        vi.mocked(mockRepository.queryAlerts).mockResolvedValue({
          alerts,
          total: 2,
          offset: 0,
          limit: 20,
        });

        const result = await service.queryAlerts({
          tenantId: TEST_IDS.TENANT,
          status: 'ACTIVE',
        });

        expect(result.alerts).toHaveLength(2);
      });

      it('prioritás szerinti szűrés', async () => {
        vi.mocked(mockRepository.queryAlerts).mockResolvedValue({
          alerts: [createTestAlert({ priority: 'CRITICAL' })],
          total: 1,
          offset: 0,
          limit: 20,
        });

        await service.queryAlerts({
          tenantId: TEST_IDS.TENANT,
          priority: 'CRITICAL',
        });

        expect(mockRepository.queryAlerts).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'CRITICAL' }),
        );
      });
    });

    describe('getAlertSummary', () => {
      it('alert összesítés lekérdezése', async () => {
        const summary: AlertSummary = {
          totalActive: 10,
          criticalCount: 2,
          highCount: 3,
          mediumCount: 3,
          lowCount: 2,
          byType: {
            LOW_STOCK: 5,
            OUT_OF_STOCK: 2,
            OVERSTOCK: 1,
            EXPIRING_SOON: 1,
            WARRANTY_EXPIRING: 1,
          },
          byWarehouse: [
            { warehouseId: TEST_IDS.WAREHOUSE, warehouseName: 'Fő raktár', count: 10 },
          ],
        };
        vi.mocked(mockRepository.getAlertSummary).mockResolvedValue(summary);

        const result = await service.getAlertSummary(TEST_IDS.TENANT);

        expect(result.totalActive).toBe(10);
        expect(result.criticalCount).toBe(2);
      });
    });

    describe('resolveAlertsByProduct', () => {
      it('termékhez tartozó alertek megoldása', async () => {
        vi.mocked(mockRepository.resolveAlertsByProduct).mockResolvedValue(3);

        const count = await service.resolveAlertsByProduct(
          TEST_IDS.PRODUCT_1,
          TEST_IDS.TENANT,
          TEST_IDS.WAREHOUSE,
        );

        expect(count).toBe(3);
      });
    });
  });

  // ============================================
  // PRIORITY CALCULATION TESTS
  // ============================================

  describe('Priority Calculation', () => {
    describe('calculateAlertPriority', () => {
      it('OUT_OF_STOCK mindig CRITICAL', () => {
        const priority = service.calculateAlertPriority('OUT_OF_STOCK', 0, 10);
        expect(priority).toBe('CRITICAL');
      });

      it('50% alatt HIGH prioritás', () => {
        const priority = service.calculateAlertPriority('LOW_STOCK', 4, 10);
        expect(priority).toBe('HIGH');
      });

      it('50-80% között MEDIUM prioritás', () => {
        const priority = service.calculateAlertPriority('LOW_STOCK', 6, 10);
        expect(priority).toBe('MEDIUM');
      });

      it('80% felett LOW prioritás', () => {
        const priority = service.calculateAlertPriority('LOW_STOCK', 9, 10);
        expect(priority).toBe('LOW');
      });

      it('OVERSTOCK mindig LOW', () => {
        const priority = service.calculateAlertPriority('OVERSTOCK', 150, 100);
        expect(priority).toBe('LOW');
      });
    });
  });

  // ============================================
  // MESSAGE GENERATION TESTS
  // ============================================

  describe('Message Generation', () => {
    describe('generateAlertMessage', () => {
      it('LOW_STOCK üzenet', () => {
        const message = service.generateAlertMessage('LOW_STOCK', 5, 10);
        expect(message).toContain('Alacsony készletszint');
        expect(message).toContain('5');
        expect(message).toContain('10');
      });

      it('OUT_OF_STOCK üzenet', () => {
        const message = service.generateAlertMessage('OUT_OF_STOCK', 0, 10);
        expect(message).toContain('Készlet kifogyott');
      });

      it('OVERSTOCK üzenet', () => {
        const message = service.generateAlertMessage('OVERSTOCK', 150, 100);
        expect(message).toContain('Túl magas készletszint');
      });
    });
  });
});
