<?php
/**
 * index.php — Main Entry Point
 * Cosplay Photography Booking Management System
 * PHP 8.4
 */
declare(strict_types=1);

// Initialize DB on first load
require_once __DIR__ . '/db.php';
getDB(); // Ensures schema & seed data

include __DIR__ . '/views/header.php';
include __DIR__ . '/views/footer.php';
