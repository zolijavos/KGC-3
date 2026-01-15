# ADR-020: 3D Fotózás és Termékazonosítás

## Státusz

**ELFOGADVA** - 2025. december 31.

## Kontextus

Bérlési és szerviz folyamatokban szükséges 360° fotó dokumentálás és AI-alapú sérülésfelismerés.

### Üzleti Követelmények

1. **360° fotózás**: 36 kép (10°-onként) minden gép kiadáskor/visszavételkor
2. **Hardver**: Normál mobil telefon kamerája (PWA app)
3. **Fotózási felelős**: Bérlés kiadósor munkatársa
4. **AI elemzés**: Sérülés detektálás, termék azonosítás
5. **Storage**: Cloud storage, nincs limit
6. **Összehasonlítás**: Kiadáskori vs visszavételkori fotók

## Döntések

### 1. AI Platform

**Döntés:** Google Gemini Vision API

**Indoklás:**
- **Konzisztencia**: Koko chatbot is Gemini Flash
- **Multimodal**: Image + text analysis
- **Managed**: Nincs model training
- **Magyar nyelv**: Natív support

**Implementáció:**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class VisionAnalysisService {
  private model: GenerativeModel;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-vision' });
  }

  async analyze360Photos(
    photos: Photo360Set
  ): Promise<MachineConditionReport> {

    const prompt = `
      Elemezd ezeket a 36 fotót egy építőipari gépről (360° fotósorozat).

      Keresendő problémák:
      1. Látható sérülések (karcolás, horpadás, repedés)
      2. Hiányzó alkatrészek
      3. Kopás, elhasználódás
      4. Folyadék szivárgás
      5. Elektromos kábelek sérülése

      Formátum: JSON
      {
        "overallCondition": "excellent|good|fair|poor|damaged",
        "issues": [
          {
            "type": "scratch|dent|missing_part|wear|leak|electrical",
            "severity": "minor|moderate|severe",
            "location": "front|back|left|right|top|bottom",
            "description": "rövid leírás magyarul",
            "photoIndex": 12
          }
        ],
        "recommendedAction": "approve_return|minor_cleaning|repair_needed|reject_return"
      }
    `;

    const imageParts = photos.images.map(img => ({
      inlineData: {
        data: img.base64,
        mimeType: 'image/jpeg'
      }
    }));

    const result = await this.model.generateContent([prompt, ...imageParts]);
    const analysis = JSON.parse(result.response.text());

    return {
      machineId: photos.machineId,
      rentalId: photos.rentalId,
      captureType: photos.type, // 'checkout' | 'checkin'
      capturedAt: photos.capturedAt,
      analysis: analysis,
      photos360Url: photos.storageUrl
    };
  }

  async compareDamageChange(
    checkoutPhotos: Photo360Set,
    checkinPhotos: Photo360Set
  ): Promise<DamageComparison> {

    const prompt = `
      Hasonlítsd össze ezt a két 360° fotósorozatot ugyanarról a gépről:
      - ELSŐ sorozat: Kiadáskor készült
      - MÁSODIK sorozat: Visszavételkor készült

      Azonosítsd az ÚJ sérüléseket (amik a második sorozatban vannak, de az elsőben nem).

      JSON formátum:
      {
        "newDamages": [
          {
            "type": "scratch|dent|missing_part|wear",
            "severity": "minor|moderate|severe",
            "location": "pontos hely leírása",
            "estimatedRepairCost": number,
            "photoIndexBefore": 12,
            "photoIndexAfter": 12
          }
        ],
        "depositRecommendation": {
          "returnFullDeposit": boolean,
          "deductionAmount": number,
          "reason": "indoklás magyarul"
        }
      }
    `;

    const allImages = [
      ...checkoutPhotos.images.map(img => ({ ...img, source: 'checkout' })),
      ...checkinPhotos.images.map(img => ({ ...img, source: 'checkin' }))
    ];

    const result = await this.model.generateContent([
      prompt,
      ...allImages.map(img => ({
        inlineData: { data: img.base64, mimeType: 'image/jpeg' }
      }))
    ]);

    return JSON.parse(result.response.text());
  }
}
```

**Alternatívák (elutasítva):**

- **Custom ML model**: Túl nagy overhead
- **AWS Rekognition**: Vendor lock-in
- **Google Cloud Vision (static)**: Kevésbé intelligens

---

### 2. Mobil PWA App

**Döntés:** Progressive Web App (Vue.js/React) kamera access-szel

**Indoklás:**
- **Cross-platform**: iOS + Android egyből
- **No app store**: Instant deployment
- **Offline capable**: Service Worker
- **Native kamera**: MediaDevices API

**Implementáció:**

```typescript
// Vue.js PWA component
<template>
  <div class="photo-360-capture">
    <video ref="video" autoplay playsinline></video>
    <canvas ref="canvas" style="display: none;"></canvas>

    <div class="progress">
      <div class="angle-indicator">{{ currentAngle }}°</div>
      <div class="photo-count">{{ capturedPhotos.length }} / 36</div>
    </div>

    <button @click="capturePhoto" :disabled="capturing">
      Fotó {{ capturedPhotos.length + 1 }}
    </button>

    <button @click="finishCapture" v-if="capturedPhotos.length === 36">
      Befejezés és feltöltés
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const video = ref(null);
const canvas = ref(null);
const capturedPhotos = ref([]);
const currentAngle = ref(0);
const capturing = ref(false);

