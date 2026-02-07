# Story 41-3: Top 10 Partner Riport

## Story Metaadatok

| Mező           | Érték                                        |
| -------------- | -------------------------------------------- |
| **Story ID**   | 41-3                                         |
| **Epic**       | Epic 41 - Kintlévőség & Bevételi Előrejelzés |
| **Prioritás**  | P1 - Magas                                   |
| **Becsült SP** | 2                                            |
| **Státusz**    | done (YOLO Pipeline - 2026-02-07)            |
| **ADR**        | ADR-052                                      |
| **Sprint**     | Sprint 9                                     |

## User Story

**Mint** boltvezető,
**Szeretném** látni a legtöbbet költő partnereket,
**Hogy** ajándékot tudjak adni nekik.

## Technikai Feladatok

### Task 1: Backend Service ✅

- [x] TopPartnersService.getTopPartners() bővítve
- [x] giftEligible field (totalRevenue >= DEFAULT_GIFT_THRESHOLD)
- [x] lastPurchaseDate field
- [x] DEFAULT_GIFT_THRESHOLD = 500.000 Ft

### Task 2: API Endpoint ✅

- [x] GET /dashboard/partner/top (meglévő endpoint bővítve)
- [x] TopPartnerItem interface bővítve

### Task 3: Dashboard Widget ✅

- [x] TopPartnersWidget bővítve (Story 35-6 widget)
- [x] Gift badge ikon (amber szín) ajándékra jogosultaknál
- [x] Interface bővítve új mezőkkel

## Implementációs Összefoglaló

Ez a story a Story 35-6-ban létrehozott TopPartners funkciót bővítette ki.

### Módosított Fájlok (3 fájl)

1. `apps/kgc-api/src/modules/dashboard/partner/dto/partner-response.dto.ts`
   - TopPartnerItem: +lastPurchaseDate, +giftEligible
   - +DEFAULT_GIFT_THRESHOLD konstans

2. `apps/kgc-api/src/modules/dashboard/partner/partner.service.ts`
   - Mock data: +lastPurchaseDate minden partnerhez
   - giftEligible kalkuláció a mapping-ben

3. `apps/kgc-web/src/features/dashboard/widgets/TopPartnersWidget.tsx`
   - Interface bővítés
   - Gift badge ikon (lucide-react Gift)
   - ARIA label accessibility

### Tesztek

A Story 35-6-ban létrehozott tesztek továbbra is érvényesek.
Az új mezők opcionálisak a meglévő tesztekhez.

## Definition of Done

- [x] AC-1 Top 10 lista forgalom szerint rendezve (meglévő)
- [x] AC-2 Partner adatok: név, forgalom, utolsó vásárlás, ajándék státusz
- [x] AC-3 Ajándék küszöb (default: 500.000 Ft) - DEFAULT_GIFT_THRESHOLD
- [x] TypeScript PASS
- [x] Widget látható STORE_MANAGER/ADMIN role-okkal (meglévő)
