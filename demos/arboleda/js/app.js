/* ========================================
   La Arboleda - App principal
   ======================================== */

let allTrees = [];
let currentZone = null;
let currentFilters = { search: '', tipo: '', origen: '', zona: '' };

// Mapeo de zonas del predio (clave -> patrones de match en ubicacion)
const ZONE_MAPPING = {
    'norte': ['norte'],
    'sur': ['sur'],
    'este': ['este'],
    'oeste': ['oeste'],
    'patio': ['patio'],
    'pergola': ['pérgola', 'pergola'],
    'vereda': ['vereda'],
    'maceta': ['maceta']
};

const ZONE_INFO = {
    'norte': { name: 'Sector Norte', desc: 'Bosque nativo con especies emblemáticas del NOA: quebrachos, algarrobos y palo santo.', color: '#2E5948' },
    'sur': { name: 'Sector Sur', desc: 'Zona de especies medicinales y aromáticas: roble criollo, cedro y molles.', color: '#3A6B52' },
    'este': { name: 'Sector Este', desc: 'Ceibos, lapachos y especies ornamentales que tiñen el sector de color.', color: '#4A6FA5' },
    'oeste': { name: 'Sector Oeste', desc: 'El monte: la zona más diversa con cebiles, lapachos y especies de gran porte.', color: '#5B7DB3' },
    'patio': { name: 'Patio Central', desc: 'Pulmón verde del IES, con árboles ornamentales y zonas de sombra.', color: '#D98E32' },
    'pergola': { name: 'Pérgolas', desc: 'Enredaderas: mburucuyá, clematis y campana rey que cubren las estructuras.', color: '#B8731F' },
    'vereda': { name: 'Veredas perimetrales', desc: 'Árboles de calle: tipas, jacarandás, ceibos y lapachos rosados.', color: '#8B6F47' },
    'maceta': { name: 'Macetas (Zona NO)', desc: 'Plantines en crecimiento esperando ser trasplantados.', color: '#6B5D45' }
};

// ========================================
// Inicialización
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    initNav();
    initScrollReveal();
    initScrollIndicator();
    initContactForm();

    await loadTrees();

    // Inicializar features según la página
    if (document.getElementById('zoneMap')) initZoneMap();
    if (document.getElementById('realMap')) initRealMap();
    if (document.getElementById('speciesGrid')) initSpeciesGallery();
    if (document.getElementById('quickStats')) renderQuickStats();
    if (document.getElementById('treeModal')) initModalBindings();
});

// ========================================
// Carga de datos
// ========================================
async function loadTrees() {
    try {
        // Intenta cargar el enhanced primero (con coplas y floración)
        let enhancedData = [];
        try {
            const resE = await fetch('data/trees_data_enhanced.json');
            if (resE.ok) enhancedData = await resE.json();
        } catch(e) { /* fallback */ }

        const res = await fetch('data/trees_data.json');
        const baseData = await res.json();

        // Merge: enriquecer base con datos de enhanced cuando exista match por id
        allTrees = baseData.map(tree => {
            const enhanced = enhancedData.find(e => e.id === tree.id);
            return enhanced ? { ...tree, ...enhanced } : tree;
        });

        // Asignar zonas a cada árbol basándose en su ubicación
        allTrees = allTrees.map(t => ({ ...t, zonas: detectZones(t.ubicacion) }));

        console.log(`%c🌳 ${allTrees.length} especies cargadas`,
                    'color:#2E5948;font-weight:bold;');
    } catch (err) {
        console.error('Error cargando datos:', err);
    }
}

function detectZones(ubicacion) {
    if (!ubicacion) return [];
    const u = ubicacion.toLowerCase();
    return Object.keys(ZONE_MAPPING).filter(zone =>
        ZONE_MAPPING[zone].some(pattern => u.includes(pattern))
    );
}

// ========================================
// Navegación
// ========================================
function initNav() {
    const navbar = document.querySelector('.navbar');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('open'));
        links.querySelectorAll('a').forEach(a =>
            a.addEventListener('click', () => links.classList.remove('open'))
        );
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
}

// ========================================
// Animaciones de scroll
// ========================================
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');

                // Animar contadores
                if (entry.target.classList.contains('stat-number')) {
                    const target = parseInt(entry.target.dataset.target);
                    if (!isNaN(target)) animateCounter(entry.target, target);
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

    document.querySelectorAll('.reveal, .stat-number').forEach(el => observer.observe(el));
}

