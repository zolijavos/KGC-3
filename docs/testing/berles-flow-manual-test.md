# 🧪 Bérlési Folyamat - Manuális Tesztelési Útmutató

**Verzió:** 1.0
**Dátum:** 2026-01-30
**Böngésző:** Perplexity Comet (vagy bármely modern böngésző)
**Alkalmazás URL:** http://localhost:5173

---

## 📋 Előfeltételek

- [ ] Dev szerver fut (`pnpm dev`)
- [ ] Van teszt felhasználód (Pultos szerepkörrel)
- [ ] Van legalább 1 partner az adatbázisban
- [ ] Van legalább 1 bérgép "elérhető" státuszban

---

## 🔐 1. BEJELENTKEZÉS

| Lépés | Művelet                            | Elvárt Eredmény         |
| ----- | ---------------------------------- | ----------------------- |
| 1.1   | Nyisd meg: `http://localhost:5173` | Login oldal jelenik meg |
| 1.2   | Add meg: email + jelszó            | Mezők kitölthetők       |
| 1.3   | Kattints: **Bejelentkezés**        | Dashboard jelenik meg   |

**✅ Checkpoint:** Bejelentkezve, Dashboard látható

---

## 👤 2. PARTNER KIVÁLASZTÁSA (FR11)

| Lépés | Művelet                                | Elvárt Eredmény                     |
| ----- | -------------------------------------- | ----------------------------------- |
| 2.1   | Navigálj: **Bérlés** menüpont          | Bérlés oldal megnyílik              |
| 2.2   | Kattints: **Új bérlés** gomb           | Bérlés létrehozó form jelenik meg   |
| 2.3   | Kattints: **Partner keresés**          | Partner kereső modal nyílik         |
| 2.4   | Írd be: partner neve VAGY telefonszáma | Keresési találatok jelennek meg     |
| 2.5   | Válaszd ki a partnert kattintással     | Partner adatok betöltődnek a formba |

**✅ Checkpoint:** Partner neve látható a bérlés formon

**Meghatalmazott teszt (opcionális):**
| Lépés | Művelet | Elvárt Eredmény |
|-------|---------|-----------------|
| 2.6 | Ha van: Kattints **Meghatalmazott hozzáadása** | Meghatalmazott form jelenik meg |
| 2.7 | Töltsd ki a meghatalmazott adatait | Mezők validálódnak |

---

## 🔧 3. BÉRGÉP KIVÁLASZTÁSA (FR14, FR16)

| Lépés | Művelet                                                | Elvárt Eredmény                         |
| ----- | ------------------------------------------------------ | --------------------------------------- |
| 3.1   | Kattints: **Bérgép hozzáadása**                        | Bérgép kereső jelenik meg               |
| 3.2   | Válassz módszert: **QR kód** VAGY **Manuális keresés** |                                         |
| 3.3a  | (QR) Szkenneld be a bérgép QR kódját                   | Bérgép adatok automatikusan betöltődnek |
| 3.3b  | (Manuális) Írd be: bérgép kód/név                      | Keresési találatok jelennek meg         |
| 3.4   | Ellenőrizd a bérgép státuszát                          | Státusz: **Elérhető** (zöld)            |
| 3.5   | Kattints: **Kiválasztás**                              | Bérgép hozzáadódik a bérléshez          |

**Tartozékok ellenőrzése (FR16):**
| Lépés | Művelet | Elvárt Eredmény |
|-------|---------|-----------------|
| 3.6 | Ellenőrizd a tartozék listát | Töltő, akkumulátor, stb. látható |
| 3.7 | Pipáld ki a kiadott tartozékokat | Checkbox-ok bejelölhetők |

**✅ Checkpoint:** Bérgép + tartozékok listázva a formon

---

## 💰 4. BÉRLÉSI DÍJ ÉS KAUCIÓ (FR12, FR13)

| Lépés | Művelet                                    | Elvárt Eredmény                                 |
| ----- | ------------------------------------------ | ----------------------------------------------- |
| 4.1   | Add meg: **Tervezett visszahozatal dátum** | Dátumválasztó működik                           |
| 4.2   | Ellenőrizd: **Kalkulált bérlési díj**      | Automatikusan kiszámolódik (napi/heti/30 napos) |
| 4.3   | Add meg: **Kaució összeg**                 | Összeg mező kitölthető                          |
| 4.4   | Válaszd: **Kaució fizetési mód**           | Készpénz / Bankkártya opciók                    |

**Árazás ellenőrzése (FR12):**
| Időszak | Kalkuláció |
|---------|------------|
| 1-6 nap | Napi díj × napok száma |
| 7-29 nap | Heti díj × hetek + maradék napok |
| 30+ nap | Havi díj kalkuláció |

**✅ Checkpoint:** Díj és kaució összegek helyesen jelennek meg

---

## 📝 5. SZERZŐDÉS ELŐNÉZET

| Lépés | Művelet                          | Elvárt Eredmény                 |
| ----- | -------------------------------- | ------------------------------- |
| 5.1   | Kattints: **Szerződés előnézet** | PDF előnézet modal nyílik       |
| 5.2   | Ellenőrizd az adatokat           | Partner, bérgép, díjak helyesek |
| 5.3   | Zárd be az előnézetet            | Modal bezárul                   |

