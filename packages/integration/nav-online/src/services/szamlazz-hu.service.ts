/**
 * Számlázz.hu API Service
 * Story 11-1: Számlázz.hu API Integráció
 * ADR-030: NAV Online Számlázás API v3.0 Integráció
 * @package @kgc/nav-online
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  SzamlazzhuConfig,
  SzamlazzhuRequest,
  SzamlazzhuResponse,
  SzamlazzhuBuyer,
} from '../interfaces/szamlazz-hu.interface';
import type { Invoice, InvoiceResult } from '../interfaces/invoice.interface';
import { InvoiceStatus } from '../interfaces/invoice.interface';

/**
 * Alapértelmezett Számlázz.hu konfiguráció
 */
const DEFAULT_CONFIG: Partial<SzamlazzhuConfig> = {
  apiUrl: 'https://www.szamlazz.hu/szamla/',
  timeout: 30000,
  sandbox: false,
  autoSendEmail: false,
  generatePdf: true,
};

/**
 * Számlázz.hu API Service
 * Handles all communication with Számlázz.hu API
 */
@Injectable()
export class SzamlazzhuService {
  private readonly logger = new Logger(SzamlazzhuService.name);
  private readonly client: AxiosInstance;
  private readonly config: SzamlazzhuConfig;

  constructor(config: Partial<SzamlazzhuConfig>) {
    // KRITIKUS: API kulcs validáció
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('Számlázz.hu API key is required');
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as SzamlazzhuConfig;

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
      },
    });

    this.logger.log(`Számlázz.hu service initialized (sandbox: ${this.config.sandbox})`);
  }

  /**
   * Számla létrehozása a Számlázz.hu API-n keresztül
   */
  async createInvoice(invoice: Invoice): Promise<InvoiceResult> {
    this.logger.debug(`Creating invoice for tenant: ${invoice.tenantId}`);

    try {
      const request = this.mapInvoiceToRequest(invoice);
      const xmlRequest = this.buildXmlRequest(request);

      this.logger.debug(`Sending request to Számlázz.hu API`);

      const response = await this.client.post<string>('', xmlRequest);
      const parsedResponse = this.parseXmlResponse(response.data);

      if (parsedResponse.success) {
        this.logger.log(`Invoice created: ${parsedResponse.szamlaszam}`);

        const updatedInvoice: Invoice = {
          ...invoice,
          status: InvoiceStatus.SUCCESS,
        };
        if (parsedResponse.szamlaszam !== undefined) {
          updatedInvoice.externalNumber = parsedResponse.szamlaszam;
        }
        if (parsedResponse.kintpizonosito !== undefined) {
          updatedInvoice.navReference = parsedResponse.kintpizonosito;
        }
        if (parsedResponse.pdf !== undefined) {
          updatedInvoice.pdfUrl = this.savePdf(parsedResponse.pdf, invoice.internalNumber);
        }

        return {
          success: true,
          invoice: updatedInvoice,
        };
      }

      return this.handleApiError(parsedResponse);
    } catch (error) {
      return this.handleAxiosError(error as AxiosError);
    }
  }

  /**
   * Számla sztornózása
   */
  async cancelInvoice(invoice: Invoice): Promise<InvoiceResult> {
    this.logger.debug(`Cancelling invoice: ${invoice.externalNumber}`);

    try {
      const request = this.buildStornoRequest(invoice);
      const xmlRequest = this.buildXmlRequest(request);

      const response = await this.client.post<string>('', xmlRequest);
      const parsedResponse = this.parseXmlResponse(response.data);

      if (parsedResponse.success) {
        this.logger.log(`Invoice cancelled: ${invoice.externalNumber}`);

        return {
          success: true,
          invoice: {
            ...invoice,
            status: InvoiceStatus.CANCELLED,
          },
        };
      }

      return this.handleApiError(parsedResponse);
    } catch (error) {
      return this.handleAxiosError(error as AxiosError);
    }
  }

  /**
   * Számla státusz lekérdezése
   */
  async getInvoiceStatus(invoiceNumber: string): Promise<SzamlazzhuResponse> {
    this.logger.debug(`Getting status for invoice: ${invoiceNumber}`);

    try {
      const xmlRequest = this.buildStatusRequest(invoiceNumber);
      const response = await this.client.post<string>('', xmlRequest);

      return this.parseXmlResponse(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        success: false,
        errorCode: this.mapAxiosErrorCode(axiosError),
        errorMessage: axiosError.message,
      };
    }
  }

  /**
   * PDF letöltése
   */
  async downloadPdf(invoiceNumber: string): Promise<Buffer | null> {
    this.logger.debug(`Downloading PDF for invoice: ${invoiceNumber}`);

    try {
      const xmlRequest = this.buildPdfRequest(invoiceNumber);
      const response = await this.client.post('', xmlRequest, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      this.logger.error(`Failed to download PDF: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Invoice -> SzamlazzhuRequest mapping
   */
  private mapInvoiceToRequest(invoice: Invoice): SzamlazzhuRequest {
    const request: SzamlazzhuRequest = {
      bepiallitasok: {
        szamlaszamElotag: 'KGC',
        fizpietes: invoice.paymentMethod !== 'átutalás',
        eSzamla: this.config.autoSendEmail,
        szamlaNyelve: 'hu',
      },
      elado: {
        bank: '', // Will be filled from tenant config
        bankszamlaszam: '', // Will be filled from tenant config
        emailReplyto: '', // Will be filled from tenant config
        emailSubject: `Számla: ${invoice.internalNumber}`,
        emailSzoveg: 'Tisztelt Partnerünk! Mellékeljük számláját.',
      },
      vevo: this.buildVevo(invoice),
      tetelek: invoice.items.map((item) => ({
        megnevezes: item.name,
        mennyiseg: item.quantity,
        mennyisegiEgyseg: item.unit,
        nettoEgysegar: item.unitPriceNet,
        afakulcs: item.vatRate,
        nettoErtek: item.netAmount,
        afaErtek: item.vatAmount,
        bruttoErtek: item.grossAmount,
      })),
      szamlaKelte: this.formatDate(invoice.invoiceDate),
      teljesitesDatum: this.formatDate(invoice.fulfillmentDate),
      fizetesiHatarido: this.formatDate(invoice.dueDate),
      fizmod: invoice.paymentMethod,
    };
    if (invoice.paymentTransactionId !== undefined) {
      request.ppizonosito = invoice.paymentTransactionId;
    }
    if (invoice.notes !== undefined) {
      request.megjegyzes = invoice.notes;
    }
    return request;
  }

  /**
   * XML kérés építése
   */
  private buildXmlRequest(request: SzamlazzhuRequest): string {
    const itemsXml = request.tetelek
      .map(
        (item) => `
      <tetel>
        <megnevezes>${this.escapeXml(item.megnevezes)}</megnevezes>
        <mennyiseg>${item.mennyiseg}</mennyiseg>
        <mennyisegiEgyseg>${this.escapeXml(item.mennyisegiEgyseg)}</mennyisegiEgyseg>
        <nettoEgysegar>${item.nettoEgysegar}</nettoEgysegar>
        <afakulcs>${item.afakulcs}</afakulcs>
        <nettoErtek>${item.nettoErtek}</nettoErtek>
        <afaErtek>${item.afaErtek}</afaErtek>
        <bruttoErtek>${item.bruttoErtek}</bruttoErtek>
      </tetel>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <bepiallitasok>
    <szamlaagpientipikulcs>${this.escapeXml(this.config.apiKey)}</szamlaagpientipikulcs>
    <eszamla>${request.bepiallitasok.eSzamla}</eszamla>
    <szamlaNyelve>${this.escapeXml(request.bepiallitasok.szamlaNyelve)}</szamlaNyelve>
  </bepiallitasok>
  <fejlec>
    <keltDatum>${this.escapeXml(request.szamlaKelte)}</keltDatum>
    <teljesitesDatum>${this.escapeXml(request.teljesitesDatum)}</teljesitesDatum>
    <fizetesiHataridoDatum>${this.escapeXml(request.fizetesiHatarido)}</fizetesiHataridoDatum>
    <fizpimod>${this.escapeXml(request.fizmod)}</fizpimod>
    <ppienznem>HUF</ppienznem>
    <szamlaNyelve>${this.escapeXml(request.bepiallitasok.szamlaNyelve)}</szamlaNyelve>
    <megjegyzes>${this.escapeXml(request.megjegyzes)}</megjegyzes>
  </fejlec>
  <elado>
    <bank>${this.escapeXml(request.elado.bank)}</bank>
    <bankszamlaszam>${this.escapeXml(request.elado.bankszamlaszam)}</bankszamlaszam>
  </elado>
  <vevo>
    <nev>${this.escapeXml(request.vevo.nev)}</nev>
    <irsz>${this.escapeXml(request.vevo.irsz)}</irsz>
    <telepules>${this.escapeXml(request.vevo.telepules)}</telepules>
    <cim>${this.escapeXml(request.vevo.cim)}</cim>
    ${request.vevo.adoszam ? `<adoszam>${this.escapeXml(request.vevo.adoszam)}</adoszam>` : ''}
    ${request.vevo.email ? `<email>${this.escapeXml(request.vevo.email)}</email>` : ''}
  </vevo>
  <tetelek>${itemsXml}
  </tetelek>
</xmlszamla>`;
  }

  /**
   * Sztornó kérés építése
   */
  private buildStornoRequest(invoice: Invoice): SzamlazzhuRequest {
    const baseRequest = this.mapInvoiceToRequest(invoice);
    const stornoRequest: SzamlazzhuRequest = {
      ...baseRequest,
      hivpiatkozottSzamlaKelte: this.formatDate(invoice.invoiceDate),
    };
    if (invoice.externalNumber !== undefined) {
      stornoRequest.hivpiatkozottSzamlaszam = invoice.externalNumber;
    }
    return stornoRequest;
  }

  /**
   * Státusz lekérdezés XML
   */
  private buildStatusRequest(invoiceNumber: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlastatusz xmlns="http://www.szamlazz.hu/xmlszamlastatusz">
  <szamlaagpientipikulcs>${this.escapeXml(this.config.apiKey)}</szamlaagpientipikulcs>
  <szamlaszam>${this.escapeXml(invoiceNumber)}</szamlaszam>
</xmlszamlastatusz>`;
  }

  /**
   * PDF lekérdezés XML
   */
  private buildPdfRequest(invoiceNumber: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlapdf xmlns="http://www.szamlazz.hu/xmlszamlapdf">
  <szamlaagpientipikulcs>${this.escapeXml(this.config.apiKey)}</szamlaagpientipikulcs>
  <szamlaszam>${this.escapeXml(invoiceNumber)}</szamlaszam>
</xmlszamlapdf>`;
  }

  /**
   * XML válasz parse
   */
  private parseXmlResponse(xmlResponse: string): SzamlazzhuResponse {
    // Simplified XML parser - in production use xml2js or similar
    const getTagValue = (xml: string, tag: string): string | undefined => {
      const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
      const match = xml.match(regex);
      return match?.[1];
    };

    const success = !xmlResponse.includes('<hibakod>');

    if (success) {
      const successResponse: SzamlazzhuResponse = {
        success: true,
        navStatus: 'SUBMITTED',
      };
      const szamlaszam = getTagValue(xmlResponse, 'szamlaszam');
      if (szamlaszam !== undefined) {
        successResponse.szamlaszam = szamlaszam;
      }
      const kintpizonosito = getTagValue(xmlResponse, 'kintpizonosito');
      if (kintpizonosito !== undefined) {
        successResponse.kintpizonosito = kintpizonosito;
      }
      const pdf = getTagValue(xmlResponse, 'pdf');
      if (pdf !== undefined) {
        successResponse.pdf = pdf;
      }
      return successResponse;
    }

    const errorCodeStr = getTagValue(xmlResponse, 'hibakod');
    const parsedErrorCode = errorCodeStr ? parseInt(errorCodeStr, 10) : 0;

    return {
      success: false,
      errorCode: Number.isNaN(parsedErrorCode) ? 0 : parsedErrorCode,
      errorMessage: getTagValue(xmlResponse, 'hibauzenet') ?? 'Unknown error',
    };
  }

  /**
   * API hiba kezelése
   */
  private handleApiError(response: SzamlazzhuResponse): InvoiceResult {
    const isRetryable = this.isRetryableError(response.errorCode);

    this.logger.warn(`API error: ${response.errorCode} - ${response.errorMessage}`);

    return {
      success: false,
      error: {
        code: String(response.errorCode),
        message: response.errorMessage ?? 'Unknown API error',
        retryable: isRetryable,
      },
    };
  }

  /**
   * Axios hiba kezelése
   */
  private handleAxiosError(error: AxiosError): InvoiceResult {
    const errorCode = this.mapAxiosErrorCode(error);

    this.logger.error(`Network error: ${errorCode} - ${error.message}`);

    return {
      success: false,
      error: {
        code: String(errorCode),
        message: error.message,
        retryable: this.isRetryableError(errorCode),
      },
    };
  }

  /**
   * Axios hibakód mapping
   */
  private mapAxiosErrorCode(error: AxiosError): number {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 101; // TIMEOUT
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 103; // CONNECTION_ERROR
    }
    if (error.response?.status === 429) {
      return 102; // RATE_LIMIT
    }
    if (error.response?.status === 503) {
      return 100; // SERVICE_UNAVAILABLE
    }
    return 100; // Default to SERVICE_UNAVAILABLE
  }

  /**
   * Újrapróbálható-e a hiba
   */
  private isRetryableError(errorCode: number | undefined): boolean {
    const retryableCodes = [100, 101, 102, 103, 51]; // SERVICE_UNAVAILABLE, TIMEOUT, RATE_LIMIT, CONNECTION_ERROR, NAV_TEMPORARY_ERROR
    return retryableCodes.includes(errorCode ?? 0);
  }

  /**
   * PDF mentése (placeholder - valós implementációban S3/MinIO)
   */
  private savePdf(_base64Pdf: string, invoiceNumber: string): string {
    // In production, save to S3/MinIO and return URL
    this.logger.debug(`Saving PDF for invoice: ${invoiceNumber}`);
    return `/invoices/${invoiceNumber}.pdf`;
  }

  /**
   * Dátum formázás YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? '';
  }

  /**
   * Build vevo (buyer) object with conditional optional properties
   */
  private buildVevo(invoice: Invoice): SzamlazzhuBuyer {
    const vevo: SzamlazzhuBuyer = {
      nev: invoice.partner.name,
      irsz: invoice.partner.zipCode,
      telepules: invoice.partner.city,
      cim: invoice.partner.address,
      adoszamTipus: invoice.partner.euTaxNumber ? 'EU' : 'HU',
    };
    if (invoice.partner.taxNumber !== undefined) {
      vevo.adoszam = invoice.partner.taxNumber;
    }
    if (invoice.partner.email !== undefined) {
      vevo.email = invoice.partner.email;
    }
    if (invoice.partner.phone !== undefined) {
      vevo.telefon = invoice.partner.phone;
    }
    return vevo;
  }

  /**
   * XML escape speciális karakterekhez
   * Megvéd XML injection ellen
   */
  private escapeXml(str: string | undefined): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