function animateCounter(el, target, duration = 1800) {
    const start = performance.now();
    const suffix = el.dataset.suffix || '';
    const startVal = 0;

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startVal + (target - startVal) * ease);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target + suffix;
    }
    requestAnimationFrame(update);
}

function initScrollIndicator() {
    const indicator = document.querySelector('.hero-scroll-indicator');
    if (!indicator) return;
    window.addEventListener('scroll', () => {
        indicator.style.opacity = window.scrollY > 100 ? '0' : '0.7';
    });
}

// ========================================
// MAPA SVG INTERACTIVO - Zonas del predio
// ========================================
function initZoneMap() {
    // Bindear clicks en todas las zonas
    document.querySelectorAll('.map-svg .zone').forEach(zoneEl => {
        zoneEl.addEventListener('click', () => {
            const zoneId = zoneEl.dataset.zone;
            selectZone(zoneId);
        });
    });

    // Actualizar contadores en el SVG
    updateZoneCounts();

    // Estado inicial: mostrar resumen
    showZoneSummary();
}

function updateZoneCounts() {
    Object.keys(ZONE_INFO).forEach(zoneId => {
        const trees = allTrees.filter(t => t.zonas && t.zonas.includes(zoneId));
        const totalQty = trees.reduce((sum, t) => sum + (t.cantidad || 0), 0);
        const countEl = document.querySelector(`.map-svg .zone-count[data-zone="${zoneId}"]`);
        if (countEl) countEl.textContent = `${trees.length} sp · ${totalQty} ejemplares`;
    });
}

function selectZone(zoneId) {
    currentZone = zoneId;

    // Highlight en SVG
    document.querySelectorAll('.map-svg .zone').forEach(z => z.classList.remove('active'));
    const target = document.querySelector(`.map-svg .zone[data-zone="${zoneId}"]`);
    if (target) target.classList.add('active');

    // Render del panel lateral
    const trees = allTrees.filter(t => t.zonas && t.zonas.includes(zoneId));
    const info = ZONE_INFO[zoneId];
    const totalQty = trees.reduce((sum, t) => sum + (t.cantidad || 0), 0);
    const nativas = trees.filter(t => t.nativa).length;
    const exoticas = trees.length - nativas;

    const panel = document.getElementById('mapInfoPanel');
    panel.innerHTML = `
        <h3><i class="fas fa-map-marker-alt" style="color:${info.color}"></i> ${info.name}</h3>
        <p style="color:var(--color-text-light);font-size:0.95rem;margin-bottom:1rem;">${info.desc}</p>
        <div class="zone-stats">
            <div class="mini-stat"><span class="num">${trees.length}</span><span class="lbl">Especies</span></div>
            <div class="mini-stat"><span class="num">${totalQty}</span><span class="lbl">Ejemplares</span></div>
            <div class="mini-stat"><span class="num">${nativas}</span><span class="lbl">Nativas</span></div>
            <div class="mini-stat"><span class="num">${exoticas}</span><span class="lbl">Exóticas</span></div>
        </div>
        <h4 style="margin:1.5rem 0 1rem;color:var(--color-primary);">Especies en este sector:</h4>
        ${trees.length === 0
            ? '<p style="color:var(--color-text-light);font-style:italic;">Aún no hay especies registradas en esta zona.</p>'
            : trees.map(t => `
                <div class="tree-chip ${t.nativa ? '' : 'exotica'}" onclick="showTreeDetail(${t.id})">
                    <div class="tree-chip-info">
                        <strong>${t.comun}</strong>
                        <em>${t.cientifico}</em>
                    </div>
                    <div class="tree-chip-qty">${t.cantidad}</div>
                </div>
            `).join('')
        }
    `;
}

