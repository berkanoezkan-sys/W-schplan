/**
 * Wöschplan iPhone E2E demo — human-paced with visible clicks, no white-screen transitions.
 */
import { chromium, devices } from 'playwright';
import { mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const OUT_DIR = join(ROOT, 'docs', 'demo');
const VIDEO_TMP = join(__dirname, '.videos');
const API = process.env.API_URL ?? 'http://localhost:3001';
const APP = process.env.APP_URL ?? 'http://localhost:8081';

const ts = Date.now();
const BUILDING_NAME = `Seefeld Demo ${ts}`;
const BUILDING_ADDRESS = 'Seefeldstrasse 88, 8008 Zürich';
const RESIDENT_EMAIL = `bewohner.demo.${ts}@woeschplan.local`;
const RESIDENT_PASSWORD = 'demo12345678';

const iPhone = devices['iPhone 14 Pro'];
const LOADING_TEXT = 'Laden…';

/** Timing knobs — brisk demo pacing with smooth transitions */
const TIMING = {
  slowMo: 35,
  afterClick: 320,
  afterType: 240,
  betweenFields: 200,
  stepCaption: 1200,
  screenSettle: 280,
  typeDelay: 28,
  captionFadeIn: 220,
  captionFadeOut: 180,
  captionHold: 900,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function loginApi(email, password) {
  const { token } = await api('/auth/login', { method: 'POST', body: { email, password } });
  return token;
}

/** Wait until loading spinners disappear and optional anchor text is visible */
async function waitForAppReady(page, { text, exact = false, timeout = 45000 } = {}) {
  await page.waitForFunction(
    (loading) => !document.body?.innerText?.includes(loading),
    LOADING_TEXT,
    { timeout },
  ).catch(() => {});

  if (text) {
    await page.getByText(text, { exact }).filter({ visible: true }).first().waitFor({
      state: 'visible',
      timeout,
    });
  }

  await sleep(TIMING.screenSettle);
}

async function reselectBuilding(page, buildingName) {
  await humanClick(page, page.getByText('Aktuelles Gebäude').filter({ visible: true }), { highlight: false });
  await page.waitForSelector('text=Gebäude wählen', { timeout: 10000 });
  const option = page.getByRole('dialog').getByText(buildingName, { exact: true });
  await option.scrollIntoViewIfNeeded({ timeout: 15000 });
  await humanClick(page, option, { highlight: false });
  await page.getByText('Gebäude wählen').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await waitForAppReady(page, { text: buildingName, exact: true });
}

async function selectBuildingByName(page, buildingName) {
  const current = page.getByText(buildingName, { exact: true }).filter({ visible: true });
  if (await current.isVisible().catch(() => false)) return;

  await humanClick(page, page.getByText('Aktuelles Gebäude').filter({ visible: true }));
  await page.waitForSelector('text=Gebäude wählen', { timeout: 10000 });
  const option = page.getByRole('dialog').getByText(buildingName, { exact: true });
  await option.scrollIntoViewIfNeeded({ timeout: 15000 });
  await humanClick(page, option);
  await waitForAppReady(page, { text: buildingName, exact: true });
}

async function reloadAppData(page) {
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await injectDemoUi(page);
  await waitForAppReady(page, { text: 'Aktuelles Gebäude' });
}

async function openBuildingDetails(page) {
  await page.getByText('Aktuelles Gebäude').filter({ visible: true }).scrollIntoViewIfNeeded();

  const bannerBtn = page.getByRole('button', { name: 'Details anzeigen' }).filter({ visible: true });
  if (await bannerBtn.isVisible().catch(() => false)) {
    await humanClick(page, bannerBtn);
    return;
  }

  await humanClick(page, page.getByRole('link', { name: 'Details anzeigen' }).filter({ visible: true }));
}

/** Inject visual helpers once per page load */
async function injectDemoUi(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'demo-ui-styles';
    style.textContent = `
      html, body, #root, #root > div {
        min-height: 100vh !important;
        height: 100% !important;
        background: #F8FAFB !important;
      }
      #demo-viewport-fill {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: #F8FAFB !important;
        z-index: 0 !important;
        pointer-events: none !important;
      }
      #root, #root > div {
        position: relative !important;
        z-index: 1 !important;
      }
      @keyframes demo-caption-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
      @keyframes demo-caption-out { from { opacity:1; } to { opacity:0; transform:translateY(-6px); } }
      @keyframes demo-ripple { 0% { transform:scale(0.3); opacity:0.85; } 100% { transform:scale(2.8); opacity:0; } }
      @keyframes demo-highlight { 0%,100% { box-shadow:0 0 0 0 rgba(107,192,74,0); } 50% { box-shadow:0 0 0 4px rgba(107,192,74,0.55); } }
      .demo-highlight-target { animation: demo-highlight 0.55s ease-in-out 1 !important; border-radius:10px !important; }
    `;
    document.head.appendChild(style);
  });
}

