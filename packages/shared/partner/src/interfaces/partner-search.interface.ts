/**
 * Partner Search Interfaces
 * FR31: Partner merge/duplicate detection
 * FR33: Partner azonosítás scan-nel
 */

import { Partner } from './partner.interface';

/**
 * Keresési mód
 */
export type SearchMode = 'QUICK' | 'FULL' | 'AUTOCOMPLETE';

/**
 * Keresési input
 */
export interface PartnerSearchInput {
  tenantId: string;
  query: string; // Keresési szöveg
  mode?: SearchMode;
  limit?: number;
  types?: ('INDIVIDUAL' | 'COMPANY')[];
  includeInactive?: boolean;
}

/**
 * Keresési találat
 */
export interface SearchResult {
  partner: Partner;
  score: number; // Relevancia pontszám
  matchedFields: string[]; // Mely mezőkben találtunk egyezést
  hasWarnings: boolean;
  isBlocked: boolean;
}

/**
 * Keresési eredmény
 */
export interface PartnerSearchResult {
  results: SearchResult[];
  totalCount: number;
  searchTime: number; // ms
  query: string;
}

/**
 * Azonosítás input (scan)
 */
export interface IdentifyPartnerInput {
  tenantId: string;
  identifier: string; // Telefon, email, törzsvendég kód, vonalkód
  operatorId: string;
}

/**
 * Azonosítás eredmény
 */
export interface IdentifyPartnerResult {
  found: boolean;
  partner?: Partner;
  identifiedBy?: 'PHONE' | 'EMAIL' | 'LOYALTY_CARD' | 'TAX_NUMBER';
  greeting?: string;
  hasWarnings: boolean;
  warnings?: string[];
}

/**
 * Search service interface
 */
export interface IPartnerSearchService {
  search(input: PartnerSearchInput): Promise<PartnerSearchResult>;
  identify(input: IdentifyPartnerInput): Promise<IdentifyPartnerResult>;
  autocomplete(tenantId: string, query: string, limit?: number): Promise<SearchResult[]>;
}
