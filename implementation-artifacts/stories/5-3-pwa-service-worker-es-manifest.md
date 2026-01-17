# Story 5.3: PWA Service Worker és Manifest

## Status: in-progress

## User Story

**As a** felhasználó,
**I want** PWA-ként telepíteni az alkalmazást,
**So that** app-szerű élményt kapjak.

## Acceptance Criteria

- [ ] AC1: PWA manifest.json konfigurálva (name, icons, theme_color, display)
- [ ] AC2: Service Worker regisztráció hook (useServiceWorker)
- [ ] AC3: "Add to Home Screen" prompt kezelése (useInstallPrompt)
- [ ] AC4: Offline shell működik (fallback page)
- [ ] AC5: Update notification (új verzió elérhető)
- [ ] AC6: Service Worker lifecycle management (install, activate, update)

## Technical Context

**Package:** @kgc/ui
**Note:** A @kgc/ui package PWA utility hook-okat biztosít. A tényleges manifest.json és service worker fájlok az alkalmazás szinten (apps/kgc-web) lesznek. Ez a story a PWA infrastruktúra hook-okat és utility-ket implementálja.

**Dependencies:**
- Workbox (opcionális, később integrálható)

**Related Files:**
- packages/shared/ui/src/hooks/use-service-worker.ts
- packages/shared/ui/src/hooks/use-install-prompt.ts
- packages/shared/ui/src/hooks/use-online-status.ts
- packages/shared/ui/src/components/pwa/update-prompt.tsx
- packages/shared/ui/src/components/pwa/install-prompt.tsx
- packages/shared/ui/src/components/pwa/offline-indicator.tsx

## Tasks

1. [ ] Create useOnlineStatus hook (online/offline detection)
2. [ ] Create useServiceWorker hook (SW registration, updates)
3. [ ] Create useInstallPrompt hook (PWA install prompt)
4. [ ] Create OfflineIndicator component
5. [ ] Create UpdatePrompt component (new version available)
6. [ ] Create InstallPrompt component (add to home screen)
7. [ ] Write unit tests with mocked navigator/window APIs
8. [ ] Export all from index.ts

## Test Plan

- Unit tests: Vitest with mocked navigator.serviceWorker
- Test files: tests/hooks/use-*.spec.ts, tests/components/pwa/*.spec.tsx
- Coverage target: 80%+

## Notes

- Service Worker APIs are mocked in tests
- Install prompt (beforeinstallprompt event) is browser-specific
- Online/offline detection via navigator.onLine and online/offline events

## Changelog

- 2026-01-16: Story created (ready-for-dev)
- 2026-01-16: Implementation started (in-progress)
