/**
 * app.js — CosSnap Frontend SPA Logic
 * Cosplay Photography Booking Management System
 * Vanilla JavaScript (ES2024) — No framework
 */

'use strict';

// ── Config ───────────────────────────────────────────────────────────────────
const API = 'api.php';
const PACKAGES = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };
const STATUSES  = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Selesai', cancelled: 'Batal' };
const PKG_PRICE = { basic: 250000, standard: 450000, premium: 850000 };

// ── State ────────────────────────────────────────────────────────────────────
let currentPage = 'dashboard';
let allClients  = [];
let searchDebounce = null;

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    bindNav();
    bindTopbar();
    bindModal();
    navigateTo('dashboard');
    loadSidebarBadge();
});

// ── Navigation ───────────────────────────────────────────────────────────────
function bindNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(el.dataset.page);
            closeSidebar();
        });
    });
}

function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el =>
        el.classList.toggle('active', el.dataset.page === page)
    );
    const titles = { dashboard: 'Dashboard', bookings: 'Manajemen Booking', clients: 'Manajemen Klien' };
    document.getElementById('page-title').textContent = titles[page] || page;
    document.getElementById('btn-add-main').style.display =
        page === 'dashboard' ? 'none' : 'inline-flex';

    const content = document.getElementById('page-content');
    content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Memuat data...</p></div>';
    content.style.animation = 'none';
    requestAnimationFrame(() => { content.style.animation = ''; });

    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'bookings':  renderBookings();  break;
        case 'clients':   renderClients();   break;
    }
}

// ── Topbar ───────────────────────────────────────────────────────────────────
function bindTopbar() {
    // Sidebar toggle (mobile)
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    });
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

    // Add button
    document.getElementById('btn-add-main').addEventListener('click', () => {
        if (currentPage === 'bookings') openBookingForm();
        else if (currentPage === 'clients') openClientForm();
    });

    // Global search
    document.getElementById('global-search').addEventListener('input', e => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            const q = e.target.value.trim();
            if (currentPage === 'bookings') renderBookings(q);
            else if (currentPage === 'clients') renderClients(q);
        }, 300);
    });
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// ── Dashboard ────────────────────────────────────────────────────────────────
async function renderDashboard() {
    const stats = await apiFetch('GET', `${API}?resource=stats`);
    if (!stats) return;

    const by = stats.by_status || {};
    const idr = v => 'Rp ' + Number(v).toLocaleString('id-ID');

    // Count upcoming sessions today
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = (stats.upcoming || []).filter(b => b.session_date?.startsWith(today)).length;
    const el = document.getElementById('today-sessions');
    if (el) el.textContent = todaySessions || '0';

    document.getElementById('page-content').innerHTML = `
    <!-- Stats Row -->
    <div class="stats-grid">
        ${statCard('📋', 'Total Booking', stats.total_bookings, 'Semua sesi foto', 'purple')}
        ${statCard('✅', 'Selesai', by.completed || 0, `${idr(stats.total_revenue)} diterima`, 'green')}
        ${statCard('⏳', 'Pending', by.pending || 0, 'Menunggu konfirmasi', 'yellow')}
        ${statCard('💰', 'Potensi Revenue', idr(stats.pending_revenue), 'Dari pending + confirmed', 'pink')}
        ${statCard('👥', 'Total Klien', stats.total_clients, 'Klien terdaftar', 'blue')}
    </div>

    <!-- Charts Row -->
    <div class="grid-2 mb-6">
        <div class="card">
            <div class="card-header">
                <span class="card-title">Revenue Bulanan</span>
            </div>
            <div class="card-body">
                <div class="chart-container">
                    <canvas id="chart-revenue"></canvas>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <span class="card-title">Distribusi Status</span>
            </div>
            <div class="card-body">
                <div class="chart-container">
                    <canvas id="chart-status"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- Bottom Row -->
    <div class="grid-2">
        <div class="card">
            <div class="card-header">
                <span class="card-title">📅 Sesi Mendatang</span>
                <button class="btn btn-ghost btn-sm" onclick="navigateTo('bookings')">Lihat Semua</button>
            </div>
            <div class="card-body">
                <div class="upcoming-list">
                    ${(stats.upcoming || []).length === 0
                        ? '<div class="empty-state"><div class="empty-icon">🗓️</div><p>Tidak ada sesi mendatang</p></div>'
                        : (stats.upcoming || []).map(upcomingCard).join('')}
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <span class="card-title">🕐 Booking Terbaru</span>
                <button class="btn btn-ghost btn-sm" onclick="navigateTo('bookings')">Lihat Semua</button>
            </div>
            <div class="card-body">
                <div class="upcoming-list">
                    ${(stats.recent || []).map(recentBookingRow).join('')}
                </div>
            </div>
        </div>
    </div>
    `;

    lucide.createIcons();

    // Render charts
    renderRevenueChart(stats.monthly || []);
    renderStatusChart(by);
}

