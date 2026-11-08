/**
 * sections.ts — Creates the DOM sections that sit over the canvas.
 *
 * Each section corresponds to a scroll-story stage. Their heights are
 * proportional to the stage's share of the scroll container.
 *
 * Cards use IntersectionObserver to toggle a `.visible` class for
 * their fade-in transition (CSS-driven).
 */

import { BRAND, ROUTE, STAGES, SCROLL_HEIGHT_VH } from '../config';

/* ── Height helper ────────────────────────────────────────────────── */

function stageHeight(stage: { start: number; end: number }): string {
  const vh = (stage.end - stage.start) * SCROLL_HEIGHT_VH;
  return `${vh}vh`;
}

/* ── Build all sections ───────────────────────────────────────────── */

export function createSections(): void {
  const container = document.getElementById('scroll-container');
  if (!container) return;

  /* Set total scroll height */
  container.style.height = `${SCROLL_HEIGHT_VH}vh`;

  /* ── 1. Hero ────────────────────────────────────────────────────── */
  const hero = section('hero', stageHeight(STAGES.hero), 'section-center');
  hero.innerHTML = `
    <div class="hero-content">
      <div class="route-pill">🇵🇰 Pakistan &nbsp;➔&nbsp; 🇮🇷 Iran &nbsp;➔&nbsp; 🇦🇿 Azerbaijan</div>
      <h1>${BRAND.name}</h1>
      <p class="tagline">${BRAND.tagline}</p>
      <a href="#quote-form" class="btn-cta">${BRAND.ctaText}</a>
      <div class="scroll-indicator" aria-hidden="true">
        <span>Scroll to drive across borders</span>
        <div class="arrow"></div>
      </div>
    </div>
  `;
  container.appendChild(hero);

  /* ── 2. Travel 1 (no card, just empty height for scroll) ────────── */
  container.appendChild(section('travel-1', stageHeight(STAGES.travel1)));

  /* ── 3. Stop 1 — Iran Transit Corridor card ─────────────────────── */
  const stop1 = section('stop-1', stageHeight(STAGES.stop1));
  stop1.appendChild(
    card(ROUTE[1].label, ROUTE[1].description, 'MILESTONE 1 / 2 • CROSS-BORDER TRANSIT'),
  );
  container.appendChild(stop1);

  /* ── 4. Travel 2 ────────────────────────────────────────────────── */
  container.appendChild(section('travel-2', stageHeight(STAGES.travel2)));

  /* ── 5. Stop 2 — Azerbaijan Destination card ────────────────────── */
  const stop2 = section('stop-2', stageHeight(STAGES.stop2), 'section-right');
  stop2.appendChild(
    card(ROUTE[2].label, ROUTE[2].description, 'MILESTONE 2 / 2 • DESTINATION ARRIVAL'),
  );
  container.appendChild(stop2);

  /* ── 6. Finale — delivered + quote form ──────────────────────────── */
  const finale = section('finale', stageHeight(STAGES.finale), 'section-center');
  finale.innerHTML = `
    <div class="quote-form-wrapper">
      <div class="delivered-badge">✓ Delivered to Baku, Azerbaijan 🇦🇿</div>
      <div id="quote-form"></div>
    </div>
  `;
  container.appendChild(finale);

  /* ── Observe cards for visibility ───────────────────────────────── */
  observeCards();
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function section(id: string, height: string, extraClass = ''): HTMLElement {
  const el = document.createElement('section');
  el.id = id;
  el.className = `scroll-section ${extraClass}`.trim();
  el.style.height = height;
  return el;
}

function card(heading: string, body: string, badge?: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    ${badge ? `<div class="card-badge">${badge}</div>` : ''}
    <h2>${heading}</h2>
    <p>${body}</p>
  `;
  return el;
}

/** Fade in cards when they enter the viewport */
function observeCards(): void {
  const cards = document.querySelectorAll('.card');
  if (!cards.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('visible', entry.isIntersecting);
      }
    },
    { threshold: 0.3 },
  );

  cards.forEach((c) => observer.observe(c));
}

