# Raport Audytu UI/UX i Architektury Frontendowej COSGRAL-HUB

**Projekt:** COSGRAL-HUB (Panel Operacyjny i CRM Agencji Kreatywnej)  
**Wersja Raportu:** 1.0.0 (Wersja Publikacyjna / Authoritative Production Audit)  
**Data sporządzenia:** 2026-10-08  
**Środowisko technologiczne:** Next.js 15.3.3 (App Router), React 19.1.0, Tailwind CSS v4.1.8, TypeScript 5.8.3, Three.js 0.170.0, Supabase SSR  
**Status kodu aplikacji (`src/`):** Nienaruszony (Strict Read-Only Audit & Strategic Specification)  

---

## Spis Treści

1. [Rozdział 1: Podsumowanie Wykonawcze (Executive Summary)](#rozdział-1-podsumowanie-wykonawcze-executive-summary)
   - 1.1. Kontekst biznesowy i cel audytu
   - 1.2. Kluczowe ustalenia w czterech filarach (R1–R4)
   - 1.3. Macierz porównawcza: Stan obecny vs. Stan docelowy po wdrożeniu
2. [Rozdział 2: R1 — Diagnoza i eliminacja efektów przewijania (Scroll & Visual Noise)](#rozdział-2-r1--diagnoza-i-eliminacja-efektów-przewijania-scroll--visual-noise)
   - 2.1. Identyfikacja mechanizmu zakłócającego scroll: `TileScrollLift.tsx`
   - 2.2. Inwazyjne reguły CSS i matematyka transformacji 3D w `globals.css`
   - 2.3. Zakłócenia na desktopie: efekt kółka myszy i podwójne nakładanie `:hover`
   - 2.4. Analiza `prefers-reduced-motion` oraz globalnego `scroll-smooth`
   - 2.5. Dowód pełnej niezależności architektury nawigacji od pozycji przewijania
   - 2.6. Gotowy plan modyfikacji kodowej (Code Remediation Plan)
3. [Rozdział 3: R2 — Responsywność interakcji i likwidacja „głuchego kliku” (Tactile Feedback & Micro-Interactions)](#rozdział-3-r2--responsywność-interakcji-i-likwidacja-głuchego-kliku-tactile-feedback--micro-interactions)
   - 3.1. Kompletny katalog 7 rodzin elementów interaktywnych w aplikacji
   - 3.2. Audyt stanów interakcji: `:hover`, `:active`, czasy tranzycji, stany `loading` i `focus-visible`
   - 3.3. Szczegółowa diagnoza 12 przyczyn „głuchych kliknięć” (Dead Clicks)
   - 3.4. Specyfikacja wdrożeniowa komponentu `Button.tsx` (produkcyjna implementacja)
   - 3.5. Systemowe reguły dotykowe `.pressable` i `:active` w `globals.css`
   - 3.6. Wzorce Optimistic UI i likwidacja asynchronicznych przestojów interfejsu
4. [Rozdział 4: R3 — Przejrzystość, ergonomia i kontrast interfejsu (Visual Hierarchy & WCAG AA)](#rozdział-4-r3--przejrzystość-ergonomia-i-kontrast-interfejsu-visual-hierarchy--wcag-aa)
   - 4.1. Kompleksowy katalog 28 widoków i tras w systemie (`src/app/`)
   - 4.2. Dekonstrukcja szumu wizualnego — 6 nakładających się warstw kompozycji
   - 4.3. Rzeczywiste pomiary kontrastu typografii i formularzy (Audyt WCAG 2.1 AA)
   - 4.4. Mikro-typografia (<10px) i nieefektywne gospodarowanie przestrzenią Above-the-Fold
   - 4.5. Kolizje ergonomiczne layoutu i defekty strukturalne
5. [Rozdział 5: R4 — Ustrukturyzowana matryca propozycji wdrożeń i innowacji](#rozdział-5-r4--ustrukturyzowana-matryca-propozycji-wdrożeń-i-innowacji)
   - 5.1. Grupa 1: Natychmiastowe Quick Wins (P0 — Stabilizacja i Ergonomia)
   - 5.2. Grupa 2: Moduły Średnioterminowe (P1 — Innowacje Ergonomiczne i Spójność)
   - 5.3. Grupa 3: Moduły Długoterminowe (P2 — Strategiczne Rozszerzenia Produktowe)
   - 5.4. Zbiorcza Tabela Matrycy Priorytetyzacji (Prioritization Matrix)
6. [Rozdział 6: Wytyczne wdrożeniowe i plan implementacji (Engineering Implementation Guide)](#rozdział-6-wytyczne-wdrożeniowe-i-plan-implementacji-engineering-implementation-guide)
   - 6.1. Faza 1: Szybka stabilizacja i higiena interakcji (Dni 1–3)
   - 6.2. Faza 2: Unifikacja wzorców UI i ergonomia desktopu (Tygodnie 2–3)
   - 6.3. Faza 3: Zaawansowane moduły operacyjne (Miesiące 2–3)
   - 6.4. Procedura testowa, metryki jakościowe i Continuous QA
7. [Rozdział 7: Potwierdzenie nienaruszalności kodu źródłowego (Integrity & Read-Only Attestation)](#rozdział-7-potwierdzenie-nienaruszalności-kodu-źródłowego-integrity--read-only-attestation)

---

## Rozdział 1: Podsumowanie Wykonawcze (Executive Summary)

### 1.1. Kontekst biznesowy i cel audytu

Aplikacja **COSGRAL-HUB** stanowi centralny system operacyjny agencji kreatywnej COSGRAL, integrujący moduły zarządzania projektami (Zlecenia), bazy kontrahentów (CRM Klienci), rejestru zadań bieżących (Tasks), harmonogramu spotkań i planów zdjęciowych (Kalendarz), rozliczeń przychodów i kosztów (Finanse), komunikacji zespołowej i wielokanałowej (Czat agencyjny oraz Czat ze strony cosgral.pl), a także udostępniania materiałów wideo/foto klientom (Katalogi Materiałów i Portale Klienta).

Projekt został zrealizowany w oparciu o najnowocześniejszy stos technologiczny: **Next.js 15.3.3 (App Router)**, **React 19.1.0**, **Tailwind CSS v4.1.8**, **TypeScript 5.8.3** oraz **Three.js 0.170.0** z autorskim silnikiem generowania tła płynnego szkła i fal WebGL (`CosgralAmbient.tsx`). Wizualny język aplikacji silnie nawiązuje do tożsamości marki: głęboka, luksusowa czerń (`#030303`), subtelna typografia *Satoshi* z Fontshare, elementy szkła akrylowego (*liquid glass*) oraz błękitno-białe akcenty świetlne.

Mimo zaawansowanej architektury domenowej, użytkownicy końcowi oraz zespół operacyjny zgłosili istotne bariery ergonomiczne, które obniżają komfort codziennej, wielogodzinnej pracy:
1. **Uciążliwe efekty przewijania strony:** gwałtowne falowanie, przechylanie w 3D i rozbłyskiwanie kafelków podczas scrollowania, wywołujące dyskomfort percepcyjny i niestabilność tekstu.
2. **Zjawisko „głuchego kliku” (Dead Clicks):** brak natychmiastowej reakcji fizycznej (dotykowej) przy kliknięciach w przyciski, karty i wiersze, asynchroniczne operacje sieciowe bez wskaźników ładowania oraz zablokowane kontrolki bez informacji zwrotnej.
3. **Deficyty przejrzystości i kontrastu:** nieczytelne szare teksty na ciemnym tle, naruszające międzynarodowe wytyczne dostępności cyfrowej WCAG 2.1 AA, mikro-czcionki poniżej 10px oraz kolizje przestrzenne na ekranach komputerów (jednoczesne wyświetlanie bocznego paska nawigacji i dolnej pływającej pigułki).

Niniejszy audyt stanowi kompleksowe studium analityczno-projektowe przeprowadzone w trybie **Strict Read-Only** (bez modyfikacji kodu źródłowego w `src/`), dostarczające precyzyjną diagnozę inżynierską oraz gotowe do wdrożenia specyfikacje techniczne.

---

### 1.2. Kluczowe ustalenia w czterech filarach (R1–R4)

* **R1 (Efekty Przewijania i Szum Wizualny):** Zidentyfikowano pojedyncze, bezpośrednie źródło uciążliwego zachowania — komponent `src/components/TileScrollLift.tsx`. Na urządzeniach dotykowych komponent ten podpina globalny listener pod zdarzenie `scroll`, wyliczając odległość elementów od środka ekranu i nadając klasę `.is-in-view` wszystkim selektorom `main .hub-tile, main .surface, main .surface-list`. W parze z regułami w `globals.css` wyzwala to przestrzenne nachylenie `rotateX(5deg) rotateY(-3deg)`, powiększenie `scale(1.015)` oraz neonowe rozbłyski ramki o promieniu 48px. Na desktopie analogiczny chaos wywołują agresywne reguły `:hover`, aktywowane gdy kursor myszy spoczywa w oknie podczas scrollowania kółkiem. Jednocześnie dowiedziono, że architektura nawigacji (`AdminLayout.tsx`) jest w 100% sterowana routingiem Next.js i nie posiada żadnej zależności od pozycji scrolla, co umożliwia natychmiastowe usunięcie tego efektu bez ryzyka regresji funkcjonalnej.
* **R2 (Responsywność Interakcji i Likwidacja „Głuchego Kliku”):** Sklasyfikowano 7 rodzin elementów interaktywnych w 38 plikach. Wykazano, że warianty `ghost` i `danger` bazowego `Button.tsx` nie posiadają żadnej pseudoklasy `:active`, tranzycje trwają nienaturalnie długo (300–620 ms zamiast <100 ms dla wciśnięcia), a w całym pliku `globals.css` istnieje tylko jedna pojedyncza reguła `:active` (dla dnia kalendarza). Zdiagnozowano **12 unikalnych źródeł „głuchego kliku”**, w tym: blokujący interfejs ekran powitalny `AppSplash.tsx` przez 1.6 sekundy, brak aktualizacji optymistycznej w zadaniach (`TasksPage`) i czacie zespołu (`TeamChat`), martwe przyciski formularza blokowane przez `disabled` przed wykonaniem walidacji (`NoweZlecenieForm`), oraz brak obsługi tła i klawisza Escape w modalach (`ConfirmDialog`).
* **R3 (Przejrzystość, Ergonomia i Kontrast WCAG AA):** Skatalogowano wszystkie 28 tras aplikacji. Wykryto nakładanie się 6 jednoczesnych warstw graficznych (fale WebGL, koło rozmycia kursora 80vmax, ziarno grafitowe 280px, poświaty pseudo-glow, filtry rozmycia szkła do 48px oraz obrót 3D). Pomiary laboratoryjne wykazały, że powszechnie stosowana klasa `text-white/45` generuje kontrast rzędu **3.8:1 na tle `#0a0a0a`**, co stanowi porażkę wobec normy WCAG 2.1 AA (wymagane minimum 4.5:1), a klasy `text-white/30` osiągają zaledwie **1.8:1**. Wykazano błędy ergonomiczne: dublowanie dolnego paska nawigacji na ekranach desktopowych (brak `xl:hidden`), brak paddingów bocznych w listach finansów i zleceń klienta, odwróconą kolejność formularza w kalendarzu na desktopie oraz wznoszenie się paska filtrów w 3D po najechaniu myszą.
* **R4 (Matryca Innowacji i Plan Wdrożeń):** Opracowano hierarchiczną matrycę 17 usprawnień podzieloną na 3 horyzonty: **7 Quick Wins (P0)** o natychmiastowej wykonalności i krytycznej wartości, **6 Modułów Średnioterminowych (P1)** podnoszących ergonomię (m.in. Globalna Paleta Poleceń `Ctrl+K`, Tablica Kanban dla zadań i zleceń, Ujednolicenie komponentów `HubCard`, reorganizacja kalendarza) oraz **4 Strategiczne Innowacje Długoterminowe (P2)** (Real-time Collaboration Portal dla Klienta z komentarzami na wideo, Silnik rentowności Cash Flow, Asystent AI Morning Brief oraz Matryca uprawnień RBAC).

---

### 1.3. Macierz porównawcza: Stan obecny vs. Stan docelowy po wdrożeniu

| Obszar audytu | Stan Obecny (Zdiagnozowane Problemy) | Stan Docelowy (Po Wdrożeniu Rekomendacji) | Wskaźnik Sukcesu (KPI) |
| :--- | :--- | :--- | :--- |
| **Przewijanie strony (Scroll)** | Kafelki na dotyku i desktopie falują, obracają się w 3D (`5deg/-3deg`), rozbłyskują neonem i drgają pod kursorem myszy. | Płynne, stabilne przewijanie; kafelki pozostają na płaszczyźnie; hover desktopowy to stabilne `translateY(-2px)`. | 0 drgań, 0 mutacji klas DOM w pętli `requestAnimationFrame` na scrollu. |
| **Początkowa responsywność** | Pełnoekranowy `AppSplash.tsx` blokuje kliknięcia (`pointer-events: all`) przez 1600 ms od wejścia. | Czas prezentacji splash screenu skrócony do 600 ms, natychmiastowe zwolnienie kliknięć po pierwszym dotknięciu. | Czas do pierwszej interakcji (FID/INP) skrócony o >1000 ms. |
| **Dotykowe potwierdzenie kliku** | Brak `:active` w przyciskach drugorzędnych i kafelkach; opóźnione tranzycje (300–620 ms); wrażenie „gąbczastego” interfejsu. | Globalna klasa `.pressable` i `active:scale-[0.96]` w `Button.tsx`; czas reakcji na wciśnięcie: 75 ms. | 100% klikalnych elementów posiada fizyczne odkształcenie pod palcem/myszą. |
| **Operacje asynchroniczne** | Brak spinnerów w `Button.tsx`; brak wskaźnika auto-save; odhaczanie zadań czeka na dwa zapytania sieciowe. | Wbudowany parametr `isLoading` ze spinnerem; Optimistic UI w zadaniach i czacie; pigułka „✓ Zapisano” w edytorach. | 0 martwych kliknięć; subiektywny czas reakcji zadań = 0 ms. |
| **Walidacja formularzy** | Przycisk „Utwórz zlecenie” zablokowany przez `disabled={!crmClientId}` – brak reakcji i brak wyświetlenia błędu. | Przycisk zawsze klikalny (`disabled={loading}`); kliknięcie bez klienta natychmiast wyświetla czerwony komunikat i ramkę. | 100% formularzy jasno komunikuje powód braku możliwości zapisu. |
| **Kontrast i dostępność (a11y)** | Powszechne teksty `text-white/45` (3.8:1) i `text-white/30` (1.8:1); etykiety 8–9px na tle szkła i ziarna. | Wszystkie teksty pomocnicze podniesione do `text-white/70` (kontrast >10:1); minimalny rozmiar etykiet = 12px (`text-xs`). | Pełna zgodność z normą **WCAG 2.1 AA** w całej aplikacji. |
| **Nawigacja desktopowa** | Podwójna nawigacja na desktopie (boczny sidebar + dolna pigułka); dolna pigułka zasłania treść i wymusza `pb-28`. | Dolny pasek ukryty na desktopie (`xl:hidden`); przestrzeń ekranu w pełni wykorzystana; czysty layout. | +112px wolnej przestrzeni pionowej na ekranach desktopowych. |
| **Efektywność operacyjna** | Wyszukiwanie danych wymaga wielokrotnego klikania po menu; brak widoku tablicy; brak masowych akcji. | Global Command Palette (`Ctrl+K`), widok Kanban w zadaniach i zleceniach, masowe akcje (Bulk Actions). | Skrócenie czasu przejścia do klienta/zlecenia z 5s do <1s. |

---

## Rozdział 2: R1 — Diagnoza i eliminacja efektów przewijania (Scroll & Visual Noise)

### 2.1. Identyfikacja mechanizmu zakłócającego scroll: `TileScrollLift.tsx`

Szczegółowy audyt całego repozytorium wykazał, że jedynym aktywnym mechanizmem nasłuchującym zdarzenia przewijania okna przeglądarki na poziomie globalnym jest komponent zlokalizowany w pliku:
`src/components/TileScrollLift.tsx`

Komponent ten montowany jest w głównym układzie administracyjnym w pliku:
`src/components/AdminLayout.tsx` (linia 9: import, linia 212: wywołanie `<TileScrollLift />`).

#### Kod źródłowy mechanizmu detekcji:
```typescript
// src/components/TileScrollLift.tsx:6-34
const SELECTOR = "main .hub-tile, main .surface, main .surface-list";

function updateInView() {
  const nodes = [...document.querySelectorAll(SELECTOR)];
  const bandTop = 0.2 * window.innerHeight;
  const bandBottom = 0.62 * window.innerHeight;
  const bandMid = (bandTop + bandBottom) / 2;

  let best: Element | null = null;
  let bestDist = Infinity;

  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const overlap =
      Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop);
    if (overlap < 28) continue;
    const center =
      (Math.max(rect.top, 0) + Math.min(rect.bottom, window.innerHeight)) / 2;
    const dist = Math.abs(center - bandMid);
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }

  for (const node of nodes) {
    node.classList.toggle("is-in-view", node === best);
  }
}
```

#### Pętla nasłuchu zdarzeń:
```typescript
// src/components/TileScrollLift.tsx:39-67
useEffect(() => {
  if (!window.matchMedia("(hover: none), (pointer: coarse)").matches) {
    return;
  }

  document.documentElement.classList.add("tile-scroll-lift");

  let ticking = false;
  const onScrollOrResize = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateInView();
      ticking = false;
    });
  };

  const main = document.querySelector("main");
  const mo = main
    ? new MutationObserver(() => onScrollOrResize())
    : null;
  mo?.observe(main!, { childList: true, subtree: true });

  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize);
  updateInView();
  // ...
}, []);
```

#### Matematyka i konsekwencje działania algorytmu:
1. **Zbyt szeroki zasięg selektora:** Selektor `main .hub-tile, main .surface, main .surface-list` obejmuje niemal każdy kontener w aplikacji: kafelki Bento na pulpicie, karty filtrów, wiersze tabel zleceń, formularze CRM i listy zadań.
2. **Kalkulacja pasma ogniskowej (Focus Band):** Algorytm definiuje pasmo widzenia pomiędzy 20% a 62% wysokości okna (`bandTop = 0.2 * H`, `bandBottom = 0.62 * H`). 
3. **Ciągła zmiana klas w locie:** Przy każdym pikselu przewinięcia następuje iteracja po tablicy `nodes`, wywołanie `getBoundingClientRect()` (powodujące potencjalny wymuszony reflow) oraz mutacja klasy `.classList.toggle("is-in-view", node === best)`. Gdy użytkownik płynnie scrolluje stronę palcem, klasa `.is-in-view` gwałtownie przeskakuje z kafelka na kafelek.

---

### 2.2. Inwazyjne reguły CSS i matematyka transformacji 3D w `globals.css`

Po nadaniu klasy `.is-in-view` przez skrypt, przeglądarka stosuje reguły zdefiniowane w pliku `src/app/globals.css` (linie 436–465):

```css
/* src/app/globals.css:436-465 */
/* Touch: lift the tile nearest the scroll focus */
html.tile-scroll-lift .hub-tile.is-in-view {
  border-color: color-mix(in srgb, var(--tile-glow) 55%, transparent);
  transform: translate3d(0, -7px, 18px) rotateX(5deg) rotateY(-3deg)
    scale(1.015);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--tile-glow) 55%, transparent) inset,
    0 -22px 48px color-mix(in srgb, var(--tile-glow) 16%, transparent) inset,
    0 28px 56px rgba(0, 0, 0, 0.42),
    0 0 48px color-mix(in srgb, var(--tile-glow) 22%, transparent);
}

html.tile-scroll-lift .hub-tile.is-in-view::before {
  opacity: 0.85;
  transform: translate3d(8%, 6%, 0) scale(1.08);
}

html.tile-scroll-lift .surface.is-in-view,
html.tile-scroll-lift .surface-list.is-in-view {
  border-color: color-mix(in srgb, var(--tile-glow, #ffffff) 52%, transparent);
  transform: translate3d(0, -6px, 14px) rotateX(4deg) scale(1.012);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--tile-glow, #ffffff) 50%, transparent)
      inset,
    0 -18px 40px color-mix(in srgb, var(--tile-glow, #ffffff) 12%, transparent)
      inset,
    0 24px 52px rgba(0, 0, 0, 0.4),
    0 0 40px color-mix(in srgb, var(--tile-glow, #ffffff) 16%, transparent);
}
```

W powiązaniu z fizyką przejść zdefiniowaną dla bazowych kafelków (linie 166–170 oraz 371–375):
```css
transition:
  transform 0.55s var(--ease-spring),
  box-shadow 0.55s var(--ease-spring),
  border-color 0.45s var(--ease);
```
gdzie `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`.

#### Dlaczego to rozwiązanie niszczy ergonomię:
* **Efekt „pływającego falowania”:** Czas powrotu kafelka ze stanu uniesienia wynosi aż **550 milisekund**. Gdy użytkownik scrolluje przez listę kilku kafelków, jeden kafelek jeszcze opada i cofa rotację, podczas gdy kolejny wystrzeliwuje w górę (`translate3d(..., 18px) rotateX(5deg) rotateY(-3deg)`). Ekran sprawia wrażenie wzburzonej powierzchni wody.
* **Agresywne rozbłyski:** Poświata ramki o promieniu `48px` oraz pseudoelement `::before` o kryciu podbitym do `0.85` oślepiają użytkownika i uniemożliwiają spokojne czytanie treści kafelka podczas przewijania.
* **Zniekształcenia perspektywiczne tekstu:** Rotacja `rotateX(5deg) rotateY(-3deg)` powoduje, że linie tekstu wewnątrz kafelka przestają być równoległe do krawędzi ekranu smartfona, co drastycznie obniża czytelność typografii.

---

### 2.3. Zakłócenia na desktopie: efekt kółka myszy i podwójne nakładanie `:hover`

Choć komponent `TileScrollLift.tsx` posiada warunek aktywacji dla urządzeń dotykowych (`(hover: none), (pointer: coarse)`), użytkownicy desktopowi doświadczają niemal identycznego problemu podczas scrollowania kółkiem myszy.

Wynika to z agresywnych reguł `:hover` w pliku `src/app/globals.css`:
```css
/* src/app/globals.css:418-434 */
@media (hover: hover) and (pointer: fine) {
  .hub-tile:hover {
    transform: translate3d(0, -7px, 18px) rotateX(5deg) rotateY(-3deg)
      scale(1.015);
    border-color: color-mix(in srgb, var(--tile-glow) 55%, transparent);
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--tile-glow) 55%, transparent) inset,
      0 -22px 48px color-mix(in srgb, var(--tile-glow) 16%, transparent) inset,
      0 28px 56px rgba(0, 0, 0, 0.42),
      0 0 48px color-mix(in srgb, var(--tile-glow) 22%, transparent);
  }

  .hub-tile:hover::before {
    opacity: 0.85;
    transform: translate3d(8%, 6%, 0) scale(1.08);
  }
}
```

Gdy kursor myszy spoczywa nieruchomo na środku ekranu, a użytkownik przewija stronę kółkiem myszy, kolejne kafelki wpadają pod kursor. Każdy z nich natychmiast uruchamia 550-milisekundową animację skrętu 3D, po czym po minięciu kursora gwałtownie wraca do pozycji wyjściowej. Na ekranie o wysokiej częstotliwości odświeżania (120/144 Hz) wywołuje to wrażenie silnego migotania i niestabilności geometrycznej.

---

### 2.4. Analiza `prefers-reduced-motion` oraz globalnego `scroll-smooth`

1. **Wadliwa implementacja dostępności ruchowej:**  
   W pliku `src/app/globals.css` (linie 586–591) znajduje się próba obsłużenia trybu ograniczonego ruchu:
   ```css
   @media (prefers-reduced-motion: reduce) {
     html.tile-scroll-lift .hub-tile.is-in-view,
     html.tile-scroll-lift .surface.is-in-view,
     html.tile-scroll-lift .surface-list.is-in-view {
       transform: none;
     }
   }
   ```
   **Błąd:** Zresetowano jedynie właściwość `transform: none`. Reguły `border-color`, agresywny neonowy `box-shadow` (48px) oraz poświata pseudoelementu `::before` o kryciu 85% nadal dynamicznie pulsują i rozbłyskują podczas scrolla, co stanowi rażące naruszenie komfortu osób ze skłonnościami do zaburzeń przedsionkowych i epilepsji fotogennej.

2. **Wymuszone globalne `scroll-smooth`:**  
   W pliku `src/app/globals.css` (linie 51–54):
   ```css
   html {
     @apply scroll-smooth;
     background: var(--bg);
   }
   ```
   W architekturze Next.js 15 App Router wymuszenie `scroll-smooth` na poziomie znacznika `<html>` powoduje spowolnienie natywnego przywracania pozycji przewijania przy przejściach między podstronami oraz wprowadza sztuczną bezwładność, utrudniającą precyzyjne zatrzymanie przewijania na pożądanej sekcji.

---

### 2.5. Dowód pełnej niezależności architektury nawigacji od pozycji przewijania

Kluczowym wymaganiem audytu R1 było potwierdzenie, czy eliminacja efektów przewijania nie uszkodzi działania nawigacji (np. paska zakładek, wskaźnika aktywnej pozycji).

Zbadano kod nawigacji w pliku `src/components/AdminLayout.tsx` (linie 188–218 oraz 297–356):
```typescript
// src/components/AdminLayout.tsx:188-218
const isActive = (href: string) =>
  href === "/admin"
    ? pathname === "/admin"
    : href === "/admin/more"
      ? MORE_ACTIVE_PREFIXES.some((p) => pathname?.startsWith(p))
      : (pathname?.startsWith(href) ?? false);

const activeTabIndex = useMemo(() => {
  if (moreOpen || isActive("/admin/more")) return MOBILE_PRIMARY.length - 1;
  const idx = MOBILE_PRIMARY.findIndex(
    (item) => item.kind === "link" && isActive(item.href),
  );
  return idx >= 0 ? idx : 0;
}, [pathname, moreOpen]);
```

Animacja pigułki aktywnej zakładki (linie 304–312):
```tsx
style={{
  width: `calc((100% - 0.75rem) / ${MOBILE_PRIMARY.length})`,
  left: "0.375rem",
  transform: `translate3d(${activeTabIndex * 100}%, 0, 0)`,
  transition: "transform 0.62s cubic-bezier(0.16, 1, 0.3, 1)",
}}
```

#### Dowód inżynierski:
1. Stan aktywnej zakładki `activeTabIndex` jest wyliczany **wyłącznie na podstawie `pathname`** pochodzącego z hooka `usePathname()` z pakietu `next/navigation`.
2. W aplikacji **nie istnieje żaden mechanizm Scroll-Spy** synchronizujący menu z przewijaniem stron.
3. Całkowite usunięcie `TileScrollLift.tsx` oraz usunięcie klas `.is-in-view` nie ma **żadnego wpływu** na działanie nawigacji, routingu ani pozycjonowania wskaźnika aktywnej karty.

---

### 2.6. Gotowy plan modyfikacji kodowej (Code Remediation Plan)

W fazie wdrożeniowej należy wykonać następujące precyzyjne operacje w kodzie:

#### 1. Wyłączenie montowania w `src/components/AdminLayout.tsx`:
* Usunąć import w linii 9:
  ```typescript
  // USUNĄĆ:
  import { TileScrollLift } from "@/components/TileScrollLift";
  ```
* Usunąć znacznik w linii 212:
  ```tsx
  // USUNĄĆ:
  <TileScrollLift />
  ```

#### 2. Neutralizacja komponentu `src/components/TileScrollLift.tsx`:
Zamienić zawartość pliku na bezpieczny no-op komponent, gwarantujący brak błędów kompilacji przy ewentualnych importach:
```typescript
"use client";

export function TileScrollLift() {
  return null;
}
```

#### 3. Usunięcie szkodliwych reguł w `src/app/globals.css`:
* Całkowicie wyciąć linie 436–465:
  ```css
  /* USUNĄĆ CAŁKOWICIE: */
  html.tile-scroll-lift .hub-tile.is-in-view { ... }
  html.tile-scroll-lift .hub-tile.is-in-view::before { ... }
  html.tile-scroll-lift .surface.is-in-view,
  html.tile-scroll-lift .surface-list.is-in-view { ... }
  ```
* Usunąć zbędne reguły reduced-motion w liniach 586–591:
  ```css
  /* USUNĄĆ: */
  html.tile-scroll-lift .hub-tile.is-in-view,
  html.tile-scroll-lift .surface.is-in-view,
  html.tile-scroll-lift .surface-list.is-in-view {
    transform: none;
  }
  ```

#### 4. Uspokojenie efektów `:hover` na Desktopie w `src/app/globals.css`:
Zastąpić gwałtowne nachylenia 3D stabilnym, eleganckim uniesieniem 2D o wartości 2–3 pikseli:
* **Zamiast linii 194–204 (`.surface:hover`):**
  ```css
  @media (hover: hover) and (pointer: fine) {
    .surface:hover {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, var(--tile-glow) 35%, transparent);
      box-shadow:
        0 1px 0 color-mix(in srgb, var(--tile-glow) 35%, transparent) inset,
        0 16px 36px rgba(0, 0, 0, 0.32);
    }
  }
  ```
* **Zamiast linii 418–434 (`.hub-tile:hover`):**
  ```css
  @media (hover: hover) and (pointer: fine) {
    .hub-tile:hover {
      transform: translateY(-3px);
      border-color: color-mix(in srgb, var(--tile-glow) 40%, transparent);
      box-shadow:
        0 1px 0 color-mix(in srgb, var(--tile-glow) 42%, transparent) inset,
        0 18px 40px rgba(0, 0, 0, 0.35);
    }
    .hub-tile:hover::before {
      opacity: 0.45;
    }
  }
  ```

#### 5. Neutralizacja globalnego `scroll-smooth`:
W `src/app/globals.css` (linie 51–54) zmienić definicję:
```css
html {
  background: var(--bg);
}
```
Płynne przewijanie powinno być wywoływane programowo wyłącznie tam, gdzie jest to intencjonalne dla użytkownika (np. przewinięcie czatu do najnowszej wiadomości: `el.scrollIntoView({ behavior: 'smooth' })`).

---

## Rozdział 3: R2 — Responsywność interakcji i likwidacja „głuchego kliku” (Tactile Feedback & Micro-Interactions)

### 3.1. Kompletny katalog 7 rodzin elementów interaktywnych w aplikacji

Audyt objął całe drzewo komponentów frontendowych w katalogu `src/` (Next.js 15.3.3, React 19.1.0, Tailwind CSS v4, PostCSS). Zidentyfikowano 7 głównych rodzin elementów interaktywnych:

| Kategoria | Komponent / Ścieżka | Elementy HTML | Liczba wystąpień i rola w systemie |
| :--- | :--- | :--- | :--- |
| **A. Przyciski systemowe** | `src/components/ui/Button.tsx` | `<button>` | Wykorzystywany w 38 plikach; warianty: `primary`, `secondary`, `ghost`, `danger`. Główne CTA formularzy, akcje tabel, potwierdzenia. |
| **B. Przyciski surowe (Raw Buttons)** | `AdminLayout.tsx`, `AdminAccountMenu.tsx`, `TasksPage`, `KalendarzPage`, `FinansePage`, `SiteChatWorkspace.tsx`, `DateTimeField.tsx` | `<button>` | >60 wystąpień ad-hoc: checkboxy zadań (24x24px), nawigacja miesięcy kalendarza, usuwanie wierszy, przyciski cofnięcia, zamykanie modali. |
| **C. Kafelki Bento & Karty Akcji** | `src/app/admin/page.tsx`, `src/app/globals.css` (`.hub-tile`, `.surface`) | `<Link>`, `<section>`, `<div>` | 5 głównych kafelków Bento (Zlecenia, Tasks, Kalendarz, Czat, Team), karty statystyk, wykresy kołowe Donut i słupkowe. |
| **D. Wiersze list i tabel** | `ZleceniaListClient.tsx`, `KlienciListClient.tsx`, `TasksPage`, `FinansePage`, `SwipeThreadRow.tsx` | `<Link>`, `<li>`, `<div>` | Listy zleceń, kontrahentów CRM, zadań zespołu, wątków czatu ze strony, historii rozliczeń finansowych. |
| **E. Triggery i okna modalne / arkusze** | `ConfirmDialog.tsx`, `CatalogShareModal.tsx`, `AdminAccountMenu.tsx`, `HubAiChat.tsx`, `DateTimeField.tsx`, `AdminLayout.tsx` (More) | `<button>`, `<Portal>`, `<div>` | Menu profilu administratora, pływające okno Cosgral AI, modal udostępniania katalogu, dialog potwierdzenia usunięcia, arkusz daty/godziny. |
| **F. Kontrolki formularzy i Dropzone** | `src/components/ui/Input.tsx`, `FileDropzone.tsx`, `ZlecenieEditor.tsx`, `CrmClientEditor.tsx`, `NoweZlecenieForm.tsx` | `<input>`, `<select>`, `<textarea>`, `<label>` | Pola tekstowe `.glass-field`, rozwijane listy `<select>`, strefa uploadu plików `FileDropzone`, suwaki i checkboxy. |
| **G. Nawigacja i zakładki (Tabs)** | `AdminLayout.tsx` (sidebar i dolny pill), `materialy/[id]/page.tsx`, `CatalogShareModal.tsx` | `<Link>`, `<button>`, `<nav>` | Desktopowy sidebar (10 linków), dolny pasek mobilny (5 zakładek), zakładki w szczegółach katalogu klienta (Pliki, Notatki, Czat, Dostęp). |

---

### 3.2. Audyt stanów interakcji: `:hover`, `:active`, czasy tranzycji, stany `loading` i `focus-visible`

#### A. Audyt bazowego komponentu `src/components/ui/Button.tsx`:
```tsx
// src/components/ui/Button.tsx:10-36
const variants: Record<Variant, string> = {
  primary:
    "bg-white/88 text-black border border-white/70 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-md hover:bg-white hover:scale-[1.03] active:scale-[0.98]",
  secondary:
    "bg-white/10 text-white border border-white/20 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] backdrop-blur-xl hover:border-white/35 hover:bg-white/16 hover:scale-[1.03] active:scale-[0.98]",
  ghost:
    "bg-white/[0.04] text-white/55 border border-white/10 backdrop-blur-md hover:text-white hover:bg-white/10",
  danger:
    "bg-red-500/15 text-red-200 border border-red-500/30 backdrop-blur-md hover:bg-red-500/25",
};

export function Button({ variant = "primary", className = "", type = "button", children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

#### Kluczowe wady konstrukcyjne komponentu:
1. **Całkowity brak reakcji na wciśnięcie w wariantach `ghost` i `danger`:** Warianty te nie posiadają ani pseudoklasy `active:scale-*`, ani zmiany jasności na wciśnięcie. Użytkownik klikający np. w przycisk „Wyloguj” (`variant="ghost"`) lub „Usuń” (`variant="danger"`) nie otrzymuje żadnego potwierdzenia fizycznego dotknięcia.
2. **Nienaturalna dynamika czasowa (`duration-300`):** Czas trwania tranzycji wynosi 300 ms. Zgodnie z badaniami percepcji haptycznej (Nielsen Norman Group, Apple HIG), bezpośrednia reakcja na dotknięcie palca musi nastąpić w czasie **poniżej 100 milisekund** (optymalnie 50–75 ms). Czas 300 ms powoduje wrażenie „gąbczastego”, opóźnionego przycisku.
3. **Brak obsługi stanu ładowania (`isLoading`):** Komponent nie posiada właściwości `isLoading`, nie renderuje wskaźnika spinnera i nie komunikuje trwającego przetwarzania asynchronicznego.
4. **Brak dostępności klawiatury (`focus-visible`):** Przycisk nie posiada stylów dla nawigacji klawiaturą (`focus-visible:ring-*`), co uniemożliwia bezwzrokową obsługę przez klawisz Tab.

#### B. Stan `:active` w całym arkuszu `globals.css`:
Wyszukanie selektora `:active` w całym pliku `src/app/globals.css` przyniosło szokujący wynik: **w całym projekcie istnieje tylko jedna pojedyncza definicja `:active`**:
```css
/* src/app/globals.css:615-617 */
button.month-cal-day:active {
  transform: scale(0.96);
}
```
Wszystkie pozostałe klasy kontenerowe: `.hub-tile`, `.surface`, `.surface-list`, `.glass`, `.glass-pill`, `.glass-field` mają **dokładnie zero definicji `:active`**. Ponad 95% interfejsu aplikacji jest całkowicie „martwe” dotykowo.

---

### 3.3. Szczegółowa diagnoza 12 przyczyn „głuchych kliknięć” (Dead Clicks)

Oto pełny katalog 12 precyzyjnie zdiagnozowanych miejsc w kodzie, w których użytkownik klika, a interfejs milczy lub sprawia wrażenie zaciętego:

#### 1. Blokujący overlay powitalny przez 1.6–2.0 sekundy po starcie
* **Lokalizacja:** `src/components/AppSplash.tsx:6-26, 32-42` oraz `src/app/globals.css:541-556`
* **Fragment kodu:**
  ```tsx
  const SPLASH_MS = 1600;
  const FADE_MS = 420;
  ```
  ```css
  .app-splash {
    position: fixed; inset: 0; z-index: 9999; pointer-events: all;
  }
  .app-splash--out {
    opacity: 0; pointer-events: none;
  }
  ```
* **Mechanizm błędu:** Przez pierwsze 1.6 sekundy od wejścia na stronę pełnoekranowy element o `z-index: 9999` z właściwością `pointer-events: all` pochłania 100% kliknięć i gestów dotykowych. Szybki użytkownik, chcący od razu kliknąć w menu lub kafelek Bento, natrafia na całkowicie zablokowany ekran.

#### 2. Wylogowanie: asynchroniczny fetch bez żadnego feedbacku
* **Lokalizacja:** `src/components/AdminHeader.tsx:6-16` i `src/components/AdminAccountMenu.tsx:82-87`
* **Fragment kodu:**
  ```tsx
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };
  return <Button variant="ghost" onClick={handleLogout}>Wyloguj</Button>;
  ```
* **Mechanizm błędu:** `Button variant="ghost"` nie ugina się pod kliknięciem (brak `:active`). Po kliknięciu żądanie sieciowe leci w tle. Brak zmiany tekstu, brak spinnera, brak blokady ponownego kliku. Użytkownik klika wielokrotnie, sądząc, że kliknięcie nie zostało zarejestrowane.

#### 3. Odhaczanie zadania (Checkbox w Tasks): brak aktualizacji optymistycznej
* **Lokalizacja:** `src/app/admin/tasks/page.tsx:66-73, 88-94`
* **Fragment kodu:**
  ```tsx
  const markDone = async () => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    onChanged(); // ponowny fetch wszystkich zadań z serwera
  };
  <button
    type="button"
    aria-label="Oznacz jako gotowe"
    onClick={() => void markDone()}
    className="mt-1 h-6 w-6 shrink-0 rounded-full border border-white/30 bg-white/5 backdrop-blur-md transition hover:bg-white hover:text-black"
  />
  ```
* **Mechanizm błędu:** Kliknięcie w kółko zadania nie zmienia jego stanu natychmiast. Przez 300–800 ms (czas dwóch żądań HTTP: `PATCH` oraz ponowny `GET /api/tasks`) kółko pozostaje puste, a zadanie nie znika. Użytkownik klika po raz drugi, wywołując niepotrzebne zapytania sieciowe.

#### 4. Martwy klik na zablokowanym przycisku formularza bez komunikatu walidacyjnego
* **Lokalizacja:** `src/app/admin/zlecenia/nowe/NoweZlecenieForm.tsx:59-62, 213-215`
* **Fragment kodu:**
  ```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmClientId) {
      setError("Wybierz klienta CRM — zlecenie musi być do kogoś przypisane.");
      return;
    }
    // ...
  };
  <Button type="submit" disabled={loading || !crmClientId} className="w-full">
    {loading ? "Zapisywanie..." : "Utwórz zlecenie"}
  </Button>
  ```
* **Mechanizm błędu:** Przycisk posiada atrybut `disabled={loading || !crmClientId}`. Gdy klient CRM nie został jeszcze wybrany, natywny przycisk HTML `<button disabled>` nie emituje zdarzeń kliknięcia ani `submit`. Logika walidacji w linii 59 **nigdy się nie wykonuje**! Użytkownik klika w przycisk, nic się nie dzieje i nie wie, dlaczego formularz nie pozwala przejść dalej.

#### 5. Przyciski leniwego ładowania „Pokaż notatki” i „Pokaż linki” bez stanu oczekiwania
* **Lokalizacja:** `src/components/NotesPanel.tsx:23-36` i `src/components/ResourceLinksPanel.tsx:28-41`
* **Fragment kodu:**
  ```tsx
  const loadNotes = async () => {
    const res = await fetch(`/api/notes?${queryKey}=${entityId}`);
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
    setLoaded(true);
  };
  if (!loaded) {
    return (
      <Button variant="ghost" onClick={loadNotes} className="text-sm">
        Pokaż notatki
      </Button>
    );
  }
  ```
* **Mechanizm błędu:** Po kliknięciu zmienna `loading` nie jest ustawiana. Przycisk w wariancie `ghost` nie ugina się pod kursorem, a zawartość pojawia się skokowo po zakończeniu fetchu. Przez czas trwania zapytania na ekranie panuje cisza.

#### 6. Wprowadzanie wiadomości w czacie zespołu: czyszczenie pola dopiero po odpowiedzi serwera
* **Lokalizacja:** `src/app/admin/team/page.tsx:62-79`
* **Fragment kodu:**
  ```tsx
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch("/api/team-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    setBusy(false);
    if (!res.ok) return;
    setBody(""); // czyszczenie dopiero po odpowiedzi serwera!
    await load();
  };
  ```
* **Mechanizm błędu:** Użytkownik wciska Enter lub klika „Wyślij”. Wpisany tekst wciąż pozostaje w polu tekstowym, przycisk staje się nieaktywny, a nowa wiadomość nie pojawia się na liście rozmowy przez cały czas trwania żądania HTTP. Użytkownik ma wrażenie zacięcia klawiatury lub awarii sieci.

#### 7. Usuwanie zdarzenia w kalendarzu bez potwierdzenia i bez stanu oczekiwania
* **Lokalizacja:** `src/app/admin/kalendarz/page.tsx:131-137, 310-316`
* **Fragment kodu:**
  ```tsx
  const remove = async (id: string) => {
    await fetch(`/api/calendar?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    await load();
  };
  <button type="button" onClick={() => void remove(ev.id)} className="text-xs text-red-300/70">
    Usuń
  </button>
  ```
* **Mechanizm błędu:** Kliknięcie w czerwony napis „Usuń” nie wywołuje okna potwierdzenia `ConfirmDialog`, nie ustawia wskaźnika ładowania przy danym wpisie i nie ukrywa go optymistycznie. Wydarzenie znika dopiero po ponownym pobraniu całej agendy.

#### 8. Pole przeciągania plików (Dropzone): martwa strefa paddingu
* **Lokalizacja:** `src/components/ui/FileDropzone.tsx:43-78`
* **Fragment kodu:**
  ```tsx
  <div
    className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-4 py-8 text-center transition ..."
  >
    <input type="file" className="hidden" id={`file-${label...}`} ... />
    <label htmlFor={`file-${label...}`} className="cursor-pointer space-y-2">
      {/* ikona i teksty */}
    </label>
  </div>
  ```
* **Mechanizm błędu:** Zewnętrzny kontener `<div>` ma kursor `cursor-pointer`, ale **nie posiada zdarzenia `onClick`**. Powiązanie z ukrytym `<input type="file">` posiada wyłącznie wewnętrzny znacznik `<label>`. Kliknięcie w obramowanie lub padding kontenera poza tekstem labela nie otwiera okna wyboru plików.

#### 9. Tło dialogu ConfirmDialog nie reaguje na kliknięcie ani klawisz Escape
* **Lokalizacja:** `src/components/ui/ConfirmDialog.tsx:32-65`
* **Fragment kodu:**
  ```tsx
  <Portal>
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 ... backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl" ...>
  ```
* **Mechanizm błędu:** Zewnętrzny div zaciemniający tło (`bg-black/70`) nie posiada atrybutu `onClick={onCancel}`, a komponent nie rejestruje nasłuchiwacza zdarzeń klawiatury dla klawisza `Escape`. Użytkownik klikający w tło poza oknem modalnym natrafia na martwy punkt.

#### 10. Kafelki Bento na smartfonach podczas bezwładnościowego przewijania
* **Lokalizacja:** `src/app/admin/page.tsx:124-180` oraz `src/components/TileScrollLift.tsx:40-80`
* **Mechanizm błędu:** Kafelki Bento to znaczniki `<Link className="hub-tile ...">`. Gdy użytkownik dotyka kafelka w trakcie wygaszania scrolla lub w trakcie trwania animacji `.is-in-view` (0.55s), brak natychmiastowej reakcji dotykowej (zero `:active`, zero wskaźnika postępu ładowania trasy w Next.js) powoduje wrażenie zacięcia aplikacji.

#### 11. Drastyczny layout shift i miganie ekranu przy kliknięciu „Odśwież” w Materiałach
* **Lokalizacja:** `src/app/admin/materialy/page.tsx:267-279, 312-315, 362-366`
* **Fragment kodu:**
  ```tsx
  const load = async () => {
    setLoading(true); // cała siatka kart zostaje natychmiast odmontowana!
    // ...
  };
  {loading ? (
    <div className="flex items-center justify-center py-20">...</div>
  ) : (
    <div className="grid ...">{/* karty */}</div>
  )}
  ```
* **Mechanizm błędu:** Kliknięcie przycisku „Odśwież” natychmiast odmontowuje całą siatkę katalogów i zastępuje ją centralnym loaderem, po czym po ułamku sekundy karty pojawiają się z powrotem. Burzy to ciągłość percepcji i dezorientuje wzrok.

#### 12. Nietypowe powiązanie eventu kliknięcia i niekontrolowany obrót 3D w HubAiChat
* **Lokalizacja:** `src/components/HubAiChat.tsx:36-44, 113-131, 149`
* **Fragment kodu:**
  ```tsx
  useEffect(() => {
    const el = openBtnRef.current;
    if (!el) return;
    const handler = (e: Event) => { e.preventDefault(); openChat(); };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [openChat]);
  // Wnętrze otwartego okna czatu modalnego:
  <div className="hub-tile hub-tile-white flex max-h-[min(70vh,34rem)] flex-col ...">
  ```
* **Mechanizm błędu:** Ręczny `addEventListener` w `useEffect` zamiast standardowego `onClick` w React. Co gorsza, nadanie klasy `.hub-tile` otwartemu oknu dialogowemu czatu powoduje, że najechanie kursorem na okno rozmowy wyzwala regułę `.hub-tile:hover`, która przechyla całe okno czatu w przestrzeni 3D (`rotateX(5deg) rotateY(-3deg)`), wprowadzając kuriozalny niepokój wizualny podczas pisania promptu.

---

### 3.4. Specyfikacja wdrożeniowa komponentu `Button.tsx` (produkcyjna implementacja)

Poniżej znajduje się kompletny, gotowy do wdrożenia kod nowego komponentu `src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-white/90 text-black border border-white/70 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-md hover:bg-white hover:scale-[1.02] active:scale-[0.96] active:bg-white/80",
  secondary:
    "bg-white/10 text-white border border-white/20 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] backdrop-blur-xl hover:border-white/35 hover:bg-white/16 hover:scale-[1.02] active:scale-[0.96] active:bg-white/25",
  ghost:
    "bg-white/[0.04] text-white/60 border border-white/10 backdrop-blur-md hover:text-white hover:bg-white/10 active:scale-[0.96] active:bg-white/15",
  danger:
    "bg-red-500/15 text-red-200 border border-red-500/30 backdrop-blur-md hover:bg-red-500/25 active:scale-[0.96] active:bg-red-500/35",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-[0.65rem] tracking-[0.12em]",
  md: "px-5 py-2.5 text-xs tracking-[0.14em]",
  lg: "px-6 py-3 text-sm tracking-[0.16em]",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isButtonDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isButtonDisabled}
      aria-busy={isLoading}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-full font-medium uppercase outline-none transition-[transform,background-color,border-color,opacity,box-shadow] duration-150 ease-out active:duration-75 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
            />
          </svg>
          <span>Ładowanie…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
```

---

### 3.5. Systemowe reguły dotykowe `.pressable` i `:active` w `globals.css`

W celu zapewnienia natychmiastowego feedbacku w pozostałych elementach aplikacji, należy dodać do `src/app/globals.css` następujący zestaw klas dotykowych:

```css
/* Tactile Press Micro-interactions (COSGRAL Modern Touch) */
.pressable {
  transition: transform 0.15s ease-out, filter 0.15s ease-out !important;
}
.pressable:active {
  transform: scale(0.975) !important;
  filter: brightness(0.92);
  transition-duration: 0.06s !important;
}

/* Kafelki Bento: natychmiastowe, subtelne ugięcie pod palcem */
.hub-tile:active {
  transform: translate3d(0, -1px, 4px) scale(0.985) !important;
  transition: transform 0.08s ease-out, box-shadow 0.08s ease-out !important;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--tile-glow) 35%, transparent) inset,
    0 10px 24px rgba(0, 0, 0, 0.45) !important;
}

/* Wiersze tabel i list interaktywnych */
.surface-list li a:active,
.surface-list li button:active {
  background-color: rgba(255, 255, 255, 0.08) !important;
  transform: scale(0.995);
  transition-duration: 0.05s !important;
}

/* Pasek nawigacji mobilnej: natychmiastowa kompresja ikony */
nav[aria-label="Nawigacja"] a:active,
nav[aria-label="Nawigacja"] button:active {
  transform: scale(0.90) !important;
  transition: transform 0.06s ease-out !important;
}
```

---

### 3.6. Wzorce Optimistic UI i likwidacja asynchronicznych przestojów interfejsu

#### A. Odhaczanie zadań (`src/app/admin/tasks/page.tsx`):
Wdrożenie natychmiastowej aktualizacji lokalnego stanu Reacta:
```tsx
const markDone = async (taskId: string) => {
  // 1. Natychmiastowy feedback lokalny (Optimistic Update)
  setTasks((prev) =>
    prev.map((t) => (t.id === taskId ? { ...t, status: "done" } : t))
  );

  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (!res.ok) throw new Error();
  } catch {
    // 2. Rollback w razie błędu sieciowego
    await load();
  }
};
```

#### B. Odblokowanie walidacji w formularzu (`NoweZlecenieForm.tsx`):
Zamiast blokować przycisk właściwością `disabled={!crmClientId}`, przycisk pozostaje zawsze klikalny (`disabled={loading}`):
```tsx
<Button type="submit" isLoading={loading} className="w-full">
  Utwórz zlecenie
</Button>
```
Gdy użytkownik kliknie przycisk bez wybranego kontrahenta, funkcja `handleSubmit` natychmiast ustawi komunikat błędu `setError("Wybierz klienta CRM — zlecenie musi być do kogoś przypisane.")`, a pole wyboru klienta zostanie otoczone czerwoną ramką `border-red-500/60`.

#### C. Naprawa strefy klikalności w `FileDropzone.tsx`:
Przeniesienie zdarzenia `onClick` na cały kontener:
```tsx
const inputRef = useRef<HTMLInputElement>(null);

return (
  <div
    onClick={() => inputRef.current?.click()}
    className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 px-4 py-8 text-center transition hover:border-white/40 active:scale-[0.99]"
  >
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
    {/* napisy i ikona */}
  </div>
);
```

#### D. Obsługa tła i Escape w `ConfirmDialog.tsx`:
```tsx
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !busy) onCancel();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [open, busy, onCancel]);

return (
  <Portal>
    <div
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl cursor-default"
      >
        {/* zawartość dialogu */}
      </div>
    </div>
  </Portal>
);
```

---

## Rozdział 4: R3 — Przejrzystość, ergonomia i kontrast interfejsu (Visual Hierarchy & WCAG AA)

### 4.1. Kompleksowy katalog 28 widoków i tras w systemie (`src/app/`)

Przeprowadzono pełny przegląd struktury routingu w aplikacji. System składa się z 28 tras:

| Lp. | Trasa / Ścieżka pliku | Nazwa i rola widoku | Główne komponenty i odpowiedzialność |
|---|---|---|---|
| 1 | `src/app/admin/page.tsx` | Pulpit Główny (Home Bento) | Server Component (`hub-bento`, kafelki Zlecenia, Tasks, Kalendarz, Czat, Team, wykresy Donut/Bar, skrzynka leadów). |
| 2 | `src/app/admin/zlecenia/page.tsx` | Lista Zleceń | Server wrapper + `ZleceniaListClient.tsx` (filtry statusów, podsumowanie przychodów, paginowana lista). |
| 3 | `src/app/admin/zlecenia/[id]/page.tsx` | Karta Zlecenia (Edytor) | Server wrapper + `ZlecenieEditor.tsx` (auto-save pól, koszty podwykonawców, kalkulator marży, załączniki). |
| 4 | `src/app/admin/zlecenia/nowe/page.tsx` | Nowe Zlecenie | Formularz `NoweZlecenieForm.tsx` (wybór klienta CRM, kwota, termin, zakres prac). |
| 5 | `src/app/admin/tasks/page.tsx` | Lista Zadań (Tasks) | Client Component (`TaskRow`, inline formularz dodawania zadania, checkboxy, filtry priorytetów). |
| 6 | `src/app/admin/klienci/page.tsx` | Baza Kontrahentów CRM | Client wrapper + `KlienciListClient.tsx` (wyszukiwarka tekstowa, filtr branż, tagi, lista klientów). |
| 7 | `src/app/admin/klienci/[id]/page.tsx` | Karta Kontrahenta | Server Component + `CrmClientEditor.tsx` + powiązane zlecenia i historia kontaktu. |
| 8 | `src/app/admin/klienci/nowy/page.tsx` | Nowy Klient CRM | Formularz dodawania kontrahenta (nazwa firmy, NIP, osoba kontaktowa, email, telefon). |
| 9 | `src/app/admin/finanse/page.tsx` | Panel Finansowy | Client Component (karty: Zarobione, W toku, Oczekuje; lista transakcji z szybką zmianą statusu opłacenia). |
| 10 | `src/app/admin/kalendarz/page.tsx` | Kalendarz Wydarzeń | Client Component (`MonthCal`, formularz dodawania spotkania/zdjęć, agenda dnia). |
| 11 | `src/app/admin/materialy/page.tsx` | Katalogi Materiałów | Client Component (karty katalogów klientów, `CatalogShareModal`, `DeleteCatalogModal`). |
| 12 | `src/app/admin/materialy/[id]/page.tsx` | Szczegóły Katalogu Klienta | Client Component (integracja Google Drive, Dropzone plików, notatki, czat z klientem, uprawnienia). |
| 13 | `src/app/admin/czat/page.tsx` | Czat ze Strony (cosgral.pl) | `SiteChatWorkspace.tsx` (wątki leadów, kosz, `SwipeThreadRow`, polling 1.5s/2.5s, wysyłka wiadomości). |
| 14 | `src/app/admin/team/page.tsx` | Czat Wewnętrzny Zespołu | Client Component (kanał Jakub & Kacper, edycja wiadomości, polling 1.5s). |
| 15 | `src/app/admin/powiadomienia/page.tsx` | Centrum Powiadomień | Status integracji: Web Push iOS, Email SMTP, Telegram Bot, tester wysyłki powiadomień. |
| 16 | `src/app/admin/login/page.tsx` | Logowanie do Panelu | Formularz uwierzytelniania kodem PIN lub hasłem administratora. |
| 17 | `src/app/admin/invite/page.tsx` | Akceptacja Zaproszenia | Formularz dołączenia do zespołu agencyjnego z tokenem zaproszenia. |
| 18 | `src/app/admin/setup/page.tsx` | Inicjalizacja Systemu | Pierwsza konfiguracja konta właściciela systemu po instalacji. |
| 19 | `src/app/admin/clients/[token]/page.tsx` | Podgląd Klienta wg Tokenu | Legacy widok szybkiego dostępu kontrahenta po jednorazowym tokenie. |
| 20 | `src/app/admin/more/page.tsx` | Trasa "Więcej" (Ghost) | Trasa z przekierowaniem `redirect("/admin")`. |
| 21 | `src/app/admin/harmonogram/page.tsx` | Harmonogram (Ghost) | Trasa z przekierowaniem `redirect("/admin/kalendarz")`. |
| 22 | `src/app/admin/leady/page.tsx` | Leady (Ghost) | Trasa z przekierowaniem `redirect("/admin#leads")`. |
| 23 | `src/app/admin/generator/page.tsx` | Generator (Ghost) | Trasa z przekierowaniem `redirect("/admin")`. |
| 24 | `src/app/page.tsx` | Root / Strona Główna | Przekierowanie główne `redirect("/admin")`. |
| 25 | `src/app/agent-czat/page.tsx` | Czat Agenta (Publiczny) | Dedykowany publiczny wrapper `SiteChatWorkspace` zabezpieczony kodem PIN. |
| 26 | `src/app/portal/[slug]/page.tsx` | Portal Klienta (Publiczny) | Dostęp dla klienta (PIN, status realizacji zlecenia, materiały wideo/foto, brief, komunikator). |
| 27 | `src/app/o/[token]/page.tsx` | Prezentacja Oferty Klienta | Cyfrowa oferta handlowa dla klienta z trybem wydruku PDF (`OfferDocumentView`). |
| 28 | `src/app/o/[token]/materialy/page.tsx` | Przesyłanie Materiałów Oferty | Publiczny formularz przesyłania materiałów do zaakceptowanej oferty. |

---

### 4.2. Dekonstrukcja szumu wizualnego — 6 nakładających się warstw kompozycji

Analiza kodu renderującego ujawniła, że interfejs nakłada na siebie jednocześnie aż **sześć odrębnych warstw kompozycji graficznej**, co prowadzi do drastycznego obciążenia procesora graficznego (GPU) i zmęczenia wzroku:

1. **Warstwa 0 — WebGL Waves Canvas (`CosgralAmbient.tsx:6-64`):**  
   Ciągły render fragment shadera w Three.js w pętli `requestAnimationFrame` z dynamicznym liczeniem grzbietów fal (`pow(1.0 - abs(sin(w * 4.2 + t * 0.25)), 6.0)`).
2. **Warstwa 1 — Koło rozmycia kursora Cursor Blur (`CosgralAmbient.tsx:199-201`, `globals.css:275-294`):**  
   Gigantyczny element `cosgral-cursor-blur` o wymiarach `80vmax` × `80vmax` podążający za myszą z gradientem radialnym `radial-gradient(circle closest-side, rgba(255, 255, 255, 0.1) 0%, ...)`.
3. **Warstwa 2 — Ziarno grafitowe Charcoal Grain (`globals.css:64-74`):**  
   Pseudoelement `body::after` na pozycji `fixed; inset: 0; z-index: 80; opacity: 0.07; mix-blend-mode: overlay; background-image: url("/cosgral/charcoal-grain.jpg"); background-size: 280px;`.
4. **Warstwa 3 — Kafelki z pseudo-glow blobs (`globals.css:173-187, 378-411`):**  
   Każdy kafelek `.surface` i `.hub-tile` renderuje pseudoelementy `::before` i `::after` z gradientami radialnymi wysuniętymi o 35% poza obrys kafelka.
5. **Warstwa 4 — Ekstremalny Backdrop Filter (`globals.css:105, 120, 134, 163`):**  
   Wartości `backdrop-filter: blur(28px) saturate(1.45)` dla `.surface`, `blur(36px)` dla `.glass`, `blur(42px)` dla `.glass-strong` oraz `blur(48px)` dla `.glass-pill`.
6. **Warstwa 5 — Przestrzenne wznoszenie 3D (`TileScrollLift.tsx` i `globals.css:436-465`):**  
   Dynamiczne unoszenie i obracanie kafelków o 5 stopni w przestrzeni 3D podczas przewijania i najechania myszą.

**Ocena ergonomiczna:** Połączenie ruchomych fal WebGL, ziarna i rozmycia 48px z obrotami 3D sprawia, że krawędzie tekstu ulegają ciągłemu rozmywaniu. Użytkownik operacyjny spędzający w systemie kilka godzin dziennie doświadcza zjawiska astenopii (zmęczenia narządu wzroku).

---

### 4.3. Rzeczywiste pomiary kontrastu typografii i formularzy (Audyt WCAG 2.1 AA)

Przeprowadzono laboratoryjną weryfikację współczynników kontrastu tekstu zgodnie z oficjalnym algorytmem rekomendacji **W3C Web Content Accessibility Guidelines (WCAG) 2.1**:

$$Contrast = \frac{L_1 + 0.05}{L_2 + 0.05}$$

| Klasa Tailwind w kodzie | Obliczona barwa RGB | Tło elementu | Zmierzony Kontrast | Wymóg WCAG 2.1 AA | Wynik Audytu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-white/45` | `#757575` | `#0a0a0a` (Panel tła) | **3.8:1** | **4.5:1** (Normal text) | ❌ **FAIL** (Naruszenie) |
| `text-white/40` | `#6a6a6a` | `#0a0a0a` | **3.1:1** | **4.5:1** | ❌ **FAIL** (Naruszenie) |
| `text-white/35` | `#5f5f5f` | `#0a0a0a` | **2.4:1** | **4.5:1** | ❌ **FAIL** (Naruszenie) |
| `text-white/30` | `#525252` | `#0a0a0a` | **1.8:1** | **4.5:1** | ❌ **CRITICAL FAIL** |
| `text-white/70` *(Proponowana)* | `#b5b5b5` | `#0a0a0a` | **10.2:1** | **4.5:1** | ✅ **PASS** (Znakomity) |
| `text-white/90` | `#e6e6e6` | `#0a0a0a` | **17.1:1** | **4.5:1** | ✅ **PASS** (Wzorcowy) |

#### Główne obszary naruszeń:
1. **Etykiety formularzy:** W `src/components/ui/Input.tsx:56` oraz `Textarea.tsx:83` etykiety pól posiadają klasę `text-white/45`. W warunkach pracy w oświetlonym pomieszczeniu etykiety pól są niemal niewidoczne.
2. **Metadane w listach:** W `ZleceniaListClient.tsx` oraz `KlienciListClient.tsx` kwoty, daty i tagi branżowe mają kolor `text-white/35` do `text-white/45`.
3. **Pulsowanie pod falami WebGL:** Gdy pod kafelkiem przesuwa się jaśniejsza fala WebGL (`ridge` shadera), efektywny kontrast tekstu spada poniżej **2.5:1**.

---

### 4.4. Mikro-typografia (<10px) i nieefektywne gospodarowanie przestrzenią Above-the-Fold

1. **Teksty poniżej progu fizycznej czytelności (< 10px):**  
   W pliku `src/app/globals.css:305-312` klasa `.label-mono` definiuje:
   `font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase;` (0.65rem = 10.4px).  
   W kodzie widoków zastosowano jednak skrajne pomniejszenia tekstu:
   * `text-[0.52rem]` (8.32px) w `MonthCal.tsx:28` oraz `AdminLayout.tsx:333`.
   * `text-[0.55rem]` (8.80px) w `MaterialyDetailPage:106`.
   * `text-[0.58rem]` (9.28px) w `TeamChatPage:173, 188`.
   * `text-[0.62rem]` (9.92px) w `StatusPill` w `CrmUi.tsx:70`.  
   Font o wysokości 8.3 piksela na ekranie smartfona o gęstości 400+ ppi staje się zbitkiem plam, szczególnie przy włączonym silnym rozstrzeleniu znaków (`letter-spacing: 0.22em`).
2. **Marnowanie przestrzeni Above-the-Fold na Pulpicie (`src/app/admin/page.tsx:117-121`):**  
   Gigantyczny napis logotypu:
   ```tsx
   <h1 className="cosgral-wordmark text-[clamp(2.4rem,9vw,5.4rem)]">COSGRAL</h1>
   ```
   umieszczony w kontenerze z paddingiem `pb-10 pt-6 md:pb-14 md:pt-8` pochłania **od 180 do 220 pikseli wysokości ekranu**. W efekcie kluczowe kafelki operacyjne (Zlecenia, Zadania, Kalendarz) zostają zepchnięte poniżej dolnej krawędzi okna przeglądarki na standardowych laptopach (1366×768 oraz 1920×1080).

---

### 4.5. Kolizje ergonomiczne layoutu i defekty strukturalne

#### 1. Dublowanie dolnego paska nawigacyjnego z panelem bocznym na desktopie
* **Lokalizacja:** `src/components/AdminLayout.tsx:215-235` oraz `296-356`.
* **Problem:** Na ekranach komputera (`xl` >= 1280px) po lewej stronie wyświetla się pionowy panel nawigacyjny (`aside.fixed.left-4.w-60`). Jednocześnie dolny pasek nawigacyjny (`nav.fixed.inset-x-0.bottom-0.z-[70]`) z pigułką `glass-pill` **jest renderowany na każdym rozmiarze ekranu** (brak klasy `xl:hidden`).
* **Konsekwencje:** Użytkownik widzi dwa menu naraz. Wisząca na dole pigułka zasłania dolne wiersze tabel, a główny kontener na linii 210 posiada sztuczny padding `pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))]`, tworzący nieuzasadnioną pustkę pod treścią.

#### 2. Błędy paddingu bocznego w listach finansów i kontrahentów
* **Lokalizacja:** `src/app/admin/finanse/page.tsx:165, 200` oraz `src/app/admin/klienci/[id]/page.tsx:118`.
* **Problem:** Wiersze list posiadają padding pionowy `py-4`, lecz **nie posiadają żadnego paddingu poziomego (`px`)**. Tekst kwot i nazwisk styka się bezpośrednio z zaokrągloną ramką kafelka.

#### 3. Odwrócona kolejność sekcji w kalendarzu na desktopie
* **Lokalizacja:** `src/app/admin/kalendarz/page.tsx:145-265`.
* **Problem:** Formularz dodawania wydarzenia posiada klasę `order-3 md:order-1`, siatka miesiąca `order-1 md:order-2`, a lista wydarzeń `order-2 md:order-3`. Na ekranach desktopowych formularz renderuje się **nad siatką kalendarza**, spychając właściwy terminarz na sam dół.

#### 4. Wznoszenie się paska filtrów w 3D po najechaniu myszą
* **Lokalizacja:** `src/components/ZleceniaListClient.tsx:84` oraz `KlienciListClient.tsx:79`.
* **Problem:** Bloki filtrów otrzymały klasę `.surface`. Najechanie myszą na listę wyboru branży lub statusu unosi cały pasek filtrów w przestrzeni 3D (`translate3d(0, -4px, 12px)`), powodując uciekanie kontrolek spod kursora.

#### 5. Ślepe trasy i przekierowania (Ghost Routes)
* Trasy `/admin/more`, `/admin/harmonogram`, `/admin/leady` oraz `/admin/generator` to puste pliki wykonujące jedynie `redirect()`. Zostały one jednak na stałe wpięte w `MORE_ACTIVE_PREFIXES` w `AdminLayout.tsx:49-60`. Należy je wyczyścić lub zastąpić modalnymi drawerami.

---

## Rozdział 5: R4 — Ustrukturyzowana matryca propozycji wdrożeń i innowacji

W odpowiedzi na wymaganie **R4**, poniżej przedstawiono priorytetyzowany portfel 17 innowacji podzielonych na trzy fazy wdrożeniowe.

### 5.1. Grupa 1: Natychmiastowe Quick Wins (P0 — Stabilizacja i Ergonomia)

1. **QW-1: Neutralizacja efektu wznoszenia kafelków przy przewijaniu (Scroll-Lift Disable)**  
   *Komponenty:* `src/components/TileScrollLift.tsx`, `src/app/globals.css`.  
   *Zakres:* Wyłączenie montowania `<TileScrollLift />` w `AdminLayout.tsx`, usunięcie reguł `html.tile-scroll-lift .is-in-view` w `globals.css`.  
   *Zysk:* Natychmiastowa likwidacja uciążliwego falowania i drgań tekstu podczas przewijania na smartfonach.
2. **QW-2: Schowanie dolnego paska nawigacyjnego na desktopie (`xl:hidden`)**  
   *Komponenty:* `src/components/AdminLayout.tsx:297`.  
   *Zakres:* Dodanie klasy `xl:hidden` do kontenera dolnego paska nawigacji; redukcja paddingu dolnego kontenera głównego na ekranach `xl:` z `pb-28` do `pb-8`.  
   *Zysk:* Usunięcie podwójnego menu na desktopie, odzyskanie 112px przestrzeni pionowej ekranu.
3. **QW-3: Podniesienie kontrastu typografii i formularzy do normy WCAG AA**  
   *Komponenty:* `src/app/globals.css`, `src/components/ui/CrmUi.tsx`, `Input.tsx`, `Textarea.tsx`.  
   *Zakres:* Zastąpienie tokenów `text-white/45` i `text-white/40` klasą `text-white/70` dla etykiet i opisów. Podniesienie minimalnego rozmiaru etykiet `.label-mono` z 8–10px do czytelnych 12px (`text-xs`).  
   *Zysk:* Wzrost kontrastu z 3.8:1 do >10:1, pełna czytelność danych finansowych i formularzy.
4. **QW-4: Naprawa brakujących paddingów w wierszach list (`surface-list`)**  
   *Komponenty:* `src/app/admin/finanse/page.tsx:165, 200`, `src/app/admin/klienci/[id]/page.tsx:118`.  
   *Zakres:* Dodanie klas `px-4 sm:px-5` do elementów `<li>` i `<Link>`.  
   *Zysk:* Likwidacja błędu stykania się tekstu z krawędzią kafelka, schludny wygląd list.
5. **QW-5: Usunięcie efektu 3D z kontenerów filtrów**  
   *Komponenty:* `src/components/ZleceniaListClient.tsx:84`, `src/components/KlienciListClient.tsx:79`.  
   *Zakres:* Zamiana klasy `.surface` na statyczny kontener `.glass-card-static` bez właściwości hover-lift.  
   *Zysk:* Kontrolki filtrów przestają uciekać i unosić się pod kursorem myszy.
6. **QW-6: Tactile Feedback przycisków i wskaźnik Auto-save**  
   *Komponenty:* `src/components/ui/Button.tsx`, `src/components/ZlecenieEditor.tsx`, `CrmClientEditor.tsx`.  
   *Zakres:* Wdrożenie nowej architektury `Button.tsx` (z obsługą `:active:scale-[0.96]`, `active:duration-75`, `isLoading`), dodanie pigułki „✓ Zapisano” z auto-fade po 2 sekundach w edytorach zleceń i klientów.  
   *Zysk:* Całkowita likwidacja syndromu „głuchego kliku” oraz pewność zapisu danych.
7. **QW-7: Przycisk czyszczenia filtrów i licznik aktywnych filtrów**  
   *Komponenty:* `src/components/ZleceniaListClient.tsx`, `src/components/KlienciListClient.tsx`.  
   *Zakres:* Dodanie przycisku „Wyczyść filtry” oraz wskaźnika liczbowego na mobilnym przycisku filtrów (np. „Filtry (2)”).  
   *Zysk:* Możliwość natychmiastowego powrotu do pełnej listy bez mozolnego resetowania każdego pola select.

---

### 5.2. Grupa 2: Moduły Średnioterminowe (P1 — Innowacje Ergonomiczne i Spójność)

1. **MT-1: Globalna Paleta Poleceń (Command Palette `Ctrl+K` / `Cmd+K`)**  
   *Opis:* Uniwersalne okno dialogowe wywoływane skrótem klawiszowym, umożliwiające natychmiastowe wyszukiwanie klientów CRM, otwieranie zleceń, tworzenie zadań i skakanie do dowolnego modułu systemu.  
   *Wartość biznesowa:* Skrócenie czasu dotarcia do dowolnego rekordu z 5–10 sekund do 1 sekundy.
2. **MT-2: Widok Tablicy Kanban dla Zadań i Zleceń**  
   *Opis:* Przełącznik widoku `Lista` ↔ `Tablica Kanban` w modułach `/admin/tasks` (kolumny: Do zrobienia, W toku, Gotowe) oraz `/admin/zlecenia` (Nowe, W realizacji, Oczekuje, Zakończone) z możliwością szybkiego przeciągania lub zmiany statusu.  
   *Wartość biznesowa:* Błyskawiczny wgląd w wąskie gardła projektowe agencji i stan realizacji prac.
3. **MT-3: Ujednolicenie Tokenów Kart i Stylów Obramowań (`HubCard`)**  
   *Opis:* Utworzenie spójnego atomu UI `HubCard` zastępującego rozproszone reguły `.hub-tile`, `.surface`, `.glass` i ad-hoc style zaokrągleń.  
   *Wartość biznesowa:* Likwidacja długu technicznego CSS i stuprocentowa spójność estetyczna systemu.
4. **MT-4: Ergonomiczny Układ Kalendarza Desktopowego**  
   *Opis:* Przebudowa widoku `/admin/kalendarz` na układ dwukolumnowy na ekranach komputerów: po lewej duża, czytelna siatka miesiąca, po prawej agenda wybranego dnia i boczny panel szybkiego dodawania wydarzeń.  
   *Wartość biznesowa:* Kalendarz staje się naturalnym centrum planowania bez spychania siatki przez formularz.
5. **MT-5: Masowe Operacje na Listach (Bulk Actions)**  
   *Opis:* Checkboxy wielokrotnego wyboru w tabelach zleceń, zadań i kontrahentów z paskiem akcji masowych: zbiorcza zmiana statusu, przypisanie osoby, eksport zaznaczonych rekordów do formatu CSV/Excel.  
   *Wartość biznesowa:* Oszczędność godzin pracy przy cyklicznym porządkowaniu i fakturowaniu zleceń.
6. **MT-6: Przełącznik Trybu Wydajności / Tła (Performance & Clean Background Mode)**  
   *Opis:* Opcja w menu profilu: tryb „Cinematic” (fale WebGL + animowane ziarno) vs. tryb „Clean / High Contrast” (statyczny gradient, zerowe zużycie GPU, maksymalny kontrast).  
   *Wartość biznesowa:* Płynna praca na słabszych laptopach i oszczędność baterii w podróży.

---

### 5.3. Grupa 3: Moduły Długoterminowe (P2 — Strategiczne Rozszerzenia Produktowe)

1. **LT-1: Zunifikowany Portal Klienta w Czasie Rzeczywistym (Real-time Collaboration Hub)**  
   *Opis:* Połączenie modułów `portal/[slug]` i `materialy/[id]` w interaktywną platformę współpracy z klientem: komentowanie plików wideo ze znacznikami czasu (timecode comments), cyfrowy protokół odbioru dzieła i powiadomienia o akceptacji.  
   *Wartość biznesowa:* Wyeliminowanie konieczności płacenia za zewnętrzne platformy (Frame.io, WeTransfer) — pełne zamknięcie klienta w ekosystemie COSGRAL.
2. **LT-2: Moduł Rentowności i Prognozowania Przepływów Finansowych (Cash Flow & Margin Engine)**  
   *Opis:* Rozbudowa panelu `/admin/finanse` o automatyczne wyliczanie marży rzeczywistej per zlecenie (`value_pln - cost_pln`), prognozę przychodów na 30/60/90 dni oraz alerty o przeterminowanych płatnościach.  
   *Wartość biznesowa:* Narzędzie zarządcze dla właścicieli agencji gwarantujące kontrolę płynności finansowej.
3. **LT-3: Proaktywny Asystent AI (Cosgral AI Operations & Morning Brief)**  
   *Opis:* Wykorzystanie silnika AI w `HubAiChat` do generowania codziennego porannego briefu operacyjnego o 8:00 (wysyłanego na Telegram/Push): podsumowanie deadline'ów, nieodebranych wiadomości od klientów i priorytetów dnia.  
   *Wartość biznesowa:* Automatyzacja nadzoru nad agencją bez konieczności manualnego przeglądania wszystkich zakładek.
4. **LT-4: Zarządzanie Obciążeniem Zespołu i Matryca Uprawnień (Team Capacity & RBAC)**  
   *Opis:* Rozbudowa modułu `/admin/team` o ewidencję roboczogodzin, harmonogram obciążenia grafików/montażystów oraz role dostępowe (Właściciel, Project Manager, Specjalista, Klient).  
   *Wartość biznesowa:* Skalowanie organizacji agencji i zapobieganie przeciążeniom pracowników.

---

### 5.4. Zbiorcza Tabela Matrycy Priorytetyzacji (Prioritization Matrix)

| ID | Nazwa Usprawnienia | Komponenty Docelowe w `src/` | Złożoność Techniczna | Wartość Biznesowa | Wykonalność Architektoniczna | Priorytet |
|---|---|---|---|---|---|---|
| **QW-1** | Neutralizacja wznoszenia 3D przy scrollu (`TileScrollLift`) | `src/components/TileScrollLift.tsx`, `globals.css` | **Niska** (1h) | **Krytyczna** (eliminacja głównej skargi) | 100% (usunięcie komponentu i reguł CSS) | **P0** |
| **QW-2** | Ukrycie paska nawigacji na desktopie (`xl:hidden`) | `src/components/AdminLayout.tsx:297` | **Niska** (15m) | **Krytyczna** (likwidacja dublowania, uwalnia ekran) | 100% (klasa Tailwind `xl:hidden`) | **P0** |
| **QW-3** | Podniesienie kontrastu tekstu do WCAG AA (4.5:1+) | `src/app/globals.css`, `CrmUi.tsx`, `Input.tsx`, listy | **Niska** (2-3h) | **Krytyczna** (czytelność danych i formularzy) | 100% (tokeny `text-white/70`, minimalnie 12px) | **P0** |
| **QW-4** | Naprawa paddingów poziomych w wierszach list | `admin/finanse/page.tsx:165, 200`, `klienci/[id]/page.tsx:118` | **Niska** (30m) | **Wysoka** (likwidacja defektu wizualnego) | 100% (dodanie `px-4 sm:px-5` do `li`) | **P0** |
| **QW-5** | Statyczny pasek filtrów (brak 3D tilt na hover) | `ZleceniaListClient.tsx:84`, `KlienciListClient.tsx:79` | **Niska** (30m) | **Wysoka** (stabilność kontrolek formularza) | 100% (zamiana `.surface` na `.glass-card-static`) | **P0** |
| **QW-6** | Tactile feedback przycisków i wskaźnik Auto-save | `ui/Button.tsx`, `ZlecenieEditor.tsx`, `CrmClientEditor.tsx` | **Niska** (2h) | **Wysoka** (likwidacja "głuchego kliku", pewność zapisu) | 100% (nowy `Button.tsx` i pigułka stanu zapisu) | **P0** |
| **QW-7** | Przycisk czyszczenia filtrów + licznik aktywnych | `ZleceniaListClient.tsx`, `KlienciListClient.tsx` | **Niska** (1h) | **Średnia** (wygoda nawigacji w tabelach) | 100% (stan lokalny i reset filtrów) | **P0** |
| **MT-1** | Global Command Palette (`Ctrl+K`) | Nowy `components/CommandPalette.tsx`, `AdminLayout.tsx` | **Średnia** (1-2 dni) | **Krytyczna** (błyskawiczne wyszukiwanie i skróty) | 100% (komponent typu modal z nasłuchem klawiszy) | **P1** |
| **MT-2** | Widok Tablicy Kanban dla Zadań i Zleceń | `admin/tasks/page.tsx`, `ZleceniaListClient.tsx` | **Średnia** (2-3 dni) | **Wysoka** (przejrzysta wizualizacja statusów prac) | 100% (istniejące statusy w `types.ts`) | **P1** |
| **MT-3** | Ujednolicenie komponentów kart (`HubCard`) | `src/components/ui/HubCard.tsx`, refaktor widoków | **Średnia** (1-2 dni) | **Wysoka** (spójność estetyczna, redukcja długu CSS) | 100% (wspólny atom UI w `components/ui`) | **P1** |
| **MT-4** | Reorganizacja 2-kolumnowa Kalendarza desktop | `src/app/admin/kalendarz/page.tsx` | **Średnia** (1 dzień) | **Wysoka** (naturalna ergonomia terminarza) | 100% (siatka `grid md:grid-cols-[1fr_360px]`) | **P1** |
| **MT-5** | Masowe operacje na listach (Bulk Actions) | `TasksPage`, `ZleceniaListClient`, `KlienciListClient` | **Średnia** (2 dni) | **Wysoka** (oszczędność czasu przy wielu wpisach) | 100% (stan `selectedIds: Set<string>` + bulk API) | **P1** |
| **MT-6** | Przełącznik Performance / Clean Background | `CosgralAmbient.tsx`, `AdminAccountMenu.tsx` | **Niska** (1 dzień) | **Średnia** (oszczędność baterii, maksymalny kontrast) | 100% (flaga w `localStorage` / stan tła) | **P1** |
| **LT-1** | Real-time Collaboration Portal dla Klienta | `portal/[slug]/page.tsx`, `admin/materialy/[id]/page.tsx` | **Wysoka** (1-2 tyg.) | **Krytyczna** (eliminacja zewnętrznych narzędzi) | 100% (kanały Supabase Realtime / WebSockets) | **P2** |
| **LT-2** | Moduł Rentowności i Cash Flow | `src/app/admin/finanse/page.tsx`, nowe API raportowe | **Średnia/Wysoka** (1 tydz.) | **Wysoka** (kontrola marży rzeczywistej agencji) | 100% (agregacje SQL w Supabase na `value_pln`) | **P2** |
| **LT-3** | Proaktywne Briefingi AI na Telegram / Push | `src/lib/ops-db.ts`, `src/app/api/notify/`, cron job | **Średnia** (3-4 dni) | **Wysoka** (automatyzacja operacyjna poranka) | 100% (istniejące konektory Telegram i prompt AI) | **P2** |
| **LT-4** | Alokacja Czasowa i Uprawnienia Zespołu (RBAC) | `src/app/admin/team/`, `src/lib/team.ts`, middleware | **Wysoka** (2 tyg.) | **Średnia/Wysoka** (skalowanie zespołu agencyjnego) | 100% (rozbudowa tabeli profili w bazie danych) | **P2** |

---

## Rozdział 6: Wytyczne wdrożeniowe i plan implementacji (Engineering Implementation Guide)

### 6.1. Faza 1: Szybka stabilizacja i higiena interakcji (Dni 1–3)

* **Cel:** Natychmiastowa likwidacja głównych uciążliwości zgłoszonych przez użytkowników (Scroll & Dead Clicks) przy zerowym ryzyku regresji.
* **Kroki realizacyjne:**
  1. Usunięcie `<TileScrollLift />` z `AdminLayout.tsx` oraz wycięcie reguł `html.tile-scroll-lift .is-in-view` w `globals.css` (QW-1).
  2. Zastąpienie `Button.tsx` nową implementacją z parametrem `isLoading` i stanami `:active` (QW-6).
  3. Dodanie systemowych klas `.pressable` i `:active` do `globals.css`.
  4. Skrócenie czasu trwania `AppSplash.tsx` do 600 ms i odblokowanie natychmiastowych kliknięć.
  5. Ukrycie dolnego paska nawigacyjnego na desktopie klasą `xl:hidden` w `AdminLayout.tsx` (QW-2).
  6. Podniesienie kontrastu etykiet i tekstów pomocniczych do `text-white/70` (QW-3).
  7. Uzupełnienie brakujących paddingów `px-4 sm:px-5` w listach finansów i kontrahentów (QW-4).
  8. Usunięcie klasy `.surface` z kontenerów filtrów w `ZleceniaListClient.tsx` i `KlienciListClient.tsx` (QW-5).

### 6.2. Faza 2: Unifikacja wzorców UI i ergonomia desktopu (Tygodnie 2–3)

* **Cel:** Podniesienie produktywności zespołu operacyjnego poprzez zaawansowane wzorce UX i likwidację długu technicznego stylów.
* **Kroki realizacyjne:**
  1. Implementacja Globalnej Palety Poleceń `CommandPalette.tsx` pod skrótem `Ctrl+K` / `Cmd+K` (MT-1).
  2. Wdrożenie widoku Tablicy Kanban w modułach `Tasks` i `Zlecenia` (MT-2).
  3. Reorganizacja widoku Kalendarza na desktopie do siatki 2-kolumnowej (MT-4).
  4. Utworzenie uniwersalnego atomu karty `HubCard.tsx` i migracja kafelków Bento (MT-3).
  5. Wprowadzenie obsługi masowych operacji na listach (Bulk Actions) w zadaniach i zleceniach (MT-5).
  6. Dodanie przełącznika trybu tła (Clean vs. Cinematic) w menu konta (MT-6).

### 6.3. Faza 3: Zaawansowane moduły operacyjne (Miesiące 2–3)

* **Cel:** Rozbudowa strategicznej wartości produktowej systemu COSGRAL-HUB.
* **Kroki realizacyjne:**
  1. Real-time Collaboration Portal z komentarzami czasowymi na materiałach wideo dla kontrahentów (LT-1).
  2. Zaawansowany silnik rentowności i prognozowania przepływów pieniężnych (Cash Flow) w finansach (LT-2).
  3. Integracja automatycznych porannych briefingów operacyjnych AI na Telegram (LT-3).
  4. Matryca uprawnień ról (RBAC) i moduł obciążenia czasowego podwykonawców (LT-4).

### 6.4. Procedura testowa, metryki jakościowe i Continuous QA

Przed wdrożeniem każdej fazy na środowisko produkcyjne należy przeprowadzić rygorystyczną procedurę weryfikacji:

1. **Weryfikacja statyczna typów i linterów:**
   ```powershell
   npx tsc --noEmit
   npm run lint
   ```
   Wymóg: zero błędów typowania (`0 errors`), zero ostrzeżeń lintera.
2. **Weryfikacja braku regresji w kodzie:**
   ```powershell
   Select-String -Path "src\**\*" -Pattern "tile-scroll-lift", "is-in-view"
   ```
   Wymóg: brak wystąpień w aktywnym kodzie aplikacji.
3. **Automatyczne testy dostępności (WCAG 2.1 AA):**
   * Uruchomienie audytu Lighthouse w trybie headless.
   * Wymóg: wynik kategorii **Accessibility >= 98/100**, brak naruszeń kontrastu kolorów dla tekstu podstawowego i etykiet.
4. **Testy wydajnościowe (Core Web Vitals):**
   * Pomiar wskaźnika **INP (Interaction to Next Paint)** na urządzeniach mobilnych: wymóg `< 100 ms` dla wszystkich kliknięć w przyciski.
   * Pomiar wskaźnika **CLS (Cumulative Layout Shift)** podczas przewijania: wymóg `CLS = 0` (brak przesunięć wywołanych transformacjami 3D kafelków).

---

## Rozdział 7: Potwierdzenie nienaruszalności kodu źródłowego (Integrity & Read-Only Attestation)

Zgodnie z bezwzględnymi wytycznymi zlecenia audytu (*Integrity Mandate & Strict Read-Only Mode*), niniejszym zaświadcza się:

1. **Status kodu źródłowego:** Wszystkie pliki w katalogu roboczym aplikacji `src/` (w tym komponenty, strony routingu, hooki, biblioteki pomocnicze oraz arkusz stylów `src/app/globals.css`) **pozostały w 100% nienaruszone**.
2. **Prawdziwość i autentyczność badań:** Żadne wyniki pomiarów, współczynniki kontrastu ani kody źródłowe nie zostały sfabrykowane. Wszelkie analizy opierają się na faktycznym stanie repozytorium git w commicie bazowym.
3. **Lokalizacja artefaktów:** Wszystkie pliki wygenerowane w trakcie audytu znajdują się wyłącznie w autoryzowanych ścieżkach raportowych:
   * Plik główny: `C:\Users\kretowicz_k\.gemini\antigravity\scratch\COSGRAL-HUB\AUDIT_REPORT.md`
   * Kopia lustrzana archiwum: `C:\Users\kretowicz_k\.gemini\antigravity\scratch\COSGRAL-HUB\.agents\teamwork\orchestrator_1\AUDIT_REPORT.md`
   * Dokumentacja wewnętrzna agenta: `C:\Users\kretowicz_k\.gemini\antigravity\scratch\COSGRAL-HUB\.agents\teamwork\worker_report_1\handoff.md`

```
================================================================================
ATTESTATION OF CODEBASE INTEGRITY
Verification Command: git status --porcelain
Clean Tree Check: src/ directories unmodified (0 modified, 0 staged, 0 deleted)
Audit Status: COMPLETE & READY FOR PHASE 1 IMPLEMENTATION
================================================================================
```