async function hideCaption(page) {
  await page.evaluate(() => document.getElementById('e2e-caption')?.remove());
}

/** Show caption below the stack header — never during navigation transitions */
async function showCaption(page, text, ms = TIMING.stepCaption) {
  await injectDemoUi(page);
  await hideCaption(page);
  await page.evaluate(({ caption, fadeIn }) => {
    const el = document.createElement('div');
    el.id = 'e2e-caption';
    Object.assign(el.style, {
      position: 'fixed', top: '108px', left: '14px', right: '14px', zIndex: '99999',
      background: 'rgb(30, 68, 112)', color: '#fff', padding: '11px 14px',
      borderRadius: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '14px', fontWeight: '600', textAlign: 'center', pointerEvents: 'none',
      boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
      animation: `demo-caption-in ${fadeIn}ms ease-out`,
      lineHeight: '1.35',
    });
    el.textContent = caption;
    document.body.appendChild(el);
  }, { caption: text, fadeIn: TIMING.captionFadeIn });
  await sleep(ms);
  await page.evaluate(({ fadeOut }) => {
    const el = document.getElementById('e2e-caption');
    if (!el) return;
    el.style.animation = `demo-caption-out ${fadeOut}ms ease-in forwards`;
  }, { fadeOut: TIMING.captionFadeOut });
  await sleep(TIMING.captionFadeOut + 40);
  await hideCaption(page);
}

async function showClickRipple(page, x, y) {
  await page.evaluate(({ px, py }) => {
    const ripple = document.createElement('div');
    ripple.className = 'demo-click-ripple';
    Object.assign(ripple.style, {
      position: 'fixed', left: `${px - 18}px`, top: `${py - 18}px`,
      width: '36px', height: '36px', borderRadius: '50%',
      background: 'rgba(107, 192, 74, 0.55)', zIndex: '99997', pointerEvents: 'none',
      animation: 'demo-ripple 0.65s ease-out forwards',
    });
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }, { px: x, py: y });
}

async function humanClick(page, locator, { pauseAfter = TIMING.afterClick, highlight = true } = {}) {
  await locator.waitFor({ state: 'visible', timeout: 20000 });
  await locator.scrollIntoViewIfNeeded();

  const box = await locator.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y, { steps: 10 });
    await sleep(100);

    if (highlight) {
      await page.evaluate((el) => {
        if (el instanceof HTMLElement) {
          el.classList.add('demo-highlight-target');
          setTimeout(() => el.classList.remove('demo-highlight-target'), 900);
        }
      }, await locator.elementHandle());
      await sleep(180);
    }

    await showClickRipple(page, x, y);
    await page.mouse.click(x, y);
  } else {
    await locator.click();
  }
  await sleep(pauseAfter);
}

async function resolveField(page, { label, placeholder }) {
  if (placeholder) return page.getByPlaceholder(placeholder).first();
  const byLabel = page.getByLabel(label, { exact: false }).first();
  if (await byLabel.isVisible().catch(() => false)) return byLabel;
  const labelNode = page.getByText(label, { exact: true }).first();
  await labelNode.waitFor({ state: 'visible', timeout: 20000 });
  return labelNode.locator('xpath=following::input[1] | following::textarea[1]').first();
}

async function humanType(page, { label, placeholder, value }) {
  const field = await resolveField(page, { label, placeholder });
  await humanClick(page, field, { pauseAfter: 400 });
  await field.fill('');
  await sleep(200);
  for (const char of value) {
    await field.pressSequentially(char, { delay: TIMING.typeDelay });
  }
  await sleep(TIMING.afterType);
}

async function humanTapText(page, text, opts = {}) {
  const loc = page.getByText(text, { exact: opts.exact ?? false }).first();
  await humanClick(page, loc);
}

