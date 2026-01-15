# ADR-022: Vonalkód vs QR Kód Stratégia

## Státusz

**ELFOGADVA** - 2025. december 31.

## Kontextus

Raktár, bérlés, szervíz folyamatokban szükséges gyors és megbízható termék/hely azonosítás.

### Üzleti Követelmények

1. **Hardver**: Kézi vonalkód scanner + Mobil app (telefon kamera)
2. **Nyomtatás**: Zebra/Brother label printer (tervezve, még nincs)
3. **Hierarchia**: Termék / Doboz / Hely kódok szeparálása
4. **Munkalap**: QR mátrix nyomtatás gépenként

## Döntések

### 1. Hibrid Stratégia

**Döntés:** Vonalkód (1D) termékekhez + QR kód (2D) komplex adatokhoz

**Indoklás:**
- **Vonalkód (Code128)**: Gyors scan, univerzális support
- **QR kód**: Több adat (JSON), offline működés
- **Hibrid**: Legjobb mindkét világból

**Használati esetek:**

| Eset | Típus | Indok |
|------|-------|-------|
| **Termék SKU** | Vonalkód (Code128) | Gyors, standard |
| **Doboz/Hely kód** | Vonalkód (Code128) | Egyszerű, rövid |
| **Munkalap mátrix** | QR kód | Komplex JSON adat |
| **Bérlési munkalap** | QR kód | Offline access, több info |
| **Raklap** | QR kód | Nagy méret, több adat |

**Implementáció:**

```typescript
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

@Injectable()
export class BarcodeService {

  // Vonalkód generálás (Code128)
  async generateBarcode(data: string): Promise<Buffer> {
    const canvas = createCanvas(400, 100);
    JsBarcode(canvas, data, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 10
    });

    return canvas.toBuffer('image/png');
  }

  // QR kód generálás (komplex adat)
  async generateQRCode(data: object | string): Promise<Buffer> {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

    return await QRCode.toBuffer(jsonData, {
      errorCorrectionLevel: 'H', // High error correction
      type: 'png',
      width: 300,
      margin: 2
    });
  }

  // Termék vonalkód
  async generateProductBarcode(product: Product): Promise<Buffer> {
    // SKU format: "PROD-00001234"
    return await this.generateBarcode(product.sku);
  }

  // Hely vonalkód
  async generateLocationBarcode(location: string): Promise<Buffer> {
    // Location code: "K1-P5-D17"
    return await this.generateBarcode(location);
  }

  // Munkalap QR mátrix
  async generateWorkOrderQR(workOrder: WorkOrder): Promise<Buffer> {
    const qrData = {
      type: 'work_order',
      id: workOrder.id,
      machineId: workOrder.machineId,
      rentalId: workOrder.rentalId || null,
      createdAt: workOrder.createdAt,
      priority: workOrder.priority,
      locationCode: workOrder.locationCode,

      // Offline access info
      machineModel: workOrder.machine.model,
      customerName: workOrder.customer?.name,
      issueDescription: workOrder.issueDescription
    };

    return await this.generateQRCode(qrData);
  }

  // Bérlési QR kód
  async generateRentalQR(rental: Rental): Promise<Buffer> {
    const qrData = {
      type: 'rental',
      id: rental.id,
      machineId: rental.machineId,
      machineModel: rental.machine.model,
      customerId: rental.customerId,
      customerName: rental.customer.name,
      checkoutDate: rental.checkoutDate,
      expectedReturnDate: rental.expectedReturnDate,
      depositAmount: rental.depositAmount,
      dailyRate: rental.dailyRate
    };

    return await this.generateQRCode(qrData);
  }
}
```

---

### 2. Nyomtatási Template

**Döntés:** Zebra ZPL (Zebra Printing Language)

**Implementáció:**

