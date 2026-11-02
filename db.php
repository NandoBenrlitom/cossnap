<?php
/**
 * db.php — Database Connection & Schema Initialization
 * Cosplay Photography Booking Management System
 * PHP 8.4 + SQLite (PDO)
 */

declare(strict_types=1);

function getDB(): PDO
{
    // Azure App Service: /home/site/wwwroot is persistent
    // Local dev: __DIR__/data/
    $dataDir = __DIR__ . '/data';

    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }

    $dbPath = $dataDir . '/booking.db';

    static $pdo = null;

    if ($pdo === null) {
        try {
            $pdo = new PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec('PRAGMA journal_mode = WAL;');
            $pdo->exec('PRAGMA foreign_keys = ON;');
            initSchema($pdo);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }

    return $pdo;
}

function initSchema(PDO $pdo): void
{
    // Tabel Clients
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS clients (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            email       TEXT,
            phone       TEXT,
            social_media TEXT,
            notes       TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    ");

    // Tabel Bookings
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bookings (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id           INTEGER REFERENCES clients(id) ON DELETE SET NULL,
            client_name         TEXT    NOT NULL,
            cosplay_character   TEXT    NOT NULL,
            package             TEXT    NOT NULL DEFAULT 'basic',
            session_date        TEXT    NOT NULL,
            duration            INTEGER NOT NULL DEFAULT 2,
            location            TEXT    NOT NULL,
            price               REAL    NOT NULL DEFAULT 0,
            status              TEXT    NOT NULL DEFAULT 'pending',
            notes               TEXT,
            created_at          TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at          TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    ");

    // Seed data jika tabel kosong
    $count = $pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn();
    if ((int)$count === 0) {
        seedData($pdo);
    }
}

function seedData(PDO $pdo): void
{
    // Seed clients
    $clients = [
        ['Sakura Haruno', 'sakura@mail.com', '081234567890', '@sakura_cosplay', 'Pelanggan setia sejak 2023'],
        ['Mikasa Ackermann', 'mikasa@mail.com', '082345678901', '@mikasa_snk', null],
        ['Rem ReZero', 'rem@mail.com', '083456789012', '@rem_cosplayer', 'Prefer outdoor shoot'],
        ['Zero Two', 'zerotwo@mail.com', '084567890123', '@02_darling', 'Butuh full face makeup time'],
        ['Nezuko Kamado', 'nezuko@mail.com', '085678901234', '@nezuko_kimetsu', null],
    ];

    $stmtC = $pdo->prepare("
        INSERT INTO clients (name, email, phone, social_media, notes)
        VALUES (:name, :email, :phone, :social_media, :notes)
    ");

    foreach ($clients as $c) {
        $stmtC->execute([
            ':name'         => $c[0],
            ':email'        => $c[1],
            ':phone'        => $c[2],
            ':social_media' => $c[3],
            ':notes'        => $c[4],
        ]);
    }

    // Seed bookings
    $bookings = [
        [1, 'Sakura Haruno', 'Sakura Haruno (Naruto)', 'standard', '2026-11-05 09:00', 3, 'Taman Suropati, Jakarta', 450000, 'confirmed', 'Bawa props sendiri'],
        [2, 'Mikasa Ackermann', 'Mikasa Ackermann (AOT)', 'premium', '2026-11-08 10:00', 5, 'Studio Indoor Kemang', 850000, 'pending', null],
        [3, 'Rem ReZero', 'Rem (Re:Zero)', 'basic', '2026-11-10 14:00', 2, 'TMII, Jakarta', 250000, 'completed', 'Outdoor only'],
        [4, 'Zero Two', 'Zero Two (DARLING)', 'premium', '2026-11-12 08:00', 6, 'Studio Barat, BSD', 950000, 'confirmed', null],
        [5, 'Nezuko Kamado', 'Nezuko (Kimetsu)', 'standard', '2026-11-15 11:00', 3, 'Hutan Pinus Gunung Mas', 500000, 'pending', 'Perlu ijin lokasi'],
        [1, 'Sakura Haruno', 'Tsunade Senju (Naruto)', 'basic', '2026-10-20 09:00', 2, 'Pantai Ancol', 250000, 'completed', null],
        [2, 'Mikasa Ackermann', 'Levi Ackermann (AOT)', 'standard', '2026-10-25 13:00', 3, 'Studio Indoor Kemang', 450000, 'cancelled', 'Batal karena hujan'],
    ];

    $stmtB = $pdo->prepare("
        INSERT INTO bookings (client_id, client_name, cosplay_character, package, session_date, duration, location, price, status, notes)
        VALUES (:client_id, :client_name, :cosplay_character, :package, :session_date, :duration, :location, :price, :status, :notes)
    ");

    foreach ($bookings as $b) {
        $stmtB->execute([
            ':client_id'         => $b[0],
            ':client_name'       => $b[1],
            ':cosplay_character' => $b[2],
            ':package'           => $b[3],
            ':session_date'      => $b[4],
            ':duration'          => $b[5],
            ':location'          => $b[6],
            ':price'             => $b[7],
            ':status'            => $b[8],
            ':notes'             => $b[9],
        ]);
    }
}