onMounted(async () => {
  // Request camera access
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment', // Back camera
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  });

  video.value.srcObject = stream;
});

async function capturePhoto() {
  capturing.value = true;

  const ctx = canvas.value.getContext('2d');
  canvas.value.width = video.value.videoWidth;
  canvas.value.height = video.value.videoHeight;

  ctx.drawImage(video.value, 0, 0);

  const photoBlob = await new Promise(resolve => {
    canvas.value.toBlob(resolve, 'image/jpeg', 0.9);
  });

  capturedPhotos.value.push({
    angle: currentAngle.value,
    blob: photoBlob,
    timestamp: new Date()
  });

  currentAngle.value += 10;
  capturing.value = false;

  // Auto-advance to next angle
  if (capturedPhotos.value.length < 36) {
    playBeep(); // Audio feedback
  }
}

async function finishCapture() {
  const formData = new FormData();
  formData.append('machineId', props.machineId);
  formData.append('rentalId', props.rentalId);
  formData.append('type', props.captureType); // 'checkout' | 'checkin'

  capturedPhotos.value.forEach((photo, index) => {
    formData.append(`photo_${index}`, photo.blob, `${photo.angle}deg.jpg`);
  });

  // Upload to backend
  await fetch('/api/vision/upload-360', {
    method: 'POST',
    body: formData
  });

  // Navigate to review page
  router.push(`/rentals/${props.rentalId}/photos/review`);
}
</script>
```

---

### 3. Cloud Storage

**Döntés:** Google Cloud Storage + CDN

**Indoklás:**
- **Skálázható**: Unlimited storage
- **CDN**: Gyors képbetöltés
- **Lifecycle**: Auto archiving (90 nap után cold storage)
- **Költséghatékony**: Pay-as-you-go

**Implementáció:**

```typescript
import { Storage } from '@google-cloud/storage';

@Injectable()
export class Photo360StorageService {
  private storage: Storage;
  private bucketName = 'kgc-machine-photos-360';

  constructor() {
    this.storage = new Storage();
  }

  async upload360PhotoSet(
    files: Express.Multer.File[],
    metadata: Photo360Metadata
  ): Promise<string> {

    const folder = `machines/${metadata.machineId}/rentals/${metadata.rentalId}/${metadata.type}`;

    // Upload all 36 photos
    const uploadPromises = files.map(async (file, index) => {
      const fileName = `${folder}/${index}_${Date.now()}.jpg`;

      await this.storage.bucket(this.bucketName).file(fileName).save(file.buffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            machineId: metadata.machineId,
            rentalId: metadata.rentalId,
            angle: index * 10,
            captureType: metadata.type
          }
        }
      });

      return fileName;
    });

    await Promise.all(uploadPromises);

    // Return CDN URL for folder
    return `https://cdn.kgc.hu/${folder}`;
  }

  async get360PhotoSet(url: string): Promise<Photo360Set> {
    const files = await this.storage.bucket(this.bucketName).getFiles({
      prefix: url.replace('https://cdn.kgc.hu/', '')
    });

    return {
      images: files[0].map(file => ({
        url: file.publicUrl(),
        angle: parseInt(file.metadata.metadata.angle)
      })).sort((a, b) => a.angle - b.angle)
    };
  }
}
```

---

## Következmények

**Pozitív:**
- ✅ Objektív dokumentálás
- ✅ AI-powered damage detection
- ✅ Gyors fotózás (< 3 perc)
- ✅ Unlimited storage

**Negatív:**
- ⚠️ Gemini Vision API költség (~$0.075/image)
  - **Mitigáció**: Csak kiadás/visszavétel, batch processing

- ⚠️ Storage költség (~$0.02/GB/hó)
  - **Mitigáció**: Lifecycle archiving

---

**Referenciák**: `docs/analysis/Kerdes-Valaszok-2025-12-30.md` (Q9-Q12)

---

**Készítette**: Winston (Architect Agent)
