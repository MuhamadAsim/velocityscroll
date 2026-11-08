/**
 * quoteForm.ts — Quote request form with validation.
 *
 * Renders into #quote-form. On valid submit, logs form data to
 * console and shows a success message. No backend.
 *
 * Keyboard accessible: all inputs have labels, focus rings via CSS.
 */

import { CITIES } from '../config';

/* ── Field definitions ────────────────────────────────────────────── */

interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'tel' | 'select';
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select
  pattern?: string;
  patternMsg?: string;
}

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Ahmed Khan', required: true },
  {
    name: 'phone',
    label: 'Phone Number',
    type: 'tel',
    placeholder: '+92 300 1234567',
    required: true,
    pattern: '^[+]?[0-9\\s\\-]{7,15}$',
    patternMsg: 'Enter a valid phone number',
  },
  { name: 'pickupCity', label: 'Origin Country', type: 'select', required: true, options: CITIES },
  { name: 'dropCity', label: 'Destination Country', type: 'select', required: true, options: CITIES },
  { name: 'carModel', label: 'Car Model', type: 'text', placeholder: 'Honda Civic 2023', required: true },
];

/* ── Build form ───────────────────────────────────────────────────── */

export function createQuoteForm(): void {
  const mount = document.getElementById('quote-form');
  if (!mount) return;

  const form = document.createElement('form');
  form.className = 'quote-form';
  form.noValidate = true; // we validate ourselves
  form.setAttribute('aria-label', 'Request a shipping quote');

  for (const field of FIELDS) {
    const group = document.createElement('div');
    group.className = 'form-group';

    /* Label */
    const label = document.createElement('label');
    label.htmlFor = `field-${field.name}`;
    label.textContent = field.label;
    group.appendChild(label);

    /* Input or select */
    if (field.type === 'select') {
      const select = document.createElement('select');
      select.id = `field-${field.name}`;
      select.name = field.name;
      select.required = field.required;

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = `Select ${field.label.toLowerCase()}`;
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

      for (const opt of field.options ?? []) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      }

      group.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.id = `field-${field.name}`;
      input.name = field.name;
      input.type = field.type;
      input.required = field.required;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.pattern) input.pattern = field.pattern;
      group.appendChild(input);
    }

    /* Error slot */
    const error = document.createElement('div');
    error.className = 'form-error';
    error.id = `error-${field.name}`;
    error.setAttribute('aria-live', 'polite');
    group.appendChild(error);

    form.appendChild(group);
  }

  /* Submit button */
  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'btn-submit';
  btn.textContent = 'Request Quote';
  form.appendChild(btn);

  /* Success message (hidden initially) */
  const success = document.createElement('div');
  success.className = 'form-success';
  success.style.display = 'none';
  success.textContent = '✓ Quote requested! We\'ll call you shortly.';

  mount.appendChild(form);
  mount.appendChild(success);

  /* ── Validation & submit ────────────────────────────────────────── */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateForm(form)) {
      const data = Object.fromEntries(new FormData(form));
      console.log('[SwiftHaul] Quote submitted:', { ...data, timestamp: new Date().toISOString() });
      form.style.display = 'none';
      success.style.display = 'block';
    }
  });
}

/* ── Validation ───────────────────────────────────────────────────── */

function validateForm(form: HTMLFormElement): boolean {
  let valid = true;

  for (const field of FIELDS) {
    const el = form.elements.namedItem(field.name) as HTMLInputElement | HTMLSelectElement | null;
    const errorEl = document.getElementById(`error-${field.name}`);
    if (!el || !errorEl) continue;

    let msg = '';

    if (field.required && !el.value.trim()) {
      msg = `${field.label} is required`;
    } else if (field.pattern && el.value && !new RegExp(field.pattern).test(el.value)) {
      msg = field.patternMsg ?? 'Invalid format';
    }

    /* Same city check */
    if (field.name === 'dropCity') {
      const pickup = (form.elements.namedItem('pickupCity') as HTMLSelectElement)?.value;
      if (pickup && el.value && pickup === el.value) {
        msg = 'Drop-off city must differ from pickup city';
      }
    }

    errorEl.textContent = msg;
    if (msg) valid = false;
  }

  return valid;
}

