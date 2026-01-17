/**
 * @kgc/cikk - Product Catalog for KGC ERP
 *
 * Provides:
 * - Item CRUD operations
 * - Auto code generation (PRD/PRT/SVC-YYYYMMDD-XXXX)
 * - EAN-13 barcode validation
 * - Category hierarchy management (Story 8-2)
 * - Tenant-aware item management
 */

// Modules
export { ItemModule, PRISMA_CLIENT, AUDIT_SERVICE } from './item.module';
export type { ItemModuleOptions } from './item.module';
export { CategoryModule } from './category.module';

// Item Services
export { ItemService } from './services/item.service';
export { ItemCodeGeneratorService } from './services/item-code-generator.service';
export { BarcodeService } from './services/barcode.service';

// QR Code Service (Story 8-4)
export { QRCodeService } from './services/qr-code.service';

// Category Services (Story 8-2)
export { CategoryService } from './services/category.service';
export { HierarchyValidationService } from './services/hierarchy-validation.service';
export { CategoryStatsService } from './services/category-stats.service';

// Controllers
export { ItemController } from './item.controller';
export { CategoryController } from './category.controller';

// Item Interfaces & Types
export { ItemType, ItemStatus } from './interfaces/item.interface';
export type {
  Item,
  CreateItemInput,
  UpdateItemInput,
  ItemFilterOptions,
  ItemListMeta,
  ItemListResponse,
} from './interfaces/item.interface';
export {
  ITEM_CODE_PREFIX,
  DEFAULT_VAT_RATE,
  DEFAULT_UNIT_OF_MEASURE,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from './interfaces/item.interface';

// Category Interfaces & Types (Story 8-2)
export { CategoryStatus, MAX_CATEGORY_DEPTH, ROOT_PATH } from './interfaces/category.interface';
export type {
  Category,
  CategoryWithStats,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFilterOptions,
  CategoryStats,
  HierarchyValidationResult,
} from './interfaces/category.interface';

// Item DTOs
export type { CreateItemDto } from './dto/create-item.dto';
export {
  createItemSchema,
  validateCreateItemDto,
  safeValidateCreateItemDto,
} from './dto/create-item.dto';

export type { UpdateItemDto } from './dto/update-item.dto';
export {
  updateItemSchema,
  validateUpdateItemDto,
  safeValidateUpdateItemDto,
} from './dto/update-item.dto';

export type { ItemFilterDto } from './dto/item-filter.dto';
export {
  itemFilterSchema,
  validateItemFilterDto,
  safeValidateItemFilterDto,
  parseItemFilterFromQuery,
} from './dto/item-filter.dto';

// Category DTOs (Story 8-2)
export type { CreateCategoryDto } from './dto/create-category.dto';
export {
  createCategorySchema,
  validateCreateCategoryDto,
  safeValidateCreateCategoryDto,
  formatCategoryValidationErrors,
} from './dto/create-category.dto';

export type { UpdateCategoryDto } from './dto/update-category.dto';
export {
  updateCategorySchema,
  validateUpdateCategoryDto,
  safeValidateUpdateCategoryDto,
} from './dto/update-category.dto';

export type { CategoryFilterDto } from './dto/category-filter.dto';
export {
  categoryFilterSchema,
  validateCategoryFilterDto,
  safeValidateCategoryFilterDto,
  parseCategoryFilterFromQuery,
} from './dto/category-filter.dto';

// ============================================
// SUPPLIER (Story 8-3)
// ============================================

// Supplier Module
export { SupplierModule, PRISMA_SERVICE, AUDIT_LOGGER } from './supplier.module';
export type { SupplierModuleOptions } from './supplier.module';

// Supplier Services
export { SupplierService } from './services/supplier.service';
export { SupplierItemService } from './services/supplier-item.service';
export { PriceHistoryService } from './services/price-history.service';
export { CsvImportService } from './services/csv-import.service';

// Supplier Controller
export { SupplierController } from './supplier.controller';

// Supplier Interfaces & Types
export {
  SupplierStatus,
  PriceChangeSource,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
} from './interfaces/supplier.interface';
export type {
  Supplier,
  SupplierItem,
  SupplierItemWithRelations,
  PriceHistory,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierFilterOptions,
  SupplierListMeta,
  SupplierListResponse,
  LinkItemToSupplierInput,
  UpdateSupplierItemInput,
  CsvImportOptions,
  CsvImportRow,
  CsvRowValidationResult,
  CsvImportResult,
  SupportedCurrency,
} from './interfaces/supplier.interface';

// Supplier DTOs
export type { CreateSupplierDto } from './dto/create-supplier.dto';
export {
  createSupplierSchema,
  validateCreateSupplierDto,
  parseCreateSupplierDto,
} from './dto/create-supplier.dto';

export type { UpdateSupplierDto } from './dto/update-supplier.dto';
export {
  updateSupplierSchema,
  validateUpdateSupplierDto,
  parseUpdateSupplierDto,
} from './dto/update-supplier.dto';

export type { LinkItemToSupplierDto, UpdateSupplierItemDto } from './dto/supplier-item.dto';
export {
  linkItemToSupplierSchema,
  updateSupplierItemSchema,
  validateLinkItemToSupplierDto,
  parseLinkItemToSupplierDto,
  validateUpdateSupplierItemDto,
  parseUpdateSupplierItemDto,
} from './dto/supplier-item.dto';

// ============================================
// BARCODE & QR CODE (Story 8-4)
// ============================================

// Barcode Interfaces & Types
export {
  BarcodeType,
  QRDataType,
  QRErrorCorrectionLevel,
  DEFAULT_BARCODE_OPTIONS,
  DEFAULT_QR_OPTIONS,
  BARCODE_PREFIX_ROUTING,
  BARCODE_PATTERNS,
} from './interfaces/barcode.interface';
export type {
  BarcodeGenerationOptions,
  QRCodeGenerationOptions,
  ItemQRData,
  LocationQRData,
  ScanLookupResult,
  BarcodeImageResult,
} from './interfaces/barcode.interface';

// ============================================
// PRICE RULE (Story 8-5)
// ADR-012: Kombinált hierarchikus árazási rendszer
// ============================================

// Price Rule Service
export { PriceRuleService } from './services/price-rule.service';

// Price Rule Interfaces & Types
export {
  PriceRuleType,
  PriceCalculationType,
  PriceRuleStatus,
  DEFAULT_PRIORITY,
  PRICE_RULE_VALIDATION,
} from './interfaces/price-rule.interface';
export type {
  PriceRule,
  PriceRuleBase,
  PromotionPriceRule,
  PartnerPriceRule,
  ItemPriceRule,
  SupplierPriceRule,
  CategoryPriceRule,
  CreatePriceRuleInput,
  UpdatePriceRuleInput,
  PriceCalculationContext,
  PriceCalculationResult,
  AppliedRule,
  PriceRuleFilterOptions,
  PriceRuleListResponse,
} from './interfaces/price-rule.interface';