async function tapBack(page, { pauseAfter = 280 } = {}) {
  await hideCaption(page);

  const selectors = [
    page.locator('[aria-label="Zurück"], [aria-label="Back"]').filter({ visible: true }).first(),
    page.getByRole('button', { name: /zurück|back/i }).filter({ visible: true }).first(),
    page.locator('header a, header button, [data-testid="header-back"]').filter({ visible: true }).first(),
  ];

  for (const back of selectors) {
    if (await back.isVisible().catch(() => false)) {
      await humanClick(page, back, { highlight: false, pauseAfter });
      return true;
    }
  }

  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(pauseAfter);
  return true;
}

async function goToDashboard(page) {
  await hideCaption(page);
  const dashboardMarker = page.getByText('Aktuelles Gebäude').filter({ visible: true });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await dashboardMarker.isVisible().catch(() => false)) {
      await waitForScreenStable(page, { text: 'Aktuelles Gebäude' });
      return;
    }

    if (await tapBack(page)) continue;

    const tab = page.getByRole('tab', { name: 'Übersicht' });
    if (await tab.isVisible().catch(() => false)) {
      await humanClick(page, tab, { highlight: false, pauseAfter: 280 });
      continue;
    }

    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(350);
  }

  await waitForScreenStable(page, { text: 'Aktuelles Gebäude' });
}

async function waitForScreenStable(page, { text, exact = false, timeout = 20000 } = {}) {
  await waitForAppReady(page, { text, exact, timeout });
  await page.waitForFunction(
    (loading) => !document.body?.innerText?.includes(loading),
    LOADING_TEXT,
    { timeout },
  ).catch(() => {});
  await sleep(TIMING.screenSettle);
}

async function waitForResourcesSynced(page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('Noch keine Waschküche eingerichtet'),
    null,
    { timeout: 20000 },
  ).catch(() => {});
  await sleep(300);
}

async function showAdminLogin(page) {
  await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => localStorage.removeItem('woeschplan_token'));
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await injectDemoUi(page);
  await showCaption(page, 'Schritt 1 · Als Administrator anmelden', 1400);
  await waitForAppReady(page, { text: 'Anmelden' });

  await showCaption(page, 'E-Mail-Adresse eingeben', 1200);
  await humanType(page, { label: 'E-Mail', value: 'admin@woeschplan.local' });
  await sleep(TIMING.betweenFields);

  await showCaption(page, 'Passwort eingeben', 1100);
  await humanType(page, { label: 'Passwort', value: 'admin12345' });
  await sleep(TIMING.betweenFields);

  await showCaption(page, 'Anmelden tippen', 1100);
  await humanTapText(page, 'Anmelden');
  await waitForAppReady(page, { text: 'Aktuelles Gebäude' });
}

async function openBuildingPicker(page) {
  await showCaption(page, 'Gebäude-Auswahl öffnen', 1100);
  await humanClick(page, page.getByText('Aktuelles Gebäude'));
  await page.waitForSelector('text=Gebäude wählen', { timeout: 10000 });
  await sleep(600);
}

async function createBuildingUi(page) {
  await showCaption(page, 'Schritt 2 · Neues Gebäude anlegen', 1600);
  await openBuildingPicker(page);
  await showCaption(page, '«Gebäude hinzufügen» wählen', 1100);
  await humanTapText(page, 'Gebäude hinzufügen');
  await waitForAppReady(page, { text: 'Neues Gebäude' });

  await showCaption(page, 'Gebäudename eingeben', 2000);
  await humanType(page, { placeholder: 'z. B. Limmatquai 12', value: BUILDING_NAME });
  await sleep(TIMING.betweenFields);

  await showCaption(page, 'Adresse eingeben', 2000);
  await humanType(page, { placeholder: 'Strasse, PLZ Ort', value: BUILDING_ADDRESS });
  await sleep(TIMING.betweenFields);

  await showCaption(page, 'Gebäude erstellen', 1800);
  await humanClick(page, page.getByRole('button', { name: 'Erstellen' }));
  await waitForAppReady(page, { text: 'Aktuelles Gebäude' });
}