```typescript
@Injectable()
export class LabelPrinterService {

  // Termék címke nyomtatás
  async printProductLabel(product: Product): Promise<void> {
    const barcode = await this.barcodeService.generateBarcode(product.sku);

    const zpl = `
      ^XA
      ^FO50,50^GFA,${barcode.length},${barcode.length},${barcode.toString('base64')}^FS
      ^FO50,150^A0N,30,30^FD${product.name}^FS
      ^FO50,200^A0N,20,20^FDSKU: ${product.sku}^FS
      ^FO50,230^A0N,20,20^FDPrice: ${product.price} HUF^FS
      ^XZ
    `;

    await this.sendToZebraPrinter(zpl);
  }

  // Munkalap QR mátrix nyomtatás
  async printWorkOrderMatrix(workOrder: WorkOrder): Promise<void> {
    const qrCode = await this.barcodeService.generateWorkOrderQR(workOrder);

    const zpl = `
      ^XA
      ^FO50,50^GFA,${qrCode.length},${qrCode.length},${qrCode.toString('base64')}^FS
      ^FO350,50^A0N,40,40^FDMUNKALAP^FS
      ^FO350,100^A0N,25,25^FD${workOrder.id}^FS
      ^FO350,140^A0N,20,20^FD${workOrder.machine.model}^FS
      ^FO350,170^A0N,20,20^FDHely: ${workOrder.locationCode}^FS
      ^FO350,200^A0N,20,20^FDPrioritás: ${workOrder.priority}^FS
      ^XZ
    `;

    await this.sendToZebraPrinter(zpl);
  }

  private async sendToZebraPrinter(zpl: string): Promise<void> {
    // Network printer (Zebra printer IP)
    const printerIP = process.env.ZEBRA_PRINTER_IP;

    await fetch(`http://${printerIP}:9100`, {
      method: 'POST',
      body: zpl
    });
  }
}
```

---

### 3. Mobil Scanning

**Döntés:** PWA app + Html5-QRCode library

**Implementáció:**

```vue
<template>
  <div class="barcode-scanner">
    <div id="reader" style="width: 100%;"></div>

    <div v-if="scannedData" class="result">
      <h3>Beolvasva:</h3>
      <pre>{{ scannedData }}</pre>

      <button @click="processScannedData">Feldolgozás</button>
    </div>
  </div>
</template>

<script setup>
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ref, onMounted } from 'vue';

const scannedData = ref(null);

onMounted(() => {
  const scanner = new Html5QrcodeScanner(
    'reader',
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128
      ]
    },
    false
  );

  scanner.render(onScanSuccess, onScanError);
});

function onScanSuccess(decodedText, decodedResult) {
  try {
    // Try parse as JSON (QR code)
    scannedData.value = JSON.parse(decodedText);
  } catch {
    // Plain barcode
    scannedData.value = { type: 'barcode', value: decodedText };
  }
}

function onScanError(error) {
  console.warn(`Scan error: ${error}`);
}

async function processScannedData() {
  if (scannedData.value.type === 'work_order') {
    // Navigate to work order details
    router.push(`/work-orders/${scannedData.value.id}`);

  } else if (scannedData.value.type === 'rental') {
    // Navigate to rental details
    router.push(`/rentals/${scannedData.value.id}`);

  } else if (scannedData.value.type === 'barcode') {
    // Product/Location lookup
    const result = await api.get(`/inventory/scan/${scannedData.value.value}`);
    // Show product/location info
  }
}
</script>
```

---

## Következmények

**Pozitív:**
- ✅ Hibrid: Legjobb mindkét világból
- ✅ Offline QR kódok
- ✅ Gyors vonalkód scan
- ✅ Mobil + dedikált scanner support

**Negatív:**
- ⚠️ Két rendszer karbantartása
  - **Mitigáció**: Unified API, központi kódgenerálás

---

**Referenciák**: `docs/analysis/Kerdes-Valaszok-2025-12-30.md` (Q17-Q18)

---

**Készítette**: Winston (Architect Agent)
