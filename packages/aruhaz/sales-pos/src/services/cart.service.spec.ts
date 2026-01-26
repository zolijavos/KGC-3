import { beforeEach, describe, expect, it } from 'vitest';
import { CartItemDto } from '../dto/cart.dto.js';
import { CartService } from './cart.service.js';

describe('CartService', () => {
  let service: CartService;

  const mockProductId = '00000000-0000-0000-0000-000000000001';
  const mockWarehouseId = '00000000-0000-0000-0000-000000000002';

  const validCartItem: CartItemDto = {
    productId: mockProductId,
    productCode: 'MAK-001',
    productName: 'Akkumulátor 18V',
    quantity: 2,
    unitPrice: 10000,
    taxRate: 27,
    discountPercent: 0,
    warehouseId: mockWarehouseId,
  };

  beforeEach(() => {
    service = new CartService();
  });

  describe('Line calculation (TDD)', () => {
    describe('lineSubtotal calculation', () => {
      it('should calculate lineSubtotal = quantity * unitPrice', () => {
        const item = service.addItem(validCartItem);

        // 2 * 10000 = 20000
        expect(item.lineSubtotal).toBe(20000);
      });

      it('should calculate lineSubtotal with decimal quantity', () => {
        const item = service.addItem({
          ...validCartItem,
          quantity: 1.5,
          unitPrice: 1000,
        });

        // 1.5 * 1000 = 1500
        expect(item.lineSubtotal).toBe(1500);
      });

      it('should apply discount to lineSubtotal', () => {
        const item = service.addItem({
          ...validCartItem,
          quantity: 2,
          unitPrice: 10000,
          discountPercent: 10,
        });

        // 2 * 10000 = 20000, then 10% discount = 18000
        expect(item.lineSubtotal).toBe(18000);
      });
    });

    describe('lineTax calculation (VAT)', () => {
      it('should calculate 27% VAT correctly', () => {
        const item = service.addItem({
          ...validCartItem,
          quantity: 1,
          unitPrice: 10000,
          taxRate: 27,
          discountPercent: 0,
        });

        // subtotal = 10000, tax = 10000 * 0.27 = 2700
        expect(item.lineTax).toBe(2700);
      });

      it('should calculate 18% VAT correctly', () => {
        const item = service.addItem({
          ...validCartItem,
          taxRate: 18,
          quantity: 1,
          unitPrice: 10000,
        });

        // subtotal = 10000, tax = 10000 * 0.18 = 1800
        expect(item.lineTax).toBe(1800);
      });

      it('should calculate 5% VAT correctly', () => {
        const item = service.addItem({
          ...validCartItem,
          taxRate: 5,
          quantity: 1,
          unitPrice: 10000,
        });

        // subtotal = 10000, tax = 10000 * 0.05 = 500
        expect(item.lineTax).toBe(500);
      });

      it('should handle 0% VAT (exempt)', () => {
        const item = service.addItem({
          ...validCartItem,
          taxRate: 0,
          quantity: 1,
          unitPrice: 10000,
        });

        expect(item.lineTax).toBe(0);
      });

      it('should calculate tax on discounted amount', () => {
        const item = service.addItem({
          ...validCartItem,
          quantity: 1,
          unitPrice: 10000,
          taxRate: 27,
          discountPercent: 10,
        });

        // subtotal after 10% discount = 9000, tax = 9000 * 0.27 = 2430
        expect(item.lineSubtotal).toBe(9000);
        expect(item.lineTax).toBe(2430);
      });
    });

    describe('lineTotal calculation', () => {
      it('should calculate lineTotal = lineSubtotal + lineTax', () => {
        const item = service.addItem({
          ...validCartItem,
          quantity: 1,
          unitPrice: 10000,
          taxRate: 27,
          discountPercent: 0,
        });

        // subtotal = 10000, tax = 2700, total = 12700
        expect(item.lineTotal).toBe(12700);
      });

      it('should round lineTotal to integer (HUF)', () => {
        const item = service.addItem({
          ...validCartItem,
          quantity: 3,
          unitPrice: 333,
          taxRate: 27,
          discountPercent: 0,
        });

        // subtotal = 999, tax = 999 * 0.27 = 269.73
        // lineTotal should be rounded: 999 + 270 = 1269 (or similar)
        expect(Number.isInteger(item.lineTotal)).toBe(true);
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple items with mixed VAT rates', () => {
        service.addItem({
          ...validCartItem,
          productId: '00000000-0000-0000-0000-000000000010',
          productCode: 'ITEM-1',
          taxRate: 27,
          quantity: 1,
          unitPrice: 1000,
        });

        service.addItem({
          ...validCartItem,
          productId: '00000000-0000-0000-0000-000000000011',
          productCode: 'ITEM-2',
          taxRate: 5,
          quantity: 1,
          unitPrice: 1000,
        });

        const totals = service.getTotals();

        // Item 1: 1000 + 270 = 1270
        // Item 2: 1000 + 50 = 1050
        // Total: 2320
        expect(totals.subtotal).toBe(2000);
        expect(totals.taxAmount).toBe(320); // 270 + 50
        expect(totals.total).toBe(2320);
        expect(totals.itemCount).toBe(2);
      });
    });
  });

  describe('addItem()', () => {
    it('should add item to cart', () => {
      const item = service.addItem(validCartItem);

      expect(item.productId).toBe(mockProductId);
      expect(item.productCode).toBe('MAK-001');
      expect(item.quantity).toBe(2);
      expect(item.id).toBeDefined();
    });

    it('should generate unique id for each item', () => {
      const item1 = service.addItem(validCartItem);
      const item2 = service.addItem({ ...validCartItem, productCode: 'MAK-002' });

      expect(item1.id).not.toBe(item2.id);
    });

    it('should throw error on invalid tax rate', () => {
      expect(() =>
        service.addItem({
          ...validCartItem,
          taxRate: 30, // Invalid rate
        })
      ).toThrow('Tax rate must be one of');
    });
  });

  describe('updateQuantity()', () => {
    it('should update item quantity', () => {
      const item = service.addItem(validCartItem);
      const updated = service.updateQuantity(item.id, 5);

      expect(updated.quantity).toBe(5);
      // Recalculate totals: 5 * 10000 = 50000
      expect(updated.lineSubtotal).toBe(50000);
    });

    it('should throw error for non-existent item', () => {
      expect(() => service.updateQuantity('non-existent-id', 5)).toThrow('Item not found');
    });
  });

  describe('removeItem()', () => {
    it('should remove item from cart', () => {
      const item = service.addItem(validCartItem);
      service.removeItem(item.id);

      const items = service.getItems();
      expect(items).toHaveLength(0);
    });

    it('should throw error for non-existent item', () => {
      expect(() => service.removeItem('non-existent-id')).toThrow('Item not found');
    });
  });

  describe('clearCart()', () => {
    it('should remove all items', () => {
      service.addItem(validCartItem);
      service.addItem({ ...validCartItem, productCode: 'MAK-002' });
      service.clearCart();

      expect(service.getItems()).toHaveLength(0);
      expect(service.getTotals().total).toBe(0);
    });
  });

  describe('getTotals()', () => {
    it('should return zero totals for empty cart', () => {
      const totals = service.getTotals();

      expect(totals.subtotal).toBe(0);
      expect(totals.taxAmount).toBe(0);
      expect(totals.discountAmount).toBe(0);
      expect(totals.total).toBe(0);
      expect(totals.itemCount).toBe(0);
    });

    it('should calculate discountAmount correctly', () => {
      service.addItem({
        ...validCartItem,
        quantity: 1,
        unitPrice: 10000,
        discountPercent: 20,
      });

      const totals = service.getTotals();

      // Original would be 10000, with 20% discount = 8000
      // Discount amount = 2000
      expect(totals.discountAmount).toBe(2000);
    });
  });

  describe('getItems()', () => {
    it('should return all items', () => {
      service.addItem(validCartItem);
      service.addItem({ ...validCartItem, productCode: 'MAK-002' });

      const items = service.getItems();
      expect(items).toHaveLength(2);
    });
  });
});