async function setupLaundryViaApi(adminToken, buildingId) {
  const ug = await api(`/buildings/${buildingId}/laundry-rooms`, {
    method: 'POST', token: adminToken, body: { name: 'Waschküche UG', floor: 'UG' },
  });
  const og = await api(`/buildings/${buildingId}/laundry-rooms`, {
    method: 'POST', token: adminToken, body: { name: 'Waschküche 1. OG', floor: '1. OG' },
  });
  for (const [room, machines] of [
    [ug, ['Waschmaschine 1', 'Waschmaschine 2', 'Tumbler 1']],
    [og, ['Waschmaschine 3', 'Tumbler 2', 'Tumbler 3']],
  ]) {
    for (const name of machines) {
      const type = name.includes('Tumbler') ? 'TUMBLE_DRYER' : 'WASHING_MACHINE';
      await api(`/buildings/${buildingId}/laundry-rooms/${room.id}/resources`, {
        method: 'POST', token: adminToken,
        body: { name, resourceType: type, estimatedDefaultRuntime: type === 'TUMBLE_DRYER' ? 60 : 90 },
      });
    }
  }
}

async function showLaundryStructure(page, adminToken, buildingId) {
  await api('/auth/me/preferred-building', { method: 'PATCH', token: adminToken, body: { buildingId } });

  await showCaption(page, 'Schritt 3 · Waschküchen & Maschinen', 1400);
  await reloadAppData(page);
  await selectBuildingByName(page, BUILDING_NAME);
  await waitForResourcesSynced(page);

  await showCaption(page, 'Gebäudedetails öffnen', 1000);
  await openBuildingDetails(page);
  await waitForScreenStable(page, { text: 'Gebäudedetails' });
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return text.includes('3 WM · 3 Tumbler') || text.includes('Waschküche UG');
    },
    null,
    { timeout: 20000 },
  ).catch(() => {});

  await showCaption(page, '2 Waschküchen · 3 Waschmaschinen · 3 Tumbler', 1200);
  await showCaption(page, 'Waschküche UG und 1. OG eingerichtet', 1200);

  await showCaption(page, 'Waschküchen-Liste öffnen', 900);
  const structureRow = page.getByText(/2 · 3 WM · 3 Tumbler/).filter({ visible: true }).first();
  await humanClick(page, structureRow, { highlight: false, pauseAfter: 250 });
  await waitForScreenStable(page, { text: 'Waschküche UG' });
  await sleep(TIMING.captionHold);

  await hideCaption(page);
  await goToDashboard(page);
}

async function createElevatorNotice(page) {
  await showCaption(page, 'Schritt 4 · Lift-Bauhinweis erstellen', 1600);

  await showCaption(page, 'Gebäudehinweise öffnen', 1100);
  await humanClick(page, page.getByText('Gebäudehinweise & Ereignisse'));
  await waitForAppReady(page, { text: 'Gebäudehinweise' });

  await showCaption(page, 'Neuen Hinweis erstellen', 1800);
  await humanClick(page, page.getByRole('button', { name: 'Hinweis erstellen' }).first());
  await waitForAppReady(page, { text: 'Lift' });

  await showCaption(page, 'Kategorie «Lift» wählen', 2200);
  await humanTapText(page, 'Lift', { exact: true });
  await sleep(800);

  await showCaption(page, 'Hinweis speichern (erscheint als Pop-up)', 2200);
  await humanClick(page, page.getByRole('button', { name: 'Speichern' }).first());
  await waitForAppReady(page, { text: 'Gebäudehinweise' });
}

async function showRegistrationPage(page) {
  await showCaption(page, 'Schritt 5 · Bewohner-Registrierung', 1600);
  await goToDashboard(page);

  await showCaption(page, 'Registrierungslink & QR-Code', 1800);
  await humanClick(page, page.getByText('Bewohner-Registrierung'));
  await waitForAppReady(page, { text: 'Bewohner-Registrierung' });
  await showCaption(page, 'QR-Code & Link für Bewohner teilen', 3500);
}

async function openJoinPage(page, joinPath) {
  await showCaption(page, 'Registrierungsseite für Bewohner', 2400);
  await page.evaluate(() => localStorage.removeItem('woeschplan_token'));
  await page.goto(`${APP}${joinPath}`, { waitUntil: 'networkidle', timeout: 60000 });
  await injectDemoUi(page);
  await waitForAppReady(page, { text: 'Registrierung' });
  await showCaption(page, 'Gebäude wird automatisch erkannt', 2400);
}

