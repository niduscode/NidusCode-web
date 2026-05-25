/**
 * Backend del formulario de contacto · Supabase REST
 * Tabla: public.contact_messages (RLS: solo INSERT para anon)
 *
 * Usamos fetch directo en lugar del SDK porque:
 *  1) Una sola operación INSERT no justifica cargar 30KB de cliente
 *  2) Las nuevas "publishable keys" de Supabase deben ir SOLO en `apikey:`,
 *     no en `Authorization: Bearer` (donde van los JWTs de sesión).
 *     El SDK clásico las pone en ambos y eso choca con RLS.
 *
 * La publishable key es pública por diseño — visible en el bundle. La
 * seguridad la da el RLS de la tabla (solo INSERT permitido para anon).
 */

const SUPABASE_URL = 'https://jnwqxlxvcinfkpuvqlze.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QUcB4ChlR8xmNtncRIt4yg_xnjmI5T3';
const ENDPOINT     = `${SUPABASE_URL}/rest/v1/contact_messages`;

const form     = document.getElementById('contact-form');
const button   = document.getElementById('contact-submit');
const label    = button?.querySelector('.contact-btn-label');
const feedback = document.getElementById('contact-feedback');

if (form && button && feedback) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: si tiene contenido → bot → fingimos éxito y descartamos
    const honeypot = form.querySelector('input[name="website"]')?.value || '';
    if (honeypot.trim() !== '') {
      showFeedback('ok', '¡Gracias! Te respondemos en menos de 24h.');
      form.reset();
      return;
    }

    const payload = {
      nombre:     form.nombre.value.trim(),
      email:      form.email.value.trim(),
      servicio:   form.servicio.value,
      mensaje:    form.mensaje.value.trim(),
      user_agent: navigator.userAgent.slice(0, 280),
      origen:     location.hostname || 'local'
    };

    if (!payload.nombre || !payload.email || !payload.mensaje) {
      showFeedback('error', 'Por favor completá nombre, email y mensaje.');
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
  feedback.dataset.kind = kind; // 'ok' | 'error'
  feedback.textContent = msg;
  feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
