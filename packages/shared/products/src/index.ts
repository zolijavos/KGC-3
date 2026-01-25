/**
 * @kgc/products - Product Management Package
 * Epic 8: Product Management
 *
 * Provides product, category, supplier, and price rule management
 * with multi-tenant support for the KGC ERP system.
 */

// ============================================
// TYPES
// ============================================

export * from './types/product.types';

// ============================================
// DTOs
// ============================================

export * from './dto/category.dto';
export * from './dto/price-rule.dto';
export * from './dto/product.dto';
export * from './dto/supplier.dto';

// ============================================
// REPOSITORIES
// ============================================

export {
  InMemoryProductRepository,
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from './repositories/product.repository';

export {
  CATEGORY_REPOSITORY,
  InMemoryCategoryRepository,
  type ICategoryRepository,
} from './repositories/category.repository';

export {
  InMemorySupplierRepository,
  SUPPLIER_REPOSITORY,
  type ISupplierRepository,
} from './repositories/supplier.repository';

export {
  InMemoryPriceRuleRepository,
  PRICE_RULE_REPOSITORY,
  type IPriceRuleRepository,
} from './repositories/price-rule.repository';
