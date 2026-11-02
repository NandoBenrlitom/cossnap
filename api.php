<?php
/**
 * api.php — REST API Handler (CRUD)
 * Cosplay Photography Booking Management System
 * PHP 8.4 + SQLite (PDO)
 *
 * Endpoints:
 *   GET    api.php?resource=bookings            → list all
 *   GET    api.php?resource=bookings&id=1       → get single
 *   POST   api.php?resource=bookings            → create
 *   PUT    api.php?resource=bookings&id=1       → update
 *   DELETE api.php?resource=bookings&id=1       → delete
 *   GET    api.php?resource=stats               → dashboard stats
 *   (same pattern for clients)
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

// ── CORS & JSON Headers ─────────────────────────────────────────────────────
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Router ──────────────────────────────────────────────────────────────────
$method   = $_SERVER['REQUEST_METHOD'];
$resource = $_GET['resource'] ?? '';
$id       = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Parse body for PUT
$body = [];
if (in_array($method, ['POST', 'PUT'], true)) {
    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true) ?? $_POST;
}

$pdo = getDB();

try {
    match ($resource) {
        'bookings' => handleBookings($pdo, $method, $id, $body),
        'clients'  => handleClients($pdo, $method, $id, $body),
        'stats'    => handleStats($pdo),
        default    => respond(404, ['error' => "Resource '$resource' tidak ditemukan."]),
    };
} catch (PDOException $e) {
    respond(500, ['error' => 'Database error: ' . $e->getMessage()]);
}

// ── Bookings Handler ─────────────────────────────────────────────────────────
function handleBookings(PDO $pdo, string $method, ?int $id, array $body): void
{
    match ($method) {
        'GET'    => $id ? getBooking($pdo, $id)   : listBookings($pdo),
        'POST'   => createBooking($pdo, $body),
        'PUT'    => updateBooking($pdo, $id, $body),
        'DELETE' => deleteBooking($pdo, $id),
        default  => respond(405, ['error' => 'Method not allowed']),
    };
}

function listBookings(PDO $pdo): void
{
    $search  = $_GET['search']  ?? '';
    $status  = $_GET['status']  ?? '';
    $package = $_GET['package'] ?? '';

    $sql    = "SELECT * FROM bookings WHERE 1=1";
    $params = [];

    if ($search !== '') {
        $sql .= " AND (client_name LIKE :search OR cosplay_character LIKE :search OR location LIKE :search)";
        $params[':search'] = "%$search%";
    }
    if ($status !== '') {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }
    if ($package !== '') {
        $sql .= " AND package = :package";
        $params[':package'] = $package;
    }

    $sql .= " ORDER BY session_date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(200, $stmt->fetchAll());
}

function getBooking(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    $row ? respond(200, $row) : respond(404, ['error' => 'Booking tidak ditemukan']);
}

function createBooking(PDO $pdo, array $data): void
{
    $required = ['client_name', 'cosplay_character', 'session_date', 'location'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            respond(422, ['error' => "Field '$field' wajib diisi."]);
            return;
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO bookings
            (client_id, client_name, cosplay_character, package, session_date, duration, location, price, status, notes)
        VALUES
            (:client_id, :client_name, :cosplay_character, :package, :session_date, :duration, :location, :price, :status, :notes)
    ");

    $stmt->execute([
        ':client_id'         => $data['client_id']         ?? null,
        ':client_name'       => trim($data['client_name']),
        ':cosplay_character' => trim($data['cosplay_character']),
        ':package'           => $data['package']           ?? 'basic',
        ':session_date'      => $data['session_date'],
        ':duration'          => (int)($data['duration']    ?? 2),
        ':location'          => trim($data['location']),
        ':price'             => (float)($data['price']     ?? 0),
        ':status'            => $data['status']            ?? 'pending',
        ':notes'             => $data['notes']             ?? null,
    ]);

    $newId = (int)$pdo->lastInsertId();
    getBooking($pdo, $newId);
}

function updateBooking(PDO $pdo, ?int $id, array $data): void
{
    if (!$id) { respond(400, ['error' => 'ID diperlukan']); return; }

    $stmt = $pdo->prepare("SELECT id FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) { respond(404, ['error' => 'Booking tidak ditemukan']); return; }

    $pdo->prepare("
        UPDATE bookings SET
            client_id           = :client_id,
            client_name         = :client_name,
            cosplay_character   = :cosplay_character,
            package             = :package,
            session_date        = :session_date,
            duration            = :duration,
            location            = :location,
            price               = :price,
            status              = :status,
            notes               = :notes,
            updated_at          = datetime('now', 'localtime')
        WHERE id = :id
    ")->execute([
        ':id'                => $id,
        ':client_id'         => $data['client_id']         ?? null,
        ':client_name'       => trim($data['client_name']  ?? ''),
        ':cosplay_character' => trim($data['cosplay_character'] ?? ''),
        ':package'           => $data['package']           ?? 'basic',
        ':session_date'      => $data['session_date']      ?? '',
        ':duration'          => (int)($data['duration']    ?? 2),
        ':location'          => trim($data['location']     ?? ''),
        ':price'             => (float)($data['price']     ?? 0),
        ':status'            => $data['status']            ?? 'pending',
        ':notes'             => $data['notes']             ?? null,
    ]);

    getBooking($pdo, $id);
}

function deleteBooking(PDO $pdo, ?int $id): void
{
    if (!$id) { respond(400, ['error' => 'ID diperlukan']); return; }
    $stmt = $pdo->prepare("DELETE FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    $stmt->rowCount()
        ? respond(200, ['message' => 'Booking berhasil dihapus', 'id' => $id])
        : respond(404, ['error' => 'Booking tidak ditemukan']);
}

// ── Clients Handler ──────────────────────────────────────────────────────────
function handleClients(PDO $pdo, string $method, ?int $id, array $body): void
{
    match ($method) {
        'GET'    => $id ? getClient($pdo, $id)   : listClients($pdo),
        'POST'   => createClient($pdo, $body),
        'PUT'    => updateClient($pdo, $id, $body),
        'DELETE' => deleteClient($pdo, $id),
        default  => respond(405, ['error' => 'Method not allowed']),
    };
}

function listClients(PDO $pdo): void
{
    $search = $_GET['search'] ?? '';
    $sql = "
        SELECT c.*,
               COUNT(b.id) AS total_bookings,
               COALESCE(SUM(b.price), 0) AS total_spent
        FROM clients c
        LEFT JOIN bookings b ON b.client_id = c.id
        WHERE 1=1
    ";
    $params = [];

    if ($search !== '') {
        $sql .= " AND (c.name LIKE :search OR c.email LIKE :search OR c.phone LIKE :search)";
        $params[':search'] = "%$search%";
    }

    $sql .= " GROUP BY c.id ORDER BY c.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(200, $stmt->fetchAll());
}

function getClient(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare("
        SELECT c.*,
               COUNT(b.id) AS total_bookings,
               COALESCE(SUM(b.price), 0) AS total_spent
        FROM clients c
        LEFT JOIN bookings b ON b.client_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) { respond(404, ['error' => 'Klien tidak ditemukan']); return; }

    // Riwayat booking klien
    $histStmt = $pdo->prepare("SELECT * FROM bookings WHERE client_id = ? ORDER BY session_date DESC");
    $histStmt->execute([$id]);
    $row['bookings'] = $histStmt->fetchAll();

    respond(200, $row);
}

function createClient(PDO $pdo, array $data): void
{
    if (empty($data['name'])) { respond(422, ['error' => "Nama klien wajib diisi."]); return; }

    $stmt = $pdo->prepare("
        INSERT INTO clients (name, email, phone, social_media, notes)
        VALUES (:name, :email, :phone, :social_media, :notes)
    ");
    $stmt->execute([
        ':name'         => trim($data['name']),
        ':email'        => trim($data['email']        ?? ''),
        ':phone'        => trim($data['phone']        ?? ''),
        ':social_media' => trim($data['social_media'] ?? ''),
        ':notes'        => $data['notes']             ?? null,
    ]);

    getClient($pdo, (int)$pdo->lastInsertId());
}

function updateClient(PDO $pdo, ?int $id, array $data): void
{
    if (!$id) { respond(400, ['error' => 'ID diperlukan']); return; }

    $stmt = $pdo->prepare("SELECT id FROM clients WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) { respond(404, ['error' => 'Klien tidak ditemukan']); return; }

    $pdo->prepare("
        UPDATE clients SET
            name         = :name,
            email        = :email,
            phone        = :phone,
            social_media = :social_media,
            notes        = :notes,
            updated_at   = datetime('now', 'localtime')
        WHERE id = :id
    ")->execute([
        ':id'           => $id,
        ':name'         => trim($data['name']         ?? ''),
        ':email'        => trim($data['email']        ?? ''),
        ':phone'        => trim($data['phone']        ?? ''),
        ':social_media' => trim($data['social_media'] ?? ''),
        ':notes'        => $data['notes']             ?? null,
    ]);

    getClient($pdo, $id);
}

function deleteClient(PDO $pdo, ?int $id): void
{
    if (!$id) { respond(400, ['error' => 'ID diperlukan']); return; }
    $stmt = $pdo->prepare("DELETE FROM clients WHERE id = ?");
    $stmt->execute([$id]);
    $stmt->rowCount()
        ? respond(200, ['message' => 'Klien berhasil dihapus', 'id' => $id])
        : respond(404, ['error' => 'Klien tidak ditemukan']);
}

// ── Stats Handler ────────────────────────────────────────────────────────────
function handleStats(PDO $pdo): void
{
    $stats = [];

    // Total bookings
    $stats['total_bookings'] = (int)$pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn();

    // Bookings by status
    $rows = $pdo->query("SELECT status, COUNT(*) AS cnt FROM bookings GROUP BY status")->fetchAll();
    $stats['by_status'] = [];
    foreach ($rows as $r) {
        $stats['by_status'][$r['status']] = (int)$r['cnt'];
    }

    // Total revenue (completed bookings)
    $stats['total_revenue'] = (float)$pdo->query(
        "SELECT COALESCE(SUM(price), 0) FROM bookings WHERE status = 'completed'"
    )->fetchColumn();

    // Pending revenue
    $stats['pending_revenue'] = (float)$pdo->query(
        "SELECT COALESCE(SUM(price), 0) FROM bookings WHERE status IN ('pending','confirmed')"
    )->fetchColumn();

    // Total clients
    $stats['total_clients'] = (int)$pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn();

    // Bookings by package
    $rows = $pdo->query("SELECT package, COUNT(*) AS cnt FROM bookings GROUP BY package")->fetchAll();
    $stats['by_package'] = [];
    foreach ($rows as $r) {
        $stats['by_package'][$r['package']] = (int)$r['cnt'];
    }

    // Monthly revenue (last 6 months)
    $rows = $pdo->query("
        SELECT strftime('%Y-%m', session_date) AS month,
               COUNT(*) AS cnt,
               COALESCE(SUM(price), 0) AS revenue
        FROM bookings
        WHERE session_date >= date('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC
    ")->fetchAll();
    $stats['monthly'] = $rows;

    // Upcoming bookings (next 7 days)
    $upcoming = $pdo->query("
        SELECT * FROM bookings
        WHERE session_date >= datetime('now', 'localtime')
          AND status IN ('pending','confirmed')
        ORDER BY session_date ASC
        LIMIT 5
    ")->fetchAll();
    $stats['upcoming'] = $upcoming;

    // Recent bookings
    $recent = $pdo->query("
        SELECT * FROM bookings
        ORDER BY created_at DESC
        LIMIT 5
    ")->fetchAll();
    $stats['recent'] = $recent;

    respond(200, $stats);
}

// ── Helper ───────────────────────────────────────────────────────────────────
function respond(int $code, mixed $data): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
