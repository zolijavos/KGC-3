/**
 * @kgc/sales-pos - CartService
 * Epic 22: Story 22-1 - Cart Management with VAT Calculation
 *
 * Hungarian VAT rates (2024):
 * - Standard: 27%
 * - Reduced: 18%
 * - Lower: 5%
 * - Exempt: 0%
 *
 * NOTE: This service manages in-memory cart state. For production use:
 * - Use Scope.REQUEST in NestJS module, OR
 * - Use createCart(sessionId) pattern for session-scoped carts
 *
 * For persistent carts, use TransactionService which stores items in the database.
 */

import { Injectable, Scope } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CartItemDto,
  CartItemSchema,
  ICartItem,
  ICartTotals,
  TaxRate,
  VALID_TAX_RATES,
} from '../dto/cart.dto.js';

@Injectable({ scope: Scope.REQUEST })
export class CartService {
  private items: Map<string, ICartItem> = new Map();

  /**
   * Add item to cart with line calculations
   */
  addItem(input: CartItemDto): ICartItem {
    // Validate input
    const validationResult = CartItemSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Validate tax rate is one of the valid Hungarian VAT rates
    if (!VALID_TAX_RATES.includes(validInput.taxRate as TaxRate)) {
      throw new Error(`Tax rate must be one of: ${VALID_TAX_RATES.join(', ')}`);
    }

    const id = this.generateId();
    const itemInput: {
      id: string;
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discountPercent: number;
      warehouseId?: string;
    } = {
      id,
      productId: validInput.productId,
      productCode: validInput.productCode,
      productName: validInput.productName,
      quantity: validInput.quantity,
      unitPrice: validInput.unitPrice,
      taxRate: validInput.taxRate,
      discountPercent: validInput.discountPercent,
    };
    if (validInput.warehouseId !== undefined) {
      itemInput.warehouseId = validInput.warehouseId;
    }

    const calculatedItem = this.calculateLineItem(itemInput);

    this.items.set(id, calculatedItem);
    return calculatedItem;
  }

  /**
   * Update item quantity
   */
  updateQuantity(itemId: string, quantity: number): ICartItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const updatedItem = this.calculateLineItem({
      ...item,
      quantity,
    });

    this.items.set(itemId, updatedItem);
    return updatedItem;
  }

  /**
   * Update item discount
   */
  updateDiscount(itemId: string, discountPercent: number): ICartItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const updatedItem = this.calculateLineItem({
      ...item,
      discountPercent,
    });

    this.items.set(itemId, updatedItem);
    return updatedItem;
  }

  /**
   * Remove item from cart
   */
  removeItem(itemId: string): void {
    if (!this.items.has(itemId)) {
      throw new Error('Item not found');
    }
    this.items.delete(itemId);
  }

  /**
   * Clear all items from cart
   */
  clearCart(): void {
    this.items.clear();
  }

  /**
   * Get all cart items
   */
  getItems(): ICartItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get cart totals
   */
  getTotals(): ICartTotals {
    const items = this.getItems();

    if (items.length === 0) {
      return {
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        itemCount: 0,
      };
    }

    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    for (const item of items) {
      subtotal += item.lineSubtotal;
      taxAmount += item.lineTax;

      // Calculate original price without discount
      const originalPrice = item.quantity * item.unitPrice;
      discountAmount += originalPrice - item.lineSubtotal;
    }

    return {
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(taxAmount),
      discountAmount: Math.round(discountAmount),
      total: Math.round(subtotal + taxAmount),
      itemCount: items.length,
    };
  }

  /**
   * Calculate line item totals
   * Formula:
   * - lineSubtotal = quantity * unitPrice * (1 - discountPercent/100)
   * - lineTax = lineSubtotal * (taxRate/100)
   * - lineTotal = lineSubtotal + lineTax (rounded to HUF)
   */
  private calculateLineItem(input: {
    id: string;
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountPercent: number;
    warehouseId?: string;
  }): ICartItem {
    const grossAmount = input.quantity * input.unitPrice;
    const discountMultiplier = 1 - input.discountPercent / 100;
    const lineSubtotal = grossAmount * discountMultiplier;
    const lineTax = lineSubtotal * (input.taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    const result: ICartItem = {
      id: input.id,
      productId: input.productId,
      productCode: input.productCode,
      productName: input.productName,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      taxRate: input.taxRate,
      discountPercent: input.discountPercent,
      lineSubtotal: Math.round(lineSubtotal),
      lineTax: Math.round(lineTax),
      lineTotal: Math.round(lineTotal),
    };

    if (input.warehouseId !== undefined) {
      result.warehouseId = input.warehouseId;
    }

    return result;
  }

  /**
   * Generate unique item ID using crypto.randomUUID for collision safety
   */
  private generateId(): string {
    return `cart-${randomUUID()}`;
  }
}
