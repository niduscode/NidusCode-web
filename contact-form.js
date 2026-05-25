/**
 * Backend del formulario de contacto · Supabase REST
 * Tabla: public.contact_messages (RLS: solo INSERT para anon)
 *
 * Usamos fetch directo (no SDK) porque las nuevas publishable keys de
 * Supabase deben ir solo en `apikey:`, no en `Authorization: Bearer`.
 * La publishable key es pública por diseño — la seguridad la da el RLS.
 */

const SUPABASE_URL = 'https://jnwqxlxvcinfkpuvqlze.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QUcB4ChlR8xmNtncRIt4yg_xnjmI5T3';
const ENDPOINT     = `${SUPABASE_URL}/rest/v1/contact_messages`;

// =====================================================================
// Países para el dropdown del teléfono — orden: default + LATAM + resto
// =====================================================================
const COUNTRIES = [
  { iso: 'CL', name: 'Chile',             flag: '🇨🇱', code: '+56'  },
  { iso: 'AR', name: 'Argentina',         flag: '🇦🇷', code: '+54'  },
  { iso: 'MX', name: 'México',            flag: '🇲🇽', code: '+52'  },
  { iso: 'CO', name: 'Colombia',          flag: '🇨🇴', code: '+57'  },
  { iso: 'PE', name: 'Perú',              flag: '🇵🇪', code: '+51'  },
  { iso: 'UY', name: 'Uruguay',           flag: '🇺🇾', code: '+598' },
  { iso: 'EC', name: 'Ecuador',           flag: '🇪🇨', code: '+593' },
  { iso: 'BO', name: 'Bolivia',           flag: '🇧🇴', code: '+591' },
  { iso: 'PY', name: 'Paraguay',          flag: '🇵🇾', code: '+595' },
  { iso: 'VE', name: 'Venezuela',         flag: '🇻🇪', code: '+58'  },
  { iso: 'BR', name: 'Brasil',            flag: '🇧🇷', code: '+55'  },
  { iso: 'CR', name: 'Costa Rica',        flag: '🇨🇷', code: '+506' },
  { iso: 'PA', name: 'Panamá',            flag: '🇵🇦', code: '+507' },
  { iso: 'DO', name: 'R. Dominicana',     flag: '🇩🇴', code: '+1'   },
  { iso: 'GT', name: 'Guatemala',         flag: '🇬🇹', code: '+502' },
  { iso: 'HN', name: 'Honduras',          flag: '🇭🇳', code: '+504' },
  { iso: 'SV', name: 'El Salvador',       flag: '🇸🇻', code: '+503' },
  { iso: 'NI', name: 'Nicaragua',         flag: '🇳🇮', code: '+505' },
  { iso: 'CU', name: 'Cuba',              flag: '🇨🇺', code: '+53'  },
  { iso: 'PR', name: 'Puerto Rico',       flag: '🇵🇷', code: '+1'   },
  { iso: 'ES', name: 'España',            flag: '🇪🇸', code: '+34'  },
  { iso: 'US', name: 'Estados Unidos',    flag: '🇺🇸', code: '+1'   },
  { iso: 'CA', name: 'Canadá',            flag: '🇨🇦', code: '+1'   },
  { iso: 'GB', name: 'Reino Unido',       flag: '🇬🇧', code: '+44'  },
  { iso: 'FR', name: 'Francia',           flag: '🇫🇷', code: '+33'  },
  { iso: 'DE', name: 'Alemania',          flag: '🇩🇪', code: '+49'  },
  { iso: 'IT', name: 'Italia',            flag: '🇮🇹', code: '+39'  },
  { iso: 'PT', name: 'Portugal',          flag: '🇵🇹', code: '+351' },
];

// =====================================================================
// Refs DOM
// =====================================================================
const form         = document.getElementById('contact-form');
const button       = document.getElementById('contact-submit');
const label        = button?.querySelector('.contact-btn-label');
const feedback     = document.getElementById('contact-feedback');
const countryBtn   = document.getElementById('phone-country-btn');
const countryPanel = document.getElementById('phone-country-panel');
const countryList  = document.getElementById('phone-country-list');
const countrySearch = document.getElementById('phone-country-search');
const flagEl       = countryBtn?.querySelector('.phone-flag');
const codeEl       = countryBtn?.querySelector('.phone-code');
const phoneInput   = document.getElementById('telefono');

// País seleccionado actual
let selectedCountry = COUNTRIES.find(c => c.iso === 'CL') || COUNTRIES[0];