function showZoneSummary() {
    const panel = document.getElementById('mapInfoPanel');
    if (!panel) return;

    const totalEspecies = allTrees.length;
    const totalEjemplares = allTrees.reduce((s, t) => s + (t.cantidad || 0), 0);
    const totalNativas = allTrees.filter(t => t.nativa).length;
    const totalEnredaderas = allTrees.filter(t => t.tipo === 'enredadera').length;

    panel.innerHTML = `
        <h3><i class="fas fa-leaf" style="color:var(--color-accent)"></i> Resumen del Predio</h3>
        <p style="color:var(--color-text-light);font-size:0.95rem;">
            Haz clic en cualquier sector del mapa para explorar qué especies hay plantadas allí.
        </p>
        <div class="zone-stats" style="margin-top:1.5rem;">
            <div class="mini-stat"><span class="num">${totalEspecies}</span><span class="lbl">Especies</span></div>
            <div class="mini-stat"><span class="num">${totalEjemplares}</span><span class="lbl">Ejemplares</span></div>
            <div class="mini-stat"><span class="num">${totalNativas}</span><span class="lbl">Nativas</span></div>
            <div class="mini-stat"><span class="num">${totalEnredaderas}</span><span class="lbl">Enredaderas</span></div>
        </div>
        <div style="margin-top:1.5rem;padding:1rem;background:var(--color-bg-cream);border-radius:8px;font-size:0.85rem;">
            <strong style="color:var(--color-primary);">💡 Tip:</strong> Cada zona del mapa representa un sector real del predio donde funciona La Arboleda. La intensidad del color indica cuántas especies hay.
        </div>
    `;
}

// ========================================
// MAPA REAL (Leaflet) - Ubicación del IES
// ========================================
function initRealMap() {
    // Coordenadas exactas confirmadas
    const IES_COORDS = [-23.157818613880952, -64.32714728035995];

    // Entrada principal: en el frente del edificio (sobre Salvador Valeri)
    // Ajustada al borde sur del predio, no en medio de la calle
    const ENTRADA_COORDS = [-23.157950, -64.327147];

    const map = L.map('realMap', {
        center: IES_COORDS,
        zoom: 18,
        scrollWheelZoom: false
    });

    const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 19 }
    );

    const osmHot = L.tileLayer(
        'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap France · Humanitarian', maxZoom: 19 }
    );

    const cartoLight = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap · © CARTO', maxZoom: 19, subdomains: 'abcd' }
    );

    // Default: OpenStreetMap (más confiable que Esri satellite en esta zona)
    osm.addTo(map);

    L.control.layers({
        'Mapa estándar': osm,
        'Mapa claro': cartoLight,
        'Mapa humanitario': osmHot
    }).addTo(map);

    const treeIcon = L.divIcon({
        className: 'custom-tree-marker',
        html: '<div style="background:#D98E32;color:white;width:48px;height:48px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:3px solid white;"><i class="fas fa-tree" style="transform:rotate(45deg);font-size:1.2rem;"></i></div>',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -45]
    });

    const entranceIcon = L.divIcon({
        className: 'custom-entrance-marker',
        html: '<div style="background:#28a745;color:white;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:3px solid white;animation:pulseEntrance 2s infinite;"><i class="fas fa-door-open" style="font-size:1.1rem;"></i></div>',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -25]
    });

    const totalEspecies = allTrees.length;
    const totalEjemplares = allTrees.reduce((s, t) => s + (t.cantidad || 0), 0);

    const popup = `
        <h4>🌳 La Arboleda</h4>
        <p style="margin:0 0 0.5rem;"><strong>La Arboleda</strong><br>
        <em style="font-size:0.9em;">en el predio del I.E.S. N° 6023 "Dr. A. Loutaif"</em><br>
        Salvador Valeri esq. O'Higgins<br>
        San Ramón de la Nueva Orán, Salta</p>
        <hr style="border:none;border-top:1px solid #eee;margin:0.5rem 0;">
        <p style="margin:0;font-size:0.85rem;">
            🌱 <strong>${totalEspecies}</strong> especies relevadas<br>
            🌳 <strong>${totalEjemplares}</strong> ejemplares vivos
        </p>
    `;

    L.marker(IES_COORDS, { icon: treeIcon })
        .addTo(map)
        .bindPopup(popup, { maxWidth: 280 })
        .openPopup();

    L.marker(ENTRADA_COORDS, { icon: entranceIcon })
        .addTo(map)
        .bindPopup('<h4 style="margin:0 0 0.3rem;color:#28a745;">🚪 Entrada principal</h4><p style="margin:0;font-size:0.85rem;">Por calle <strong>Salvador Valeri</strong> (lado sur del predio)</p>', { maxWidth: 240 });

    L.polyline([ENTRADA_COORDS, IES_COORDS], {
        color: '#28a745',
        weight: 3,
        dashArray: '8, 8',
        opacity: 0.8
    }).addTo(map);

    map.on('click', () => map.scrollWheelZoom.enable());
}