function statCard(icon, label, value, sub, color) {
    return `
    <div class="stat-card glow-card">
        <div class="stat-icon ${color}">${icon}</div>
        <div class="stat-info">
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
            <div class="stat-sub">${sub}</div>
        </div>
    </div>`;
}

function upcomingCard(b) {
    const d = new Date(b.session_date);
    const day = d.getDate().toString().padStart(2,'0');
    const month = d.toLocaleString('id-ID', { month: 'short' });
    const time  = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `
    <div class="upcoming-item" onclick="viewBooking(${b.id})">
        <div class="upcoming-date">
            <div class="upcoming-day">${day}</div>
            <div class="upcoming-month">${month}</div>
        </div>
        <div class="upcoming-info">
            <div class="upcoming-name">${esc(b.client_name)}</div>
            <div class="upcoming-char">${esc(b.cosplay_character)}</div>
        </div>
        <div>
            <div class="upcoming-time">${time}</div>
            <div style="margin-top:4px">${statusBadge(b.status)}</div>
        </div>
    </div>`;
}

function recentBookingRow(b) {
    return `
    <div class="upcoming-item" onclick="viewBooking(${b.id})">
        <div class="avatar">${esc(b.client_name.charAt(0).toUpperCase())}</div>
        <div class="upcoming-info">
            <div class="upcoming-name">${esc(b.client_name)}</div>
            <div class="upcoming-char">${esc(b.cosplay_character)}</div>
        </div>
        <div style="text-align:right">
            <div class="price-tag">Rp ${Number(b.price).toLocaleString('id-ID')}</div>
            <div style="margin-top:4px">${statusBadge(b.status)}</div>
        </div>
    </div>`;
}

function renderRevenueChart(monthly) {
    const ctx = document.getElementById('chart-revenue');
    if (!ctx) return;
    const labels  = monthly.map(m => {
        const [y, mo] = m.month.split('-');
        return new Date(+y, +mo - 1).toLocaleString('id-ID', { month: 'short', year: '2-digit' });
    });
    const data    = monthly.map(m => m.revenue);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (Rp)',
                data,
                backgroundColor: 'rgba(139,92,246,0.6)',
                borderColor: '#8b5cf6',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(236,72,153,0.7)',
            }]
        },
        options: chartOpts('Rp ', true)
    });
}

function renderStatusChart(by) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;
    const labels = ['Pending','Confirmed','Selesai','Batal'];
    const keys   = ['pending','confirmed','completed','cancelled'];
    const data   = keys.map(k => by[k] || 0);
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#fbbf24','#60a5fa','#34d399','#f87171'],
                borderColor: '#14142b',
                borderWidth: 3,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9d9ab5', padding: 14, font: { size: 12 } }
                }
            },
            cutout: '65%',
        }
    });
}