// =====================================================================
// Dropdown de países
// =====================================================================
function renderCountryList(filter = '') {
  if (!countryList) return;
  const q = filter.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const items = COUNTRIES.filter(c => {
    if (!q) return true;
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.iso.toLowerCase().includes(q))  return true;
    if (digits && c.code.includes(digits)) return true;
    return false;
  });
  countryList.innerHTML = items.map(c => `
    <li role="option"
        class="phone-country-item${c.iso === selectedCountry.iso ? ' is-selected' : ''}"
        data-iso="${c.iso}"
        aria-selected="${c.iso === selectedCountry.iso}">
      <span class="phone-country-flag" aria-hidden="true">${c.flag}</span>
      <span class="phone-country-name">${c.name}</span>
      <span class="phone-country-code">${c.code}</span>
    </li>
  `).join('');
  if (items.length === 0) {
    countryList.innerHTML = '<li class="phone-country-empty">Sin resultados</li>';
  }
}

function openCountryPanel() {
  if (!countryPanel || !countryBtn) return;
  countryPanel.hidden = false;
  countryBtn.setAttribute('aria-expanded', 'true');
  renderCountryList('');
  if (countrySearch) {
    countrySearch.value = '';
    setTimeout(() => countrySearch.focus(), 50);
  }
}

function closeCountryPanel() {
  if (!countryPanel || !countryBtn) return;
  countryPanel.hidden = true;
  countryBtn.setAttribute('aria-expanded', 'false');
}

function selectCountry(iso) {
  const c = COUNTRIES.find(x => x.iso === iso);
  if (!c) return;
  selectedCountry = c;
  if (flagEl) flagEl.textContent = c.flag;
  if (codeEl) codeEl.textContent = c.code;
  closeCountryPanel();
  phoneInput?.focus();
}

if (countryBtn) {
  countryBtn.addEventListener('click', () => {
    if (countryPanel.hidden) openCountryPanel();
    else closeCountryPanel();
  });
}

if (countryList) {
  countryList.addEventListener('click', (e) => {
    const item = e.target.closest('.phone-country-item');
    if (item) selectCountry(item.dataset.iso);
  });
}

if (countrySearch) {
  countrySearch.addEventListener('input', () => renderCountryList(countrySearch.value));
  countrySearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCountryPanel();
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = countryList?.querySelector('.phone-country-item');
      if (first) selectCountry(first.dataset.iso);
    }
  });
}

// Click fuera → cerrar
document.addEventListener('click', (e) => {
  if (!countryPanel || countryPanel.hidden) return;
  const wrap = e.target.closest('.phone-input-wrap');
  if (!wrap) closeCountryPanel();
});

// Tecla Escape → cerrar
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && countryPanel && !countryPanel.hidden) closeCountryPanel();
});

// Solo permitir dígitos, espacios y guiones en el input
if (phoneInput) {
  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/[^\d\s\-()]/g, '');
  });
}

// =====================================================================
// Submit del form
// =====================================================================
if (form && button && feedback) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot
    const honeypot = form.querySelector('input[name="website"]')?.value || '';
    if (honeypot.trim() !== '') {
      showFeedback('ok', '¡Gracias! Te respondemos en menos de 24h.');
      form.reset();
      return;
    }

    // Construir el teléfono completo en formato E.164 limpio
    const rawPhone = (form.telefono?.value || '').replace(/\D/g, '');
    const fullPhone = rawPhone ? `${selectedCountry.code}${rawPhone}` : '';

    const payload = {
      nombre:     form.nombre.value.trim(),
      email:      form.email.value.trim(),
      telefono:   fullPhone,
      pais:       selectedCountry.name,
      servicio:   form.servicio.value,
      mensaje:    form.mensaje.value.trim(),
      user_agent: navigator.userAgent.slice(0, 280),
      origen:     location.hostname || 'local'
    };

    // Validaciones
    if (!payload.nombre || !payload.email || !payload.mensaje) {
      showFeedback('error', 'Por favor completá nombre, email y mensaje.');
      return;
    }
    if (rawPhone.length < 6) {
      showFeedback('error', 'Por favor ingresá un número de teléfono válido.');
      phoneInput?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'apikey':       SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer':       'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status}: ${detail.slice(0, 200)}`);
      }

      showFeedback('ok',
        '¡Gracias por escribirnos! Recibimos tu mensaje y te respondemos en menos de 24 horas.');
      form.reset();
      // El reset del form no toca el país seleccionado — lo mantenemos
    } catch (err) {
      console.error('[contact-form]', err);
      showFeedback('error',
        'No pudimos enviar tu mensaje. Probá de nuevo o escribinos directo a niduscode@gmail.com.');
    } finally {
      setLoading(false);
    }
  });
}

function setLoading(on) {
  if (!button || !label) return;
  button.disabled = on;
  button.classList.toggle('is-loading', on);
  label.textContent = on ? 'Enviando…' : 'Enviar mensaje';
}

function showFeedback(kind, msg) {
  if (!feedback) return;
  feedback.hidden = false;
  feedback.dataset.kind = kind;
  feedback.textContent = msg;
  feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