async function registerResident(page) {
  await showCaption(page, 'Persönliche Daten eingeben', 2000);
  await humanType(page, { label: 'Vorname', value: 'Lina' });
  await sleep(TIMING.betweenFields);
  await humanType(page, { label: 'Nachname', value: 'Bewohner' });
  await sleep(TIMING.betweenFields);
  await humanType(page, { label: 'Wohnung', value: '3A' });
  await sleep(TIMING.betweenFields);
  await humanType(page, { label: 'E-Mail', value: RESIDENT_EMAIL });
  await sleep(TIMING.betweenFields);
  await humanType(page, { label: 'Passwort', value: RESIDENT_PASSWORD });
  await sleep(TIMING.betweenFields);
  await showCaption(page, 'Konto erstellen', 1800);
  await humanTapText(page, 'Konto erstellen');
  await waitForAppReady(page, { text: 'Reservieren' });
}

async function dismissNoticePopup(page) {
  await showCaption(page, 'Schritt 6 · Pop-up: Lift ausser Betrieb', 3200);
  if (await page.getByText('Wichtiger Gebäudehinweis').isVisible().catch(() => false)) {
    await sleep(1200);
    await showCaption(page, '«Verstanden» tippen', 2000);
    await humanTapText(page, 'Verstanden');
    await waitForAppReady(page, { text: 'Reservieren' });
  }
}

async function makeReservation(page) {
  await showCaption(page, 'Schritt 7 · Waschmaschine reservieren', 2400);

  const reserveCta = page.getByText('Jetzt reservieren').first();
  if (await reserveCta.isVisible().catch(() => false)) {
    await humanClick(page, reserveCta);
  } else {
    await humanClick(page, page.getByText('Reservieren').first());
  }

  await waitForAppReady(page, { text: 'Reservation erstellen' });
  await showCaption(page, 'Waschmaschine auswählen', 2200);
  await humanClick(page, page.getByText('Waschmaschine 1', { exact: true }).first());
  await sleep(800);
  await showCaption(page, 'Zeit & Dauer bestätigen', 2200);
  await humanClick(page, page.getByRole('button', { name: 'Reservieren' }));
  await waitForAppReady(page);
}

async function goToScheduleTab(page) {
  const tab = page.getByRole('tab', { name: 'Plan' });
  if (await tab.isVisible().catch(() => false)) {
    await humanClick(page, tab, { highlight: false, pauseAfter: 400 });
  } else {
    await page.goto(`${APP}/(main)/(tabs)/schedule`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await injectDemoUi(page);
  }
  await waitForAppReady(page);
}

async function selectScheduleView(page, label) {
  let toggle = page.getByRole('button', { name: label, exact: true }).filter({ visible: true }).first();
  if (!(await toggle.isVisible().catch(() => false))) {
    toggle = page.getByText(label, { exact: true }).filter({ visible: true }).first();
  }
  if (!(await toggle.isVisible().catch(() => false))) return;
  await humanClick(page, toggle, { highlight: false });
  await sleep(TIMING.screenSettle);
}

async function filterCalendarMachine(page, machineName) {
  const chip = page.getByText(new RegExp(machineName.replace(/\s+/g, '\\s*'))).filter({ visible: true }).first();
  if (await chip.isVisible().catch(() => false)) {
    await chip.scrollIntoViewIfNeeded();
    await humanClick(page, chip);
    await sleep(TIMING.screenSettle);
  }
}

async function scrollCalendarToOwnReservation(page) {
  await page.evaluate(() => {
    const scrollables = Array.from(document.querySelectorAll('div')).filter((el) => {
      const style = window.getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 120;
    });
    const timeline = scrollables.find((el) => el.scrollHeight > 900) ?? scrollables.at(-1);
    if (timeline) timeline.scrollTop = 13 * 44;

    const reservation = Array.from(document.querySelectorAll('*')).find((el) => {
      const text = el.textContent?.trim() ?? '';
      return text.includes('Ihre Reservation') || text === 'Reserviert';
    });
    reservation?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }).catch(() => {});
  await sleep(1000);
}

async function showResidentCalendar(page) {
  await showCaption(page, 'Schritt 8 · Kalender — Reservation im Überblick', 1800);
  await goToScheduleTab(page);
  await filterCalendarMachine(page, 'Waschmaschine 1');

  await showCaption(page, 'Tagesansicht: Maschine, Zeit & Status', 1600);
  await selectScheduleView(page, 'Tag');
  await humanClick(page, page.getByText('Heute', { exact: true }).filter({ visible: true }).first());
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Waschmaschine 1') ||
      document.body.innerText.includes('Ihre Reservation') ||
      document.body.innerText.includes('Reserviert'),
    null,
    { timeout: 20000 },
  ).catch(() => {});
  await scrollCalendarToOwnReservation(page);
  await showCaption(page, 'Eigene Reservation klar erkennbar', 1400);
  await sleep(800);

  await showCaption(page, 'Wochenansicht — ganze Woche auf einen Blick', 1600);
  await selectScheduleView(page, 'Woche');
  await page.waitForFunction(
    () => /\\d{1,2}\\.\\s*\\w+\\s*[–-]\\s*\\d{1,2}\\./.test(document.body.innerText),
    null,
    { timeout: 15000 },
  ).catch(() => {});
  await scrollCalendarToOwnReservation(page);
  await sleep(1500);

  await showCaption(page, 'Monatsansicht — freie Tage schnell erkennen', 1600);
  await selectScheduleView(page, 'Monat');
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return /\\b(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\\b\\s*\\d{4}/.test(text);
    },
    null,
    { timeout: 15000 },
  ).catch(() => {});
  await sleep(1500);
}

