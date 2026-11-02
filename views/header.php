<?php
/**
 * views/header.php — Template Header
 * Cosplay Photography Booking Management System
 */
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CosSnap — Manajemen Booking Fotografi Cosplay</title>
    <meta name="description" content="Sistem manajemen booking sesi foto cosplay untuk fotografer freelance. Kelola jadwal, klien, dan pendapatan dalam satu platform.">
    <meta name="keywords" content="cosplay, fotografi, booking, jadwal, manajemen">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

    <!-- Lucide Icons CDN -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

    <!-- Main CSS -->
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<!-- ── Sidebar Navigation ── -->
<aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
        <div class="brand-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="13" stroke="url(#grad)" stroke-width="2"/>
                <circle cx="14" cy="14" r="6" fill="url(#grad)"/>
                <circle cx="14" cy="5" r="2" fill="url(#grad)"/>
                <circle cx="14" cy="23" r="2" fill="url(#grad)"/>
                <circle cx="5" cy="14" r="2" fill="url(#grad)"/>
                <circle cx="23" cy="14" r="2" fill="url(#grad)"/>
                <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
                        <stop offset="0%" stop-color="#a855f7"/>
                        <stop offset="100%" stop-color="#ec4899"/>
                    </linearGradient>
                </defs>
            </svg>
        </div>
        <div>
            <div class="brand-name">CosSnap</div>
            <div class="brand-sub">Booking Studio</div>
        </div>
    </div>

    <nav class="sidebar-nav">
        <div class="nav-section-label">Menu</div>
        <a href="#" class="nav-item active" data-page="dashboard" id="nav-dashboard">
            <i data-lucide="layout-dashboard"></i>
            <span>Dashboard</span>
        </a>
        <a href="#" class="nav-item" data-page="bookings" id="nav-bookings">
            <i data-lucide="calendar-check"></i>
            <span>Booking</span>
            <span class="nav-badge" id="badge-pending">0</span>
        </a>
        <a href="#" class="nav-item" data-page="clients" id="nav-clients">
            <i data-lucide="users"></i>
            <span>Klien</span>
        </a>

        <div class="nav-section-label" style="margin-top: 1.5rem;">Info</div>
        <div class="sidebar-info-card">
            <div class="info-label">Sesi Hari Ini</div>
            <div class="info-value" id="today-sessions">—</div>
        </div>
    </nav>

    <div class="sidebar-footer">
        <div class="photographer-card">
            <div class="photographer-avatar">📷</div>
            <div>
                <div class="photographer-name">Fotografer</div>
                <div class="photographer-role">Admin</div>
            </div>
        </div>
    </div>
</aside>

<!-- ── Mobile Overlay ── -->
<div class="sidebar-overlay" id="sidebar-overlay"></div>

<!-- ── Main Content ── -->
<div class="main-wrapper">

    <!-- Top Bar -->
    <header class="topbar">
        <button class="topbar-menu-btn" id="sidebar-toggle">
            <i data-lucide="menu"></i>
        </button>
        <div class="topbar-title" id="page-title">Dashboard</div>
        <div class="topbar-actions">
            <div class="search-wrap">
                <i data-lucide="search"></i>
                <input type="text" id="global-search" placeholder="Cari booking, klien..." autocomplete="off">
            </div>
            <button class="btn btn-primary btn-sm" id="btn-add-main">
                <i data-lucide="plus"></i>
                <span>Tambah</span>
            </button>
        </div>
    </header>

    <!-- Page Content Area -->
    <main class="page-content" id="page-content">
        <!-- Diisi oleh app.js -->
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Memuat data...</p>
        </div>
    </main>
</div>

<!-- ── Toast Notification ── -->
<div class="toast-container" id="toast-container"></div>

<!-- ── Modal Overlay ── -->
<div class="modal-overlay" id="modal-overlay">
    <div class="modal" id="modal">
        <div class="modal-header">
            <h3 class="modal-title" id="modal-title">Modal</h3>
            <button class="modal-close" id="modal-close">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="modal-body" id="modal-body">
            <!-- Content injected by JS -->
        </div>
    </div>
</div>

<!-- ── Confirm Dialog ── -->
<div class="modal-overlay" id="confirm-overlay">
    <div class="modal modal-sm" id="confirm-modal">
        <div class="modal-header">
            <h3 class="modal-title" id="confirm-title">Konfirmasi</h3>
            <button class="modal-close" id="confirm-close">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="modal-body">
            <p id="confirm-message"></p>
            <div class="confirm-actions">
                <button class="btn btn-ghost" id="confirm-cancel">Batal</button>
                <button class="btn btn-danger" id="confirm-ok">Hapus</button>
            </div>
        </div>
    </div>
</div>
