/**
 * Invoice RBAC Service
 * Story 10-6: Számla Láthatóság RBAC
 * @package @kgc/sales-invoice
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import type { IInvoice } from '../interfaces/invoice.interface';
import type { InvoiceStatus } from './invoice-status';

// Admin szerepkörök - mindenhez hozzáférnek
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

// Kiállításhoz szükséges szerepkörök
const ISSUE_ROLES = ['FINANCE', 'ADMIN', 'SUPER_ADMIN'];

// Sztornózáshoz szükséges szerepkörök
const CANCEL_ROLES = ['FINANCE', 'ADMIN', 'SUPER_ADMIN'];

// Fizetés rögzítéséhez szükséges szerepkörök
const PAYMENT_ROLES = ['FINANCE', 'ADMIN', 'SUPER_ADMIN', 'CASHIER'];

// Fizetés rögzítéshez érvényes státuszok
const PAYMENT_VALID_STATUSES: InvoiceStatus[] = ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'];

// Sztornózáshoz érvényes státuszok
const CANCEL_VALID_STATUSES: InvoiceStatus[] = ['ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE'];

/**
 * Invoice RBAC Service
 * Kezeli a számla láthatóságát és műveleti jogosultságait
 */
@Injectable()
export class InvoiceRbacService {
  /**
   * Ellenőrzi, hogy a felhasználó megtekintheti-e a számlát
   */
  canView(invoice: IInvoice, userRoles: string[]): boolean {
    // Nem confidential számla mindenki számára látható
    if (!invoice.isConfidential) {
      return true;
    }

    // Admin mindig látja
    if (this.hasAdminRole(userRoles)) {
      return true;
    }

    // Confidential számla csak a megadott szerepkörök számára látható
    return this.hasAnyRole(userRoles, invoice.visibleToRoles);
  }

  /**
   * Ellenőrzi, hogy a felhasználó szerkesztheti-e a számlát
   */
  canEdit(invoice: IInvoice, userRoles: string[]): boolean {
    // Csak DRAFT státuszban szerkeszthető
    if (invoice.status !== 'DRAFT') {
      return false;
    }

    // Szerkesztéshez megtekintési jog kell
    return this.canView(invoice, userRoles);
  }

  /**
   * Ellenőrzi, hogy a felhasználó törölheti-e a számlát
   */
  canDelete(invoice: IInvoice, userRoles: string[]): boolean {
    // Csak DRAFT státuszban törölhető
    if (invoice.status !== 'DRAFT') {
      return false;
    }

    // Törléshez megtekintési jog kell
    return this.canView(invoice, userRoles);
  }

  /**
   * Ellenőrzi, hogy a felhasználó kiállíthatja-e a számlát
   */
  canIssue(invoice: IInvoice, userRoles: string[]): boolean {
    // Csak DRAFT státuszban állítható ki
    if (invoice.status !== 'DRAFT') {
      return false;
    }

    // Kiállításhoz FINANCE vagy ADMIN szerepkör kell
    return this.hasAnyRole(userRoles, ISSUE_ROLES);
  }

  /**
   * Ellenőrzi, hogy a felhasználó sztornózhatja-e a számlát
   */
  canCancel(invoice: IInvoice, userRoles: string[]): boolean {
    // Csak bizonyos státuszokban sztornózható
    if (!CANCEL_VALID_STATUSES.includes(invoice.status)) {
      return false;
    }

    // Sztornózáshoz FINANCE vagy ADMIN szerepkör kell
    return this.hasAnyRole(userRoles, CANCEL_ROLES);
  }

  /**
   * Ellenőrzi, hogy a felhasználó rögzíthet-e fizetést
   */
  canRecordPayment(invoice: IInvoice, userRoles: string[]): boolean {
    // Csak bizonyos státuszokban rögzíthető fizetés
    if (!PAYMENT_VALID_STATUSES.includes(invoice.status)) {
      return false;
    }

    // Fizetés rögzítéséhez FINANCE, CASHIER vagy ADMIN szerepkör kell
    return this.hasAnyRole(userRoles, PAYMENT_ROLES);
  }

  /**
   * Szűri a számlákat a felhasználó jogosultságai alapján
   */
  filterByVisibility(invoices: IInvoice[], userRoles: string[]): IInvoice[] {
    return invoices.filter((invoice) => this.canView(invoice, userRoles));
  }

  /**
   * Kivételt dob, ha a felhasználó nem tekintheti meg a számlát
   */
  assertCanView(invoice: IInvoice, userRoles: string[]): void {
    if (!this.canView(invoice, userRoles)) {
      throw new ForbiddenException('You do not have permission to view this invoice');
    }
  }

  /**
   * Kivételt dob, ha a felhasználó nem szerkesztheti a számlát
   */
  assertCanEdit(invoice: IInvoice, userRoles: string[]): void {
    if (!this.canEdit(invoice, userRoles)) {
      throw new ForbiddenException('You do not have permission to edit this invoice');
    }
  }

  /**
   * Kivételt dob, ha a felhasználó nem törölheti a számlát
   */
  assertCanDelete(invoice: IInvoice, userRoles: string[]): void {
    if (!this.canDelete(invoice, userRoles)) {
      throw new ForbiddenException('You do not have permission to delete this invoice');
    }
  }

  /**
   * Kivételt dob, ha a felhasználó nem állíthatja ki a számlát
   */
  assertCanIssue(invoice: IInvoice, userRoles: string[]): void {
    if (!this.canIssue(invoice, userRoles)) {
      throw new ForbiddenException('You do not have permission to issue this invoice');
    }
  }

  /**
   * Kivételt dob, ha a felhasználó nem sztornózhatja a számlát
   */
  assertCanCancel(invoice: IInvoice, userRoles: string[]): void {
    if (!this.canCancel(invoice, userRoles)) {
      throw new ForbiddenException('You do not have permission to cancel this invoice');
    }
  }

  /**
   * Kivételt dob, ha a felhasználó nem rögzíthet fizetést
   */
  assertCanRecordPayment(invoice: IInvoice, userRoles: string[]): void {
    if (!this.canRecordPayment(invoice, userRoles)) {
      throw new ForbiddenException('You do not have permission to record payment for this invoice');
    }
  }

  // Private helpers

  private hasAdminRole(userRoles: string[]): boolean {
    return userRoles.some((role) => ADMIN_ROLES.includes(role));
  }

  private hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
    return userRoles.some((role) => requiredRoles.includes(role));
  }
}