async function waitForAdminReservationList(page) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return text.includes('Lina Bewohner') && /\d{1,2}:\d{2}[–-]\d{1,2}:\d{2}/.test(text);
    },
    null,
    { timeout: 30000 },
  );
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollHeight > el.clientHeight + 80) el.scrollTop = el.scrollHeight;
    }
  }).catch(() => {});
  const row = page.getByText(/Lina Bewohner/).filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(1800);
}

async function showAdminCalendar(page, buildingName, buildingId, adminToken) {
  await showCaption(page, 'Schritt 9 · Verwaltung: alle Reservationen', 1800);
  await api('/auth/me/preferred-building', { method: 'PATCH', token: adminToken, body: { buildingId } });

  await page.addInitScript(
    ({ token, id }) => {
      localStorage.setItem('woeschplan_token', token);
      localStorage.setItem('woeschplan_selected_building', id);
    },
    { token: adminToken, id: buildingId },
  );
  await page.goto(APP, { waitUntil: 'networkidle', timeout: 60000 });
  await injectDemoUi(page);
  await waitForAppReady(page);

  if (await page.getByText('Anmelden').isVisible().catch(() => false)) {
    await humanType(page, { label: 'E-Mail', value: 'admin@woeschplan.local' });
    await sleep(TIMING.betweenFields);
    await humanType(page, { label: 'Passwort', value: 'admin12345' });
    await humanTapText(page, 'Anmelden');
    await waitForAppReady(page);
    await selectBuildingByName(page, buildingName);
  } else if (!(await page.getByText(buildingName, { exact: true }).isVisible().catch(() => false))) {
    if (await page.getByText('Aktuelles Gebäude').isVisible().catch(() => false)) {
      await selectBuildingByName(page, buildingName);
    }
  }

  await goToScheduleTab(page);
  await page.getByText('Reservationen', { exact: true }).filter({ visible: true }).first().waitFor({
    state: 'visible',
    timeout: 20000,
  }).catch(() => {});

  await showCaption(page, 'Reservationen heute im Gebäude', 1600);
  await waitForAdminReservationList(page).catch(async () => {
    await goToDashboard(page);
    if (await page.getByText('Aktuelles Gebäude').isVisible().catch(() => false)) {
      await selectBuildingByName(page, buildingName);
    }
    await goToScheduleTab(page).catch(() => {});
    await waitForAdminReservationList(page).catch(() => {});
  });

  await showCaption(page, 'Wochenübersicht für Administratoren', 1600);
  await selectScheduleView(page, 'Woche');
  await waitForAdminReservationList(page).catch(() => {});
  await showCaption(page, 'Klare Übersicht für Bewohner & Verwaltung', 1800);
  await sleep(800);
}

async function findBuildingId(adminToken, name) {
  const { buildings } = await api('/buildings', { token: adminToken });
  const match = buildings.find((b) => b.name === name);
  if (!match) throw new Error(`Building not found: ${name}`);
  return match.id;
}

