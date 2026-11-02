# CosSnap — Aplikasi Manajemen Booking Fotografi Cosplay

> Sistem booking freelance untuk fotografer cosplay. Dibangun dengan PHP 8.4 + SQLite, di-deploy ke **Azure App Service (Linux)**.

---

## 🚀 Cara Menjalankan Lokal

### Prasyarat
- PHP 8.4+ dengan ekstensi `pdo_sqlite`
- Tidak perlu Composer atau database eksternal

### Jalankan Development Server

```bash
cd /path/ke/project
php -S localhost:8080 index.php
```

Buka browser: [http://localhost:8080](http://localhost:8080)

Database SQLite akan otomatis dibuat di folder `data/booking.db` saat pertama kali diakses.

---

## ☁️ Deploy ke Azure App Service

### Prasyarat
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) terinstall
- Login ke Azure: `az login`

### Langkah 1: Buat Resource Group & App Service

```bash
# Buat Resource Group
az group create \
  --name cossnap-nando \
  --location indonesiacentral

# Buat App Service Plan (Linux, tier Free F1)
az appservice plan create \
  --name cossnap \
  --resource-group cossnap-nando \
  --sku F1 \
  --is-linux

# Buat Web App dengan PHP 8.4
az webapp create \
  --resource-group cossnap-nando \
  --plan cossnap \
  --name cossnap \
  --runtime "PHP:8.4"
```

> Jika nama Web App `cossnap` sudah digunakan, ganti dengan nama unik. Nama tersebut menjadi subdomain `.azurewebsites.net`.

### Langkah 2: Konfigurasi App Settings

```bash
# Disable Oryx build (tidak perlu Composer)
az webapp config appsettings set \
  --resource-group cossnap-nando \
  --name cossnap \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false

# Timezone Jakarta
az webapp config appsettings set \
  --resource-group cossnap-nando \
  --name cossnap \
  --settings WEBSITE_TIME_ZONE="SE Asia Standard Time"
```

### Langkah 3: Deploy via ZIP

```bash
# Buat ZIP (exclude folder data/ dan .git/)
zip -r site.zip . \
  --exclude "data/*" \
  --exclude ".git/*" \
  --exclude "*.zip" \
  --exclude ".DS_Store"

# Deploy ke Azure
az webapp deployment source config-zip \
  --resource-group cossnap-nando \
  --name cossnap \
  --src site.zip
```

### Langkah 4: Buka Aplikasi

```bash
# Buka di browser
az webapp browse --resource-group cossnap-nando --name cossnap
```

URL: `https://cossnap.azurewebsites.net`

---

## 🗄️ Database

- **Engine**: SQLite 3 via PHP PDO
- **Lokasi**: `data/booking.db` (di-exclude dari git dan ZIP deployment)
- **Inisialisasi**: Otomatis saat aplikasi pertama diakses
- **Seed Data**: 5 klien + 7 booking contoh diisi otomatis

### Skema Tabel

#### `clients`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Nama klien |
| email | TEXT | Email |
| phone | TEXT | No. HP |
| social_media | TEXT | Handle IG/TikTok |
| notes | TEXT | Catatan |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

#### `bookings`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| client_id | INTEGER FK | Referensi ke clients |
| client_name | TEXT | Nama klien |
| cosplay_character | TEXT | Karakter yang dibawakan |
| package | TEXT | basic / standard / premium |
| session_date | TEXT | Tanggal & jam sesi |
| duration | INTEGER | Durasi (jam) |
| location | TEXT | Lokasi pemotretan |
| price | REAL | Harga (IDR) |
| status | TEXT | pending/confirmed/completed/cancelled |
| notes | TEXT | Catatan tambahan |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

---

## 📦 Struktur Project

```
deploy-service-azure/
├── index.php              # Entry point utama
├── api.php                # REST API handler (CRUD)
├── db.php                 # Database connection + schema
├── .user.ini              # PHP config (upload, memory, timezone)
├── .gitignore             # Exclude data/ dan artifacts
├── data/                  # SQLite DB (auto-created, gitignored)
├── assets/
│   ├── css/
│   │   └── style.css      # Premium dark glassmorphism CSS
│   └── js/
│       └── app.js         # SPA frontend logic (Vanilla JS)
├── views/
│   ├── header.php         # Template header + sidebar
│   └── footer.php         # Template footer
└── README.md              # Dokumentasi ini
```

---

## 🎨 Fitur Aplikasi

| Fitur | Keterangan |
|---|---|
| **Dashboard** | Statistik booking, revenue chart, sesi mendatang |
| **CRUD Booking** | Tambah, lihat, edit, hapus jadwal sesi foto |
| **CRUD Klien** | Manajemen data klien + riwayat booking |
| **Filter & Search** | Filter by status, paket, dan pencarian nama |
| **Status Tracking** | pending → confirmed → completed / cancelled |
| **Revenue Report** | Chart revenue bulanan + by paket |
| **Responsive** | Mobile-friendly sidebar navigation |

---

## 🛠️ Tech Stack

- **Runtime**: PHP 8.4 (Linux Azure App Service)
- **Database**: SQLite 3 via PDO (`pdo_sqlite` built-in)
- **Frontend**: Vanilla HTML5 + CSS3 + JavaScript (ES2024)
- **Icons**: Lucide Icons (CDN)
- **Charts**: Chart.js v4 (CDN)
- **Typography**: Space Grotesk + Inter (Google Fonts)

---

## 📝 Catatan Penting

> ⚠️ **SQLite di Azure**: Database SQLite disimpan di `/home/site/wwwroot/data/`. File ini **persistent** selama App Service tidak di-restart total. Untuk production skala besar, gunakan **Azure Database for MySQL/PostgreSQL**.

> 💡 **Timezone**: Sudah dikonfigurasi ke Asia/Jakarta melalui `.user.ini` dan app settings.

---

## 👨‍💻 Developer

Nama: Nanda Pratama Sugiarto
NIM: 102062400019
Kelas: IS-07-01
Mata Kuliah: **Komputasi Awan** — Semester 5  
Platform: Azure App Service (Linux, PHP 8.4)  
Database: SQLite via PDO (no external DB required)
