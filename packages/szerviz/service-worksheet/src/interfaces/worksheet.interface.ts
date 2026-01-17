/**
 * @kgc/service-worksheet - Worksheet Interfaces
 * Epic 17: Work Orders
 *
 * Munkalap (Work Order) típusok és interfészek
 */

/**
 * Munkalap státuszok - State machine
 *
 * Átmenetek:
 * FELVEVE → FOLYAMATBAN → KESZ → SZAMLAZANDO → LEZART
 *         ↘ VARHATO ↗
 *         ↘ TOROLVE (bármikor FELVEVE-ből)
 */
export enum WorksheetStatus {
  /** Felvéve - Új munkalap */
  FELVEVE = 'FELVEVE',
  /** Folyamatban - Szerelő dolgozik rajta */
  FOLYAMATBAN = 'FOLYAMATBAN',
  /** Várakozó - Alkatrészre vagy ügyfélre vár */
  VARHATO = 'VARHATO',
  /** Kész - Munka befejezve, számlázandó */
  KESZ = 'KESZ',
  /** Számlázandó - Számla készítés alatt */
  SZAMLAZANDO = 'SZAMLAZANDO',
  /** Lezárt - Minden kész, archivált */
  LEZART = 'LEZART',
  /** Törölve - Sztornózott */
  TOROLVE = 'TOROLVE',
}

/**
 * Munkalap típusok
 */
export enum WorksheetType {
  /** Fizetős javítás */
  FIZETOS = 'FIZETOS',
  /** Garanciális javítás */
  GARANCIALIS = 'GARANCIALIS',
  /** Bérléssel kapcsolatos szerviz */
  BERLESI = 'BERLESI',
  /** Karbantartás */
  KARBANTARTAS = 'KARBANTARTAS',
}

/**
 * Munkalap prioritások (FR91-FR93)
 */
export enum WorksheetPriority {
  /** Sürgős - Felár (+20%) */
  SURGOS = 'SURGOS',
  /** Felár - Extra szolgáltatás */
  FELARAS = 'FELARAS',
  /** Garanciális - Prioritásos kezelés */
  GARANCIALIS = 'GARANCIALIS',
  /** Franchise partner - Kiemelt kezelés */
  FRANCHISE = 'FRANCHISE',
  /** Normál - Alapértelmezett */
  NORMAL = 'NORMAL',
}

/**
 * Munkalap entitás
 */
export interface IWorksheet {
  /** Egyedi azonosító (UUID) */
  id: string;
  /** Tenant azonosító (multi-tenancy) */
  tenantId: string;
  /** Munkalap szám (ML-YYYY-NNNN) */
  worksheetNumber: string;
  /** Munkalap típus */
  type: WorksheetType;
  /** Aktuális státusz */
  status: WorksheetStatus;
  /** Prioritás */
  priority: WorksheetPriority;
  /** Partner azonosító */
  partnerId: string;
  /** Gép megnevezés */
  deviceName: string;
  /** Gép sorozatszám */
  deviceSerialNumber?: string;
  /** Hiba leírás (ügyfél által) */
  faultDescription: string;
  /** Diagnosztika (szerelő által) */
  diagnosis?: string;
  /** Elvégzett munka leírás */
  workPerformed?: string;
  /** Belső megjegyzés (csak dolgozóknak) */
  internalNote?: string;
  /** Felelős szerelő ID */
  assignedToId?: string;
  /** Javítási költség limit (FR107) */
  costLimit?: number;
  /** Becsült befejezés dátum */
  estimatedCompletionDate?: Date;
  /** Felvétel dátuma */
  receivedAt: Date;
  /** Lezárás dátuma */
  completedAt?: Date;
  /** Kapcsolódó bérlés ID */
  rentalId?: string;
  /** Létrehozó user */
  createdBy: string;
  /** Létrehozás dátum */
  createdAt: Date;
  /** Módosítás dátum */
  updatedAt: Date;
}

/**
 * Munkalap tétel (alkatrész/munkadíj)
 */
export interface IWorksheetItem {
  /** Egyedi azonosító */
  id: string;
  /** Munkalap ID */
  worksheetId: string;
  /** Tenant ID */
  tenantId: string;
  /** Cikk ID (alkatrész esetén) */
  productId?: string;
  /** Tétel megnevezés */
  description: string;
  /** Mennyiség */
  quantity: number;
  /** Egységár (nettó, HUF) */
  unitPrice: number;
  /** ÁFA kulcs (%) */
  vatRate: number;
  /** Nettó összeg */
  netAmount: number;
  /** Bruttó összeg */
  grossAmount: number;
  /** Tétel típus */
  itemType: 'ALKATRESZ' | 'MUNKADIJ' | 'EGYEB';
  /** Létrehozás dátum */
  createdAt: Date;
}

/**
 * Munkalap összesítő
 */
export interface IWorksheetSummary {
  /** Munkalap ID */
  worksheetId: string;
  /** Alkatrész költség (nettó) */
  partsNetAmount: number;
  /** Munkadíj (nettó) */
  laborNetAmount: number;
  /** Egyéb költség (nettó) */
  otherNetAmount: number;
  /** Teljes nettó összeg */
  totalNetAmount: number;
  /** Teljes bruttó összeg */
  totalGrossAmount: number;
  /** ÁFA összeg */
  vatAmount: number;
}

/**
 * Munkalap szám generálás eredménye
 */
export interface IWorksheetNumberResult {
  worksheetNumber: string;
  year: number;
  sequence: number;
}
