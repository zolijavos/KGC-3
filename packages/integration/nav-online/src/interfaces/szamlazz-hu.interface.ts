/**
 * Számlázz.hu API Interfaces
 * ADR-030: NAV Online Számlázás API v3.0 Integráció
 * @package @kgc/nav-online
 */

/**
 * ÁFA kulcs típusok a Számlázz.hu API-hoz
 */
export type VatRate = '27' | '18' | '5' | '0' | 'AAM' | 'TAM' | 'EU' | 'EUK' | 'MAA' | 'F.AFA' | 'K.AFA';

/**
 * Adószám típus (külföldi partner esetén)
 */
export type TaxNumberType = 'HU' | 'EU' | 'NONEU';

/**
 * Fizetési mód
 */
export type PaymentMethodCode = 'készpénz' | 'átutalás' | 'bankkártya' | 'utánvét' | 'PayPal' | 'SZEP';

/**
 * Eladó adatok a számlán
 */
export interface SzamlazzhuSeller {
  /** Bank neve */
  bank: string;
  /** Bankszámlaszám */
  bankszamlaszam: string;
  /** Email reply-to cím */
  emailReplyto?: string;
  /** Email tárgy */
  emailSubject?: string;
  /** Email szöveg */
  emailSzoveg?: string;
}

/**
 * Vevő adatok a számlán
 */
export interface SzamlazzhuBuyer {
  /** Vevő neve */
  nev: string;
  /** Irányítószám */
  irsz: string;
  /** Település */
  telepules: string;
  /** Cím (utca, házszám) */
  cim: string;
  /** Adószám (céges számla esetén) */
  adoszam?: string;
  /** Adószám típus */
  adoszamTipus?: TaxNumberType;
  /** Email cím */
  email?: string;
  /** Telefonszám */
  telefon?: string;
  /** Megjegyzés */
  megjegyzes?: string;
}

/**
 * Számla tétel
 */
export interface SzamlazzhuItem {
  /** Megnevezés */
  megnevezes: string;
  /** Mennyiség */
  mennyiseg: number;
  /** Mennyiségi egység */
  mennyisegiEgyseg: string;
  /** Nettó egységár */
  nettoEgysegar: number;
  /** ÁFA kulcs */
  afakulcs: VatRate;
  /** Nettó érték */
  nettoErtek: number;
  /** ÁFA érték */
  afaErtek: number;
  /** Bruttó érték */
  bruttoErtek: number;
}

/**
 * Számlázz.hu API kérés
 */
export interface SzamlazzhuRequest {
  /** Fejléc beállítások */
  bepiallitasok: {
    /** Számlaszám prefix */
    szamlaszamElotag?: string;
    /** Fizetve státusz */
    fizpietes?: boolean;
    /** Számla kelte */
    kpieltDatum?: string;
    /** eSzámla küldés */
    eSzamla?: boolean;
    /** Számla nyelve */
    szamlaNyelve?: 'hu' | 'en' | 'de';
  };

  /** Eladó adatok */
  elado: SzamlazzhuSeller;

  /** Vevő adatok */
  vevo: SzamlazzhuBuyer;

  /** Számla tételek */
  tetelek: SzamlazzhuItem[];

  /** Számla kelte (YYYY-MM-DD) */
  szamlaKelte: string;

  /** Teljesítés dátuma (YYYY-MM-DD) */
  teljesitesDatum: string;

  /** Fizetési határidő (YYYY-MM-DD) */
  fizetesiHatarido: string;

  /** Fizetési mód */
  fizmod: PaymentMethodCode;

  /** Pénznem */
  ppienznem?: string;

  /** Árfolyam (külföldi pénznem esetén) */
  arpifolyam?: number;

  /** Átutalási azonosító (MyPos tranzakció ID) */
  ppizonosito?: string;

  /** Megjegyzés */
  megjegyzes?: string;

  /** Hivatkozás előző számlára (helyesbítő/sztornó esetén) */
  hivpiatkozottSzamlaKelte?: string;
  hivpiatkozottSzamlaszam?: string;
}

/**
 * Számlázz.hu API válasz
 */
export interface SzamlazzhuResponse {
  /** Sikeres volt-e a művelet */
  success: boolean;

  /** Generált számlaszám */
  szamlaszam?: string;

  /** NAV kintlevőség azonosító */
  kintpizonosito?: string;

  /** PDF számla (Base64 kódolva) */
  pdf?: string;

  /** Hibakód */
  errorCode?: number;

  /** Hibaüzenet */
  errorMessage?: string;

  /** NAV beküldés státusza */
  navStatus?: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

  /** NAV tranzakció ID */
  navTransactionId?: string;
}

/**
 * Számlázz.hu API konfiguráció
 */
export interface SzamlazzhuConfig {
  /** API kulcs */
  apiKey: string;

  /** Ügynök kulcs */
  agentKey?: string;

  /** Sandbox mód */
  sandbox: boolean;

  /** API URL */
  apiUrl: string;

  /** Timeout milliszekundumban */
  timeout: number;

  /** Automatikus email küldés */
  autoSendEmail: boolean;

  /** PDF generálás */
  generatePdf: boolean;
}

/**
 * Számlázz.hu hibakódok
 */
export enum SzamlazzhuErrorCode {
  // Auth hibák
  AUTH_ERROR = 1,
  INVALID_API_KEY = 2,

  // Validációs hibák
  INVALID_DATA = 3,
  INVALID_TAX_NUMBER = 4,
  INVALID_INVOICE_DATA = 5,

  // Duplikáció
  DUPLICATE_INVOICE = 10,

  // NAV hibák
  NAV_ERROR = 50,
  NAV_TEMPORARY_ERROR = 51,
  NAV_VALIDATION_ERROR = 52,

  // Szerver hibák
  SERVICE_UNAVAILABLE = 100,
  TIMEOUT = 101,
  RATE_LIMIT = 102,
  CONNECTION_ERROR = 103,
}