/** Playwright video leaves undrawn viewport pixels as medium gray — match app background. */
const MP4_FILTER =
  "geq=r='if(between(r(X\\,Y),110,140)*between(g(X\\,Y),110,140)*between(b(X\\,Y),110,140),248,r(X\\,Y))'" +
  ":g='if(between(r(X\\,Y),110,140)*between(g(X\\,Y),110,140)*between(b(X\\,Y),110,140),250,g(X\\,Y))'" +
  ":b='if(between(r(X\\,Y),110,140)*between(g(X\\,Y),110,140)*between(b(X\\,Y),110,140),251,b(X\\,Y))'";

async function convertToMp4(webmPath, mp4Path) {
  try {
    execSync(
      `ffmpeg -y -i "${webmPath}" -vf "${MP4_FILTER}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`,
      { stdio: 'pipe' },
    );
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(VIDEO_TMP, { recursive: true });

  console.log('Starting human-paced Wöschplan iPhone demo…');

  const browser = await chromium.launch({
    headless: true,
    slowMo: TIMING.slowMo,
  });
  const context = await browser.newContext({
    ...iPhone,
    locale: 'de-CH',
    colorScheme: 'light',
    recordVideo: { dir: VIDEO_TMP, size: { width: 393, height: 852 } },
  });

  await context.addInitScript(() => {
    const fillViewport = () => {
      document.documentElement.style.background = '#F8FAFB';
      document.documentElement.style.minHeight = '100vh';
      document.body.style.background = '#F8FAFB';
      document.body.style.minHeight = '100vh';
      document.body.style.margin = '0';

      let fill = document.getElementById('demo-viewport-fill');
      if (!fill) {
        fill = document.createElement('div');
        fill.id = 'demo-viewport-fill';
        document.body.prepend(fill);
      }
      Object.assign(fill.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        background: '#F8FAFB',
        zIndex: '0',
        pointerEvents: 'none',
      });
    };

    fillViewport();
    window.addEventListener('DOMContentLoaded', fillViewport);
    window.addEventListener('load', fillViewport);
  });

  const page = await context.newPage();
  let adminToken, buildingId, joinPath;

  try {
    await showAdminLogin(page);
    adminToken = await loginApi('admin@woeschplan.local', 'admin12345');

    await createBuildingUi(page);
    buildingId = await findBuildingId(adminToken, BUILDING_NAME);

    await setupLaundryViaApi(adminToken, buildingId);
    await showLaundryStructure(page, adminToken, buildingId);

    await createElevatorNotice(page);

    const reg = await api(`/buildings/${buildingId}/registration/regenerate`, {
      method: 'POST', token: adminToken,
    });
    joinPath = `/join/${encodeURIComponent(reg.token)}`;
    await showRegistrationPage(page);

    await showCaption(page, 'Als Bewohner registrieren', 2200);
    await openJoinPage(page, joinPath);
    await registerResident(page);

    await dismissNoticePopup(page);
    await makeReservation(page);

    await showResidentCalendar(page);
    await showAdminCalendar(page, BUILDING_NAME, buildingId, adminToken);

    await showCaption(page, 'Demo abgeschlossen — danke fürs Zuschauen!', 1600);
    console.log('Human-paced demo completed successfully.');
  } catch (err) {
    console.error('Demo failed:', err);
    await page.screenshot({ path: join(OUT_DIR, 'e2e-failure.png'), fullPage: true });
    throw err;
  } finally {
    await context.close();
    await browser.close();
  }

  const files = await readdir(VIDEO_TMP);
  const webms = [];
  for (const f of files) {
    if (f.endsWith('.webm')) {
      const p = join(VIDEO_TMP, f);
      webms.push({ path: p, mtime: (await stat(p)).mtimeMs });
    }
  }
  webms.sort((a, b) => b.mtime - a.mtime);
  if (!webms.length) throw new Error('No video file recorded');

  const webmOut = join(OUT_DIR, 'woeschplan-iphone-demo.webm');
  const mp4Out = join(OUT_DIR, 'woeschplan-iphone-demo.mp4');
  await copyFile(webms[0].path, webmOut);
  console.log(`Video saved: ${webmOut}`);

  if (await convertToMp4(webmOut, mp4Out)) {
    console.log(`MP4 saved: ${mp4Out}`);
  }

  console.log('\n── Summary ──');
  console.log(`Building: ${BUILDING_NAME}`);
  console.log(`Resident: ${RESIDENT_EMAIL} / ${RESIDENT_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