function chartOpts(prefix = '', currency = false) {
    return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a1a2e',
                borderColor: 'rgba(139,92,246,0.3)',
                borderWidth: 1,
                titleColor: '#f1f0ff',
                bodyColor: '#9d9ab5',
                callbacks: {
                    label: ctx => ` ${currency
                        ? 'Rp ' + Number(ctx.raw).toLocaleString('id-ID')
                        : ctx.raw}`
                }
            }
        },
        scales: {
            x: { ticks: { color: '#9d9ab5', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#9d9ab5', font: { size: 11 },
                callback: v => currency ? 'Rp ' + (v/1000)+'rb' : v },
                grid: { color: 'rgba(255,255,255,0.04)' } }
        }
    };
}

// ── Bookings Page ─────────────────────────────────────────────────────────────
async function renderBookings(search = '') {
    const qs = new URLSearchParams({ resource: 'bookings' });
    if (search) qs.set('search', search);

    const bookings = await apiFetch('GET', `${API}?${qs}`);
    if (!bookings) return;

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
        <div>
            <h1 class="page-heading">Manajemen Booking</h1>
            <p class="page-subheading">${bookings.length} sesi foto terdaftar</p>
        </div>
        <div class="flex gap-2">
            <button class="btn btn-primary" onclick="openBookingForm()">
                <i data-lucide="plus"></i> Tambah Booking
            </button>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
        <div class="filter-group">
            <span class="filter-label">Status:</span>
            <select class="form-control" id="filter-status" style="width:auto" onchange="applyBookingFilter()">
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Batal</option>
            </select>
        </div>
        <div class="filter-group">
            <span class="filter-label">Paket:</span>
            <select class="form-control" id="filter-package" style="width:auto" onchange="applyBookingFilter()">
                <option value="">Semua</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
            </select>
        </div>
    </div>

    <!-- Table -->
    <div class="card">
        <div class="table-wrap">
            ${bookings.length === 0
                ? `<div class="empty-state">
                    <div class="empty-icon">📸</div>
                    <h3>Belum ada booking</h3>
                    <p>Klik tombol "Tambah Booking" untuk membuat sesi foto pertama.</p>
                    <button class="btn btn-primary" style="margin-top:12px" onclick="openBookingForm()">
                        <i data-lucide="plus"></i> Tambah Booking
                    </button>
                   </div>`
                : `<table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Klien</th>
                            <th>Karakter</th>
                            <th>Paket</th>
                            <th>Tanggal Sesi</th>
                            <th>Lokasi</th>
                            <th>Harga</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(bookingRow).join('')}
                    </tbody>
                   </table>`}
        </div>
    </div>`;

    lucide.createIcons();
    loadSidebarBadge();
}

function bookingRow(b) {
    const d = new Date(b.session_date);
    const dateStr = isNaN(d) ? b.session_date : d.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    return `
    <tr>
        <td style="color:var(--text-muted);font-size:0.78rem">#${b.id}</td>
        <td>
            <div class="flex gap-2">
                <div class="avatar" style="width:30px;height:30px;font-size:0.75rem">${esc(b.client_name.charAt(0))}</div>
                <span class="td-main">${esc(b.client_name)}</span>
            </div>
        </td>
        <td>${esc(b.cosplay_character)}</td>
        <td>${packageBadge(b.package)}</td>
        <td style="white-space:nowrap">${dateStr}</td>
        <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(b.location)}">${esc(b.location)}</td>
        <td class="price-tag">Rp ${Number(b.price).toLocaleString('id-ID')}</td>
        <td>${statusBadge(b.status)}</td>
        <td>
            <div class="td-actions">
                <button class="btn-icon" title="Detail" onclick="viewBooking(${b.id})"><i data-lucide="eye"></i></button>
                <button class="btn-icon" title="Edit" onclick="openBookingForm(${b.id})"><i data-lucide="pencil"></i></button>
                <button class="btn-icon danger" title="Hapus" onclick="confirmDelete('booking',${b.id},'${esc(b.client_name)}')"><i data-lucide="trash-2"></i></button>
            </div>
        </td>
    </tr>`;
}

function applyBookingFilter() {
    const status  = document.getElementById('filter-status')?.value  || '';
    const pkg     = document.getElementById('filter-package')?.value || '';
    const search  = document.getElementById('global-search')?.value  || '';
    const qs = new URLSearchParams({ resource: 'bookings' });
    if (search)  qs.set('search',  search);
    if (status)  qs.set('status',  status);
    if (pkg)     qs.set('package', pkg);

    apiFetch('GET', `${API}?${qs}`).then(bookings => {
        if (!bookings) return;
        document.querySelector('table tbody').innerHTML = bookings.map(bookingRow).join('');
        lucide.createIcons();
    });
}

async function viewBooking(id) {
    const b = await apiFetch('GET', `${API}?resource=bookings&id=${id}`);
    if (!b) return;

    const d = new Date(b.session_date);
    const dateStr = isNaN(d) ? b.session_date : d.toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    openModal('Detail Booking', `
    <div class="detail-grid">
        <div class="detail-item">
            <div class="detail-label">Klien</div>
            <div class="detail-value flex gap-2">
                <div class="avatar" style="width:28px;height:28px;font-size:0.75rem">${esc(b.client_name.charAt(0))}</div>
                ${esc(b.client_name)}
            </div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Karakter Cosplay</div>
            <div class="detail-value">🎭 ${esc(b.cosplay_character)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Paket</div>
            <div class="detail-value">${packageBadge(b.package)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Status</div>
            <div class="detail-value">${statusBadge(b.status)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Tanggal & Jam Sesi</div>
            <div class="detail-value">📅 ${dateStr}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Durasi</div>
            <div class="detail-value">⏱ ${b.duration} jam</div>
        </div>
        <div class="detail-item" style="grid-column: 1/-1">
            <div class="detail-label">Lokasi</div>
            <div class="detail-value">📍 ${esc(b.location)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Harga</div>
            <div class="detail-value price-tag">Rp ${Number(b.price).toLocaleString('id-ID')}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Dibuat</div>
            <div class="detail-value">${b.created_at}</div>
        </div>
        ${b.notes ? `<div class="detail-item" style="grid-column:1/-1">
            <div class="detail-label">Catatan</div>
            <div class="detail-value">${esc(b.notes)}</div>
        </div>` : ''}
    </div>
    <div class="detail-actions">
        <button class="btn btn-ghost" onclick="openBookingForm(${b.id});closeModal()">
            <i data-lucide="pencil"></i> Edit
        </button>
        <button class="btn btn-danger" onclick="confirmDelete('booking',${b.id},'${esc(b.client_name)}');closeModal()">
            <i data-lucide="trash-2"></i> Hapus
        </button>
    </div>`);
}

// ── Booking Form ──────────────────────────────────────────────────────────────
async function openBookingForm(id = null) {
    let b = null;
    if (id) {
        b = await apiFetch('GET', `${API}?resource=bookings&id=${id}`);
        if (!b) return;
    }

    // Load clients for dropdown
    if (allClients.length === 0) {
        allClients = await apiFetch('GET', `${API}?resource=clients`) || [];
    }

    const clientOptions = allClients.map(c =>
        `<option value="${c.id}" ${b?.client_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`
    ).join('');

    const title = id ? 'Edit Booking' : 'Tambah Booking Baru';
    openModal(title, `
    <form id="booking-form">
        <div class="form-row">
            <div class="form-group">
                <label class="form-label required">Nama Klien</label>
                <input type="text" class="form-control" id="f-client-name"
                    value="${b ? esc(b.client_name) : ''}"
                    placeholder="Nama klien / cosplayer" required>
            </div>
            <div class="form-group">
                <label class="form-label">Pilih Klien (Opsional)</label>
                <select class="form-control" id="f-client-id" onchange="autofillClientName(this)">
                    <option value="">— Pilih dari daftar klien —</option>
                    ${clientOptions}
                </select>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label required">Karakter Cosplay</label>
            <input type="text" class="form-control" id="f-character"
                value="${b ? esc(b.cosplay_character) : ''}"
                placeholder="cth: Mikasa Ackermann (Attack on Titan)" required>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label required">Paket Foto</label>
                <select class="form-control" id="f-package" onchange="updatePriceHint(this)">
                    <option value="basic"    ${b?.package==='basic'    ? 'selected' : ''}>Basic — Rp 250.000 (2 jam)</option>
                    <option value="standard" ${b?.package==='standard' ? 'selected' : ''}>Standard — Rp 450.000 (3 jam)</option>
                    <option value="premium"  ${b?.package==='premium'  ? 'selected' : ''}>Premium — Rp 850.000 (5+ jam)</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label required">Status</label>
                <select class="form-control" id="f-status">
                    <option value="pending"   ${!b || b.status==='pending'   ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${b?.status==='confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${b?.status==='completed' ? 'selected' : ''}>Selesai</option>
                    <option value="cancelled" ${b?.status==='cancelled' ? 'selected' : ''}>Dibatalkan</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label required">Tanggal & Jam Sesi</label>
                <input type="datetime-local" class="form-control" id="f-session-date"
                    value="${b ? b.session_date.replace(' ', 'T') : ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Durasi (jam)</label>
                <input type="number" class="form-control" id="f-duration"
                    value="${b?.duration ?? 2}" min="1" max="12">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label required">Lokasi Pemotretan</label>
            <input type="text" class="form-control" id="f-location"
                value="${b ? esc(b.location) : ''}"
                placeholder="cth: Studio Indoor Kemang, Jakarta" required>
        </div>

        <div class="form-group">
            <label class="form-label">Harga (Rp)</label>
            <input type="number" class="form-control" id="f-price"
                value="${b?.price ?? PKG_PRICE['basic']}" min="0" step="10000">
            <div class="form-hint" id="price-hint">Harga default sesuai paket, dapat disesuaikan.</div>
        </div>

        <div class="form-group">
            <label class="form-label">Catatan Tambahan</label>
            <textarea class="form-control" id="f-notes" placeholder="Props yang dibawa, kebutuhan khusus, dll...">${b?.notes ?? ''}</textarea>
        </div>

        <div class="flex gap-2" style="justify-content:flex-end;margin-top:4px">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button>
            <button type="submit" class="btn btn-primary">
                <i data-lucide="${id ? 'save' : 'plus'}"></i>
                ${id ? 'Simpan Perubahan' : 'Buat Booking'}
            </button>
        </div>
    </form>`);

    lucide.createIcons();

    document.getElementById('booking-form').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
            client_id:         document.getElementById('f-client-id').value || null,
            client_name:       document.getElementById('f-client-name').value,
            cosplay_character: document.getElementById('f-character').value,
            package:           document.getElementById('f-package').value,
            status:            document.getElementById('f-status').value,
            session_date:      document.getElementById('f-session-date').value.replace('T', ' '),
            duration:          document.getElementById('f-duration').value,
            location:          document.getElementById('f-location').value,
            price:             document.getElementById('f-price').value,
            notes:             document.getElementById('f-notes').value,
        };

        const submitBtn = e.target.querySelector('[type=submit]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Menyimpan...';

        const result = id
            ? await apiFetch('PUT',  `${API}?resource=bookings&id=${id}`, payload)
            : await apiFetch('POST', `${API}?resource=bookings`, payload);

        submitBtn.disabled = false;

        if (result) {
            closeModal();
            toast(id ? 'Booking berhasil diperbarui!' : 'Booking baru berhasil dibuat!', 'success');
            renderBookings();
        }
    });
}

function autofillClientName(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (opt.value) {
        document.getElementById('f-client-name').value = opt.text;
    }
}

function updatePriceHint(sel) {
    const pkg = sel.value;
    const price = PKG_PRICE[pkg] || 0;
    const dur   = { basic: 2, standard: 3, premium: 5 }[pkg];
    document.getElementById('f-price').value = price;
    document.getElementById('price-hint').textContent =
        `Paket ${pkg.charAt(0).toUpperCase()+pkg.slice(1)}: Rp ${price.toLocaleString('id-ID')} / ${dur} jam`;
    document.getElementById('f-duration').value = dur;
}

// ── Clients Page ──────────────────────────────────────────────────────────────
async function renderClients(search = '') {
    const qs = new URLSearchParams({ resource: 'clients' });
    if (search) qs.set('search', search);

    const clients = await apiFetch('GET', `${API}?${qs}`);
    if (!clients) return;
    allClients = clients;

    document.getElementById('page-content').innerHTML = `
    <div class="page-header">
        <div>
            <h1 class="page-heading">Manajemen Klien</h1>
            <p class="page-subheading">${clients.length} klien terdaftar</p>
        </div>
        <button class="btn btn-primary" onclick="openClientForm()">
            <i data-lucide="user-plus"></i> Tambah Klien
        </button>
    </div>

    <div class="card">
        <div class="table-wrap">
            ${clients.length === 0
                ? `<div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <h3>Belum ada klien</h3>
                    <p>Tambahkan data klien atau cosplayer pertama.</p>
                    <button class="btn btn-primary" style="margin-top:12px" onclick="openClientForm()">
                        <i data-lucide="user-plus"></i> Tambah Klien
                    </button>
                   </div>`
                : `<table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nama</th>
                            <th>Email</th>
                            <th>No. HP</th>
                            <th>Social Media</th>
                            <th>Total Booking</th>
                            <th>Total Spent</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clients.map(clientRow).join('')}
                    </tbody>
                   </table>`}
        </div>
    </div>`;

    lucide.createIcons();
}

function clientRow(c) {
    return `
    <tr>
        <td style="color:var(--text-muted);font-size:0.78rem">#${c.id}</td>
        <td>
            <div class="flex gap-2">
                <div class="avatar" style="width:30px;height:30px;font-size:0.75rem">${esc(c.name.charAt(0))}</div>
                <span class="td-main">${esc(c.name)}</span>
            </div>
        </td>
        <td>${c.email ? `<a href="mailto:${esc(c.email)}" style="color:var(--accent)">${esc(c.email)}</a>` : '—'}</td>
        <td>${c.phone || '—'}</td>
        <td>${c.social_media ? `<span style="color:var(--secondary)">${esc(c.social_media)}</span>` : '—'}</td>
        <td><span class="badge badge-confirmed">${c.total_bookings} sesi</span></td>
        <td class="price-tag">Rp ${Number(c.total_spent).toLocaleString('id-ID')}</td>
        <td>
            <div class="td-actions">
                <button class="btn-icon" title="Detail" onclick="viewClient(${c.id})"><i data-lucide="eye"></i></button>
                <button class="btn-icon" title="Edit" onclick="openClientForm(${c.id})"><i data-lucide="pencil"></i></button>
                <button class="btn-icon danger" title="Hapus" onclick="confirmDelete('client',${c.id},'${esc(c.name)}')"><i data-lucide="trash-2"></i></button>
            </div>
        </td>
    </tr>`;
}

async function viewClient(id) {
    const c = await apiFetch('GET', `${API}?resource=clients&id=${id}`);
    if (!c) return;

    const bookings = c.bookings || [];
    openModal('Detail Klien', `
    <div class="flex gap-2 mb-6" style="align-items:flex-start">
        <div class="avatar" style="width:56px;height:56px;font-size:1.4rem">${esc(c.name.charAt(0))}</div>
        <div>
            <div style="font-family:var(--font-head);font-size:1.2rem;font-weight:700;color:var(--text-primary)">${esc(c.name)}</div>
            <div style="color:var(--text-muted);margin-top:4px">${c.social_media || ''}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
            <div class="price-tag" style="font-size:1.1rem">Rp ${Number(c.total_spent).toLocaleString('id-ID')}</div>
            <div style="font-size:0.72rem;color:var(--text-muted)">Total spent</div>
        </div>
    </div>
    <div class="detail-grid mb-6">
        <div class="detail-item">
            <div class="detail-label">Email</div>
            <div class="detail-value">${c.email || '—'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">No. HP</div>
            <div class="detail-value">${c.phone || '—'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Social Media</div>
            <div class="detail-value" style="color:var(--secondary)">${c.social_media || '—'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Total Sesi</div>
            <div class="detail-value">${c.total_bookings} booking</div>
        </div>
        ${c.notes ? `<div class="detail-item" style="grid-column:1/-1">
            <div class="detail-label">Catatan</div>
            <div class="detail-value">${esc(c.notes)}</div>
        </div>` : ''}
    </div>

    ${bookings.length > 0 ? `
    <div class="section-title"><i data-lucide="calendar-check"></i> Riwayat Booking</div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto">
        ${bookings.map(b => `
        <div class="upcoming-item">
            <div class="upcoming-info">
                <div class="upcoming-name">${esc(b.cosplay_character)}</div>
                <div class="upcoming-char">📍 ${esc(b.location)} · ${b.session_date?.slice(0,10)}</div>
            </div>
            <div style="text-align:right">
                <div class="price-tag">Rp ${Number(b.price).toLocaleString('id-ID')}</div>
                <div style="margin-top:4px">${statusBadge(b.status)}</div>
            </div>
        </div>`).join('')}
    </div>` : ''}

    <div class="detail-actions">
        <button class="btn btn-ghost" onclick="openClientForm(${c.id});closeModal()">
            <i data-lucide="pencil"></i> Edit
        </button>
        <button class="btn btn-danger" onclick="confirmDelete('client',${c.id},'${esc(c.name)}');closeModal()">
            <i data-lucide="trash-2"></i> Hapus
        </button>
    </div>`);
    lucide.createIcons();
}

// ── Client Form ───────────────────────────────────────────────────────────────
async function openClientForm(id = null) {
    let c = null;
    if (id) {
        c = await apiFetch('GET', `${API}?resource=clients&id=${id}`);
        if (!c) return;
    }

    openModal(id ? 'Edit Klien' : 'Tambah Klien Baru', `
    <form id="client-form">
        <div class="form-group">
            <label class="form-label required">Nama Lengkap</label>
            <input type="text" class="form-control" id="cf-name"
                value="${c ? esc(c.name) : ''}" placeholder="Nama klien / cosplayer" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" id="cf-email"
                    value="${c?.email ?? ''}" placeholder="email@contoh.com">
            </div>
            <div class="form-group">
                <label class="form-label">No. HP / WhatsApp</label>
                <input type="tel" class="form-control" id="cf-phone"
                    value="${c?.phone ?? ''}" placeholder="081234567890">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Social Media</label>
            <input type="text" class="form-control" id="cf-social"
                value="${c?.social_media ?? ''}" placeholder="@username Instagram / TikTok">
        </div>
        <div class="form-group">
            <label class="form-label">Catatan</label>
            <textarea class="form-control" id="cf-notes" placeholder="Preferensi khusus, dll...">${c?.notes ?? ''}</textarea>
        </div>
        <div class="flex gap-2" style="justify-content:flex-end">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button>
            <button type="submit" class="btn btn-primary">
                <i data-lucide="${id ? 'save' : 'user-plus'}"></i>
                ${id ? 'Simpan Perubahan' : 'Tambah Klien'}
            </button>
        </div>
    </form>`);

    lucide.createIcons();

    document.getElementById('client-form').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
            name:         document.getElementById('cf-name').value,
            email:        document.getElementById('cf-email').value,
            phone:        document.getElementById('cf-phone').value,
            social_media: document.getElementById('cf-social').value,
            notes:        document.getElementById('cf-notes').value,
        };

        const submitBtn = e.target.querySelector('[type=submit]');
        submitBtn.disabled = true;

        const result = id
            ? await apiFetch('PUT',  `${API}?resource=clients&id=${id}`, payload)
            : await apiFetch('POST', `${API}?resource=clients`, payload);

        submitBtn.disabled = false;

        if (result) {
            closeModal();
            toast(id ? 'Data klien berhasil diperbarui!' : 'Klien baru berhasil ditambahkan!', 'success');
            allClients = [];
            renderClients();
        }
    });
}

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(type, id, name) {
    const typeLabel = type === 'booking' ? 'booking' : 'klien';
    document.getElementById('confirm-title').textContent = `Hapus ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`;
    document.getElementById('confirm-message').innerHTML =
        `Yakin ingin menghapus ${typeLabel} <strong>"${esc(name)}"</strong>? Tindakan ini tidak dapat dibatalkan.`;

    const overlay = document.getElementById('confirm-overlay');
    overlay.classList.add('active');

    const onOk = async () => {
        const resource = type === 'booking' ? 'bookings' : 'clients';
        const result = await apiFetch('DELETE', `${API}?resource=${resource}&id=${id}`);
        overlay.classList.remove('active');
        cleanup();
        if (result) {
            toast(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} berhasil dihapus.`, 'success');
            if (type === 'booking') { allClients = []; renderBookings(); loadSidebarBadge(); }
            else { allClients = []; renderClients(); }
        }
    };

    const onCancel = () => { overlay.classList.remove('active'); cleanup(); };

    const btnOk     = document.getElementById('confirm-ok');
    const btnCancel = document.getElementById('confirm-cancel');
    const btnClose  = document.getElementById('confirm-close');

    function cleanup() {
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        btnClose.removeEventListener('click', onCancel);
    }

    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    btnClose.addEventListener('click', onCancel);
}

// ── Sidebar Badge ─────────────────────────────────────────────────────────────
async function loadSidebarBadge() {
    const stats = await apiFetch('GET', `${API}?resource=stats`);
    if (!stats) return;
    const pending = stats.by_status?.pending || 0;
    const badge = document.getElementById('badge-pending');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline-flex' : 'none';
    }

    // Today sessions
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = (stats.upcoming || []).filter(b => b.session_date?.startsWith(today)).length;
    const todayEl = document.getElementById('today-sessions');
    if (todayEl) todayEl.textContent = todaySessions || '—';
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────
function bindModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });
}

function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.add('active');
    lucide.createIcons();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(message, type = 'info') {
    const icons = { success: 'check-circle', error: 'x-circle', info: 'info', warning: 'alert-triangle' };
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
        <div class="toast-icon"><i data-lucide="${icons[type] || 'info'}"></i></div>
        <div>${esc(message)}</div>`;
    container.appendChild(t);
    lucide.createIcons({ nodes: [t] });

    setTimeout(() => {
        t.classList.add('leaving');
        t.addEventListener('animationend', () => t.remove());
    }, 3500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(status) {
    const label = STATUSES[status] || status;
    return `<span class="badge badge-${status}">${label}</span>`;
}

function packageBadge(pkg) {
    const label = PACKAGES[pkg] || pkg;
    return `<span class="badge badge-${pkg}"><span class="pkg-dot ${pkg}"></span>${label}</span>`;
}

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ── API Fetch ─────────────────────────────────────────────────────────────────
async function apiFetch(method, url, body = null) {
    try {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(url, opts);
        const data = await res.json();

        if (!res.ok) {
            toast(data.error || `Error ${res.status}`, 'error');
            return null;
        }
        return data;
    } catch (err) {
        toast('Gagal terhubung ke server: ' + err.message, 'error');
        return null;
    }
}
