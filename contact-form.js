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
  { iso: 'CL', name: 'Chile',             flag: '🇨🇱', code: '+56',  example: '9 1234 5678'    },
  { iso: 'AR', name: 'Argentina',         flag: '🇦🇷', code: '+54',  example: '11 2345 6789'   },
  { iso: 'MX', name: 'México',            flag: '🇲🇽', code: '+52',  example: '55 1234 5678'   },
  { iso: 'CO', name: 'Colombia',          flag: '🇨🇴', code: '+57',  example: '320 123 4567'   },
  { iso: 'PE', name: 'Perú',              flag: '🇵🇪', code: '+51',  example: '912 345 678'    },
  { iso: 'UY', name: 'Uruguay',           flag: '🇺🇾', code: '+598', example: '94 123 456'     },
  { iso: 'EC', name: 'Ecuador',           flag: '🇪🇨', code: '+593', example: '99 123 4567'    },
  { iso: 'BO', name: 'Bolivia',           flag: '🇧🇴', code: '+591', example: '71 234 567'     },
  { iso: 'PY', name: 'Paraguay',          flag: '🇵🇾', code: '+595', example: '981 123 456'    },
  { iso: 'VE', name: 'Venezuela',         flag: '🇻🇪', code: '+58',  example: '412 123 4567'   },
  { iso: 'BR', name: 'Brasil',            flag: '🇧🇷', code: '+55',  example: '11 91234 5678'  },
  { iso: 'CR', name: 'Costa Rica',        flag: '🇨🇷', code: '+506', example: '8123 4567'      },
  { iso: 'PA', name: 'Panamá',            flag: '🇵🇦', code: '+507', example: '6123 4567'      },
  { iso: 'DO', name: 'R. Dominicana',     flag: '🇩🇴', code: '+1',   example: '809 123 4567'   },
  { iso: 'GT', name: 'Guatemala',         flag: '🇬🇹', code: '+502', example: '5123 4567'      },
  { iso: 'HN', name: 'Honduras',          flag: '🇭🇳', code: '+504', example: '9123 4567'      },
  { iso: 'SV', name: 'El Salvador',       flag: '🇸🇻', code: '+503', example: '7123 4567'      },
  { iso: 'NI', name: 'Nicaragua',         flag: '🇳🇮', code: '+505', example: '8123 4567'      },
  { iso: 'CU', name: 'Cuba',              flag: '🇨🇺', code: '+53',  example: '5 1234567'      },
  { iso: 'PR', name: 'Puerto Rico',       flag: '🇵🇷', code: '+1',   example: '787 123 4567'   },
  { iso: 'ES', name: 'España',            flag: '🇪🇸', code: '+34',  example: '612 34 56 78'   },
  { iso: 'US', name: 'Estados Unidos',    flag: '🇺🇸', code: '+1',   example: '415 555 1234'   },
  { iso: 'CA', name: 'Canadá',            flag: '🇨🇦', code: '+1',   example: '416 555 1234'   },
  { iso: 'GB', name: 'Reino Unido',       flag: '🇬🇧', code: '+44',  example: '7700 900123'    },
  { iso: 'FR', name: 'Francia',           flag: '🇫🇷', code: '+33',  example: '6 12 34 56 78'  },
  { iso: 'DE', name: 'Alemania',          flag: '🇩🇪', code: '+49',  example: '1512 3456789'   },
  { iso: 'IT', name: 'Italia',            flag: '🇮🇹', code: '+39',  example: '312 345 6789'   },
  { iso: 'PT', name: 'Portugal',          flag: '🇵🇹', code: '+351', example: '912 345 678'    },
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
const empresaWrap  = document.getElementById('empresa-wrap');
const empresaInput = document.getElementById('empresa');
const nombreInput  = document.getElementById('nombre');
const emailInput   = document.getElementById('email');
const clientCards  = document.querySelectorAll('.client-type-card');

// Estado: tipo de cliente actual
let clientType = 'persona';

// País seleccionado actual
let selectedCountry = COUNTRIES.find(c => c.iso === 'CL') || COUNTRIES[0];

// =====================================================================
// Toggle Persona / Empresa
// =====================================================================
function setClientType(type) {
  if (type !== 'persona' && type !== 'empresa') return;
  clientType = type;

  // Botones (cards)
  clientCards.forEach(c => {
    const active = c.dataset.clientType === type;
    c.classList.toggle('is-active', active);
    c.setAttribute('aria-checked', String(active));
  });

  // Campo Empresa: visible solo en modo empresa
  if (empresaWrap) {
    empresaWrap.hidden = type !== 'empresa';
    if (empresaInput) {
      empresaInput.required = type === 'empresa';
      // Si volvemos a persona, limpiamos el valor para no enviar basura
      if (type !== 'empresa') empresaInput.value = '';
    }
  }

  // Labels y placeholders que cambian con el modo
  document.querySelectorAll('[data-label-for]').forEach(el => {
    el.hidden = el.dataset.labelFor !== type;
  });
  [nombreInput, emailInput].forEach(inp => {
    if (!inp) return;
    const ph = inp.dataset[`placeholder${type[0].toUpperCase() + type.slice(1)}`];
    if (ph) inp.placeholder = ph;
  });
}

clientCards.forEach(c => {
  c.addEventListener('click', () => setClientType(c.dataset.clientType));
});

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
  if (phoneInput && c.example) phoneInput.placeholder = c.example;
  closeCountryPanel();
  phoneInput?.focus();
}

// Setea el placeholder inicial según el país por defecto
if (phoneInput && selectedCountry.example) {
  phoneInput.placeholder = selectedCountry.example;
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

    const empresaValue = (empresaInput?.value || '').trim();
    const payload = {
      tipo_cliente: clientType,
      empresa:      clientType === 'empresa' ? empresaValue : null,
      nombre:       form.nombre.value.trim(),
      email:        form.email.value.trim(),
      telefono:     fullPhone,
      pais:         selectedCountry.name,
      servicio:     form.servicio.value,
      mensaje:      form.mensaje.value.trim(),
      user_agent:   navigator.userAgent.slice(0, 280),
      origen:       location.hostname || 'local'
    };

    // Validaciones
    if (!payload.nombre || !payload.email || !payload.mensaje) {
      showFeedback('error', 'Por favor completá nombre, email y mensaje.');
      return;
    }
    if (clientType === 'empresa' && !empresaValue) {
      showFeedback('error', 'Por favor ingresá el nombre de la empresa.');
      empresaInput?.focus();
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
