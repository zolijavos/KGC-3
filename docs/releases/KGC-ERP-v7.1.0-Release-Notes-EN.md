# KGC ERP v7.1.0 - Release Notes

**Release Date:** January 29, 2026
**First Public Release**

---

## Welcome to KGC ERP!

KGC ERP is a comprehensive enterprise resource planning system for retail and rental services, with franchise network support.

---

## Key Features

### Rental Module

- **Equipment Management** - Inventory tracking, condition monitoring
- **Rental Contracts** - Short and long-term rentals
- **Deposit Handling** - MyPOS integrated card payments
- **Returns** - Condition assessment, damage documentation

### Point of Sale (POS)

- **Cash Register** - Quick sales, barcode scanning
- **Inventory Management** - Real-time stock levels
- **Pricing** - Promotions, discounts management

### Service Module

- **Worksheet Management** - Repair process tracking
- **Warranty Repairs** - Makita standard billing
- **Parts Management** - Ordering, stock monitoring

### NAV Online Invoicing

- **Automatic Submission** - Számlázz.hu API integration
- **Status Tracking** - Successful/failed submissions
- **Document Types** - Invoice, proforma, correction

### Customer Management (CRM)

- **Twenty CRM Integration** - Customer relationship management
- **Partner Registry** - Individual, company data
- **Credit Limits** - Corporate customer limits

### Customer Support

- **Chatwoot Integration** - Multi-channel support
- **Ticket Management** - Issue tracking

### HR Module

- **Horilla HR Integration** - Employee data management
- **Time Tracking** - Attendance records

---

## Technical Specifications

| Feature             | Description                     |
| ------------------- | ------------------------------- |
| **Offline Mode**    | PWA - works without internet    |
| **Multi-language**  | Hungarian, English interface    |
| **Multi-tenant**    | Franchise location isolation    |
| **Mobile-friendly** | Responsive, mobile-optimized    |
| **Security**        | RBAC permissions, audit logging |

---

## Demo Access

**Demo URL:** https://demo-kgc.mflerp.com/

### Test Accounts

| Role     | Email           | Password    |
| -------- | --------------- | ----------- |
| Admin    | admin@kgc.hu    | admin123    |
| Operator | operator@kgc.hu | operator123 |

> **Note:** All features are available in the demo environment. Data is refreshed daily.

---

## Changes in v7.1.0

### New Features

- Frontend API clients for all modules
- POS transaction list and filtering
- Direct controllers with optimized queries

### Bug Fixes

- Null check improvements on list pages
- SQL query table name corrections
- Seed data expanded with sales transactions

---

## Support

For questions or issues:

- **Email:** support@myforgelabs.com
- **Documentation:** [docs.mflerp.com](https://docs.mflerp.com)

---

## Upcoming Releases

Development is ongoing. Planned features include:

- Advanced reports and dashboards
- Extended offline synchronization
- Push notifications
- Expanded API documentation

---

**© 2026 MyForge Labs Kft. - All rights reserved.**