// ========================================
// GALERÍA DE ESPECIES (con filtros)
// ========================================
function initSpeciesGallery() {
    const searchInput = document.getElementById('searchInput');
    const tipoFilter = document.getElementById('tipoFilter');
    const origenFilter = document.getElementById('origenFilter');
    const zonaFilter = document.getElementById('zonaFilter');

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (tipoFilter) tipoFilter.addEventListener('change', applyFilters);
    if (origenFilter) origenFilter.addEventListener('change', applyFilters);
    if (zonaFilter) zonaFilter.addEventListener('change', applyFilters);

    renderSpecies(allTrees);
}

function applyFilters() {
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const tipo = document.getElementById('tipoFilter')?.value || '';
    const origen = document.getElementById('origenFilter')?.value || '';
    const zona = document.getElementById('zonaFilter')?.value || '';

    let filtered = allTrees;

    if (search) {
        filtered = filtered.filter(t =>
            t.comun.toLowerCase().includes(search) ||
            t.cientifico.toLowerCase().includes(search)
        );
    }
    if (tipo) filtered = filtered.filter(t => t.tipo === tipo);
    if (origen === 'nativa') filtered = filtered.filter(t => t.nativa);
    else if (origen === 'exotica') filtered = filtered.filter(t => !t.nativa);
    if (zona) filtered = filtered.filter(t => t.zonas && t.zonas.includes(zona));

    renderSpecies(filtered);

    const counter = document.getElementById('speciesCounter');
    if (counter) counter.textContent = `${filtered.length} de ${allTrees.length} especies`;
}