---

## ✅ 6. BÉRLÉS VÉGLEGESÍTÉSE (FR14)

| Lépés | Művelet                            | Elvárt Eredmény               |
| ----- | ---------------------------------- | ----------------------------- |
| 6.1   | Kattints: **Bérlés indítása** gomb | Megerősítő dialog jelenik meg |
| 6.2   | Ellenőrizd az összegzést           | Minden adat helyes            |
| 6.3   | Kattints: **Megerősítés**          | Bérlés létrejön               |
| 6.4   | Várd meg a visszajelzést           | Sikeres üzenet jelenik meg    |

**✅ Checkpoint:** Bérlés aktív, bérgép státusza: **Bérelt**

---

## 🔄 7. BÉRLÉS VISSZAVÉTEL TESZT (FR15, FR21)

| Lépés | Művelet                                  | Elvárt Eredmény           |
| ----- | ---------------------------------------- | ------------------------- |
| 7.1   | Navigálj: **Aktív bérlések**             | Lista jelenik meg         |
| 7.2   | Keresd meg az előbb létrehozott bérlést  | Bérlés látható a listában |
| 7.3   | Kattints: **Visszavétel** gomb           | Visszavételi form nyílik  |
| 7.4   | Ellenőrizd a tartozék checklistet (FR21) | Minden tartozék pipálható |
| 7.5   | Pipáld ki a visszahozott tartozékokat    | Checkbox-ok bejelölődnek  |

**Késedelmi díj teszt (FR15):**
| Lépés | Művelet | Elvárt Eredmény |
|-------|---------|-----------------|
| 7.6 | Ha késés van: Ellenőrizd a késedelmi díjat | Automatikusan kalkulálódik |
| 7.7 | Ellenőrizd a végösszegzést | Bérleti díj + késedelmi díj |

| Lépés | Művelet                                 | Elvárt Eredmény                    |
| ----- | --------------------------------------- | ---------------------------------- |
| 7.8   | Kattints: **Visszavétel véglegesítése** | Megerősítő dialog                  |
| 7.9   | Kattints: **Megerősítés**               | Bérlés lezárva                     |
| 7.10  | Ellenőrizd a bérgép státuszát           | Státusz: **Elérhető** (visszaállt) |

**✅ Checkpoint:** Bérlés lezárva, bérgép újra elérhető

---

## 🔧 8. SZERVIZBE KÜLDÉS TESZT (FR17, FR20) - Opcionális

| Lépés | Művelet                                            | Elvárt Eredmény          |
| ----- | -------------------------------------------------- | ------------------------ |
| 8.1   | A visszavételnél: Jelöld meg **Szerviz szükséges** | Checkbox/gomb elérhető   |
| 8.2   | Kattints: **Munkalap létrehozása**                 | Munkalap form nyílik     |
| 8.3   | Add meg: probléma leírás                           | Szöveges mező kitölthető |
| 8.4   | Mentsd el a munkalapot                             | Munkalap létrejön        |
| 8.5   | Ellenőrizd a bérgép státuszát                      | Státusz: **Szervizben**  |

---

## 📊 TESZT ÖSSZEGZÉS

### Sikeres teszt kritériumok:

| #   | Funkció                           | FR   | Eredmény       |
| --- | --------------------------------- | ---- | -------------- |
| 1   | Bérlés létrehozás                 | FR11 | ⬜ Pass / Fail |
| 2   | Díj kalkuláció                    | FR12 | ⬜ Pass / Fail |
| 3   | Kaució kezelés                    | FR13 | ⬜ Pass / Fail |
| 4   | Bérgép kiadás (státusz váltás)    | FR14 | ⬜ Pass / Fail |
| 5   | Visszavétel + késedelmi díj       | FR15 | ⬜ Pass / Fail |
| 6   | Tartozék tracking                 | FR16 | ⬜ Pass / Fail |
| 7   | Szerviz munkalap létrehozás       | FR17 | ⬜ Pass / Fail |
| 8   | Tartozék checklist visszavételkor | FR21 | ⬜ Pass / Fail |

### Megjegyzések:

```
Írj ide bármilyen észrevételt, hibát vagy javaslatot:

_________________________________________________

_________________________________________________

_________________________________________________
```

---

## 🐛 Hiba Bejelentés Formátum

Ha hibát találsz, rögzítsd így:

```markdown
**Hiba:** [rövid leírás]
**Lépés:** [melyik lépésnél történt]
**Elvárt:** [mit vártál]
**Aktuális:** [mi történt]
**Screenshot:** [ha van]
```

---

## 🎥 Képernyő Felvétel Tipp

A Perplexity Comet-ben vagy más böngészőben:

1. **F12** → DevTools megnyitása
2. **Network tab** → Figyeld az API hívásokat
3. **Console tab** → Figyeld a hibákat
4. **Böngésző screenshot:** `Ctrl+Shift+S` (Firefox) vagy `Ctrl+Shift+P` → "screenshot" (Chrome)

---

_Készítette: TEA Agent (Master Test Architect) - BMAD Method_