function renderSpecies(trees) {
    const grid = document.getElementById('speciesGrid');
    if (!grid) return;

    if (trees.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:3rem;background:white;border-radius:12px;">
                <i class="fas fa-search" style="font-size:3rem;color:#ccc;margin-bottom:1rem;"></i>
                <h3>No se encontraron especies</h3>
                <p style="color:var(--color-text-light);">Probá con otros filtros.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = trees.map(t => {
        const imgPath = `images/arboles/${getTreeImage(t)}`;
        return `
            <div class="species-card ${t.nativa ? 'nativa' : 'exotica'}" onclick="showTreeDetail(${t.id})">
                <div class="species-image">
                    <img src="${imgPath}" alt="${t.comun}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=&quot;placeholder&quot;><i class=&quot;fas fa-tree&quot;></i></div>'+this.parentElement.innerHTML;">
                    <span class="species-badge">${t.nativa ? 'Nativa' : 'Exótica'}</span>
                </div>
                <div class="species-body">
                    <h3>${t.comun}</h3>
                    <div class="scientific">${t.cientifico}</div>
                    <div class="meta">
                        <span class="meta-tag"><i class="fas fa-map-pin"></i> ${shortUbi(t.ubicacion)}</span>
                        <span class="meta-tag"><i class="fas fa-hashtag"></i> ${t.cantidad}</span>
                        ${t.tipo === 'enredadera' ? '<span class="meta-tag">🌿 Enredadera</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function shortUbi(ubi) {
    if (!ubi) return '—';
    return ubi.length > 30 ? ubi.substring(0, 27) + '…' : ubi;
}

// Mapeo de nombre científico a archivo de imagen
function getTreeImage(tree) {
    // El nombre científico suele coincidir con el archivo (con espacios y .jpg)
    // Hacemos algunos ajustes para casos especiales
    const aliases = {
        'Tipuana tipú': 'Tipa.jpg.jpg',
        'Handroanthus impetiginosus': 'Lapacho.jpg.jpg',
        'Ceiba chodatii': 'Borracho.jpg',
        'Erythrina cristagalli': 'Erythrina cristagalli.jpg',
        'Cassia carnaval o Senna spectabilis': 'Cassia carnaval.jpg',
        'Vachellia albicorticata': 'Vachellia albicorticata.jpg',
        'Inga saltensis o Inga Edulis': 'Inga saltensis.jpeg',
        'Passiflora cincinnati': 'Passiflora Cincinnati.jpg',
        'Cassia fistula': 'Cassia carnaval.jpg',
        'Scutia buxifolia': 'Celtis tala.jpg',
        'Condalia buxifolia': 'Celtis tala.jpg',
        'Syzygium jambos': 'Plinia cauliflora.jpg',
        'Santa Rita': 'Podranea ricasoliana.jpg',
        'Clematis montevidensis': 'Clytostoma callistegioides.jpg'
    };
    if (aliases[tree.cientifico]) return aliases[tree.cientifico];
    return `${tree.cientifico}.jpg`;
}

// ========================================
// Modal de detalle
// ========================================
function showTreeDetail(id) {
    const t = allTrees.find(x => x.id === id);
    if (!t) return;

    const modal = document.getElementById('treeModal');
    if (!modal) return;

    const imgPath = `images/arboles/${getTreeImage(t)}`;
    const isEnredadera = t.tipo === 'enredadera';

    modal.querySelector('.modal-image').src = imgPath;
    modal.querySelector('.modal-image').onerror = function() {
        this.src = 'images/forest-native.jpg';
    };

    modal.querySelector('.modal-header h2').textContent = t.comun;
    modal.querySelector('.modal-header em').textContent = t.cientifico;

    const body = modal.querySelector('.modal-content-inner');
    body.innerHTML = `
        <div class="modal-info-grid">
            <div class="modal-info-item">
                <span class="label">Origen</span>
                <span class="value">${t.nativa ? '🇦🇷 Nativa' : '🌍 Exótica'}</span>
            </div>
            <div class="modal-info-item">
                <span class="label">Tipo</span>
                <span class="value">${isEnredadera ? '🌿 Enredadera' : '🌳 Árbol'}</span>
            </div>
            <div class="modal-info-item">
                <span class="label">Ejemplares</span>
                <span class="value">${t.cantidad}</span>
            </div>
            <div class="modal-info-item">
                <span class="label">Ubicación</span>
                <span class="value" style="font-size:0.85rem;">${t.ubicacion}</span>
            </div>
            ${t.floracion ? `
                <div class="modal-info-item">
                    <span class="label">Floración</span>
                    <span class="value" style="font-size:0.85rem;">${t.floracion}</span>
                </div>
            ` : ''}
            ${t.color_flor ? `
                <div class="modal-info-item">
                    <span class="label">Color flor</span>
                    <span class="value" style="font-size:0.85rem;">${t.color_flor}</span>
                </div>
            ` : ''}
        </div>
        ${t.copla ? `
            <h4 style="color:var(--color-primary);margin-bottom:0.75rem;">
                <i class="fas fa-feather-pointed"></i> Copla del árbol
            </h4>
            <div class="copla-box">${t.copla}</div>
        ` : ''}
    `;

    modal.classList.add('active');
}

function initModalBindings() {
    const modal = document.getElementById('treeModal');
    modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.remove('active');
    });
}

// ========================================
// Quick stats (homepage)
// ========================================
function renderQuickStats() {
    const totalEspecies = allTrees.length;
    const totalEjemplares = allTrees.reduce((s, t) => s + (t.cantidad || 0), 0);
    const nativas = allTrees.filter(t => t.nativa).length;
    const enredaderas = allTrees.filter(t => t.tipo === 'enredadera').length;

    const setStat = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.dataset.target = value;
            // Si ya está en viewport, animar
            if (el.classList.contains('in-view')) animateCounter(el, value);
        }
    };

    setStat('statEspecies', totalEspecies);
    setStat('statEjemplares', totalEjemplares);
    setStat('statNativas', nativas);
    setStat('statEnredaderas', enredaderas);
}

// ========================================
// Formulario de contacto
// ========================================
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        // OPCIÓN A: Netlify Forms (descomenta `data-netlify="true"` en el HTML del form)
        // OPCIÓN B: Supabase (cuando lo configures, descomentá este bloque)
        /*
        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData);
            const SUPABASE_URL = 'TU_SUPABASE_URL';
            const SUPABASE_KEY = 'TU_SUPABASE_ANON_KEY';
            const res = await fetch(`${SUPABASE_URL}/rest/v1/contacto`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Error en el envío');
        } catch (err) {
            alert('Hubo un problema. Probá de nuevo en un momento.');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        */

        // Simulación mientras tanto:
        setTimeout(() => {
            alert('¡Gracias por tu interés! Te contactaremos pronto.');
            form.reset();
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 1200);
    });
}

// Exponer al global para los onclick inline
window.showTreeDetail = showTreeDetail;
window.selectZone = selectZone;
window.showZoneSummary = showZoneSummary;
