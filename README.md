# Schoolyshop Backend

Backend API untuk aplikasi e-commerce **Schoolyshop**. Project ini menyediakan fondasi server Express, koneksi PostgreSQL melalui Drizzle ORM, struktur folder modular, serta health check untuk memastikan aplikasi dan database berjalan dengan baik.

## Tech Stack

| Komponen | Teknologi |
| --- | --- |
| Runtime | Node.js (LTS) |
| Bahasa | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Hot reload | tsx |
| Linter | ESLint |

## Prasyarat

- Node.js 20 atau lebih baru (disarankan versi LTS)
- npm
- PostgreSQL 14 atau lebih baru

## Struktur Folder

```text
.
├── drizzle.config.ts        # Konfigurasi Drizzle Kit
├── eslint.config.js         # Konfigurasi ESLint
├── src/
│   ├── config/
│   │   ├── database.ts      # Pool PostgreSQL & instance Drizzle
│   │   └── env.ts           # Loader environment (fail-fast)
│   ├── controllers/         # Handler request
│   ├── db/
│   │   ├── migrations/      # File migrasi hasil generate Drizzle Kit
│   │   └── schema.ts        # Definisi schema Drizzle
│   ├── middlewares/         # Middleware Express (error handler, 404)
│   ├── routes/              # Definisi rute API
│   ├── services/            # Logika bisnis
│   ├── app.ts               # Konfigurasi aplikasi Express
│   └── index.ts             # Entry point server
├── .env.example
└── package.json
```

## Instalasi

```bash
npm install
```

## Setup Environment

Salin file contoh environment, lalu sesuaikan nilainya dengan konfigurasi PostgreSQL lokal:

```bash
cp .env.example .env
```

Variabel yang tersedia:

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `NODE_ENV` | Tidak | `development` | `development`, `test`, atau `production` |
| `PORT` | Tidak | `3000` | Port server Express |
| `DB_HOST` | Ya | - | Host PostgreSQL |
| `DB_PORT` | Tidak | `5432` | Port PostgreSQL |
| `DB_USER` | Ya | - | User PostgreSQL |
| `DB_PASSWORD` | Ya | - | Password PostgreSQL |
| `DB_NAME` | Ya | - | Nama database |
| `DB_SSL` | Tidak | `false` | Aktifkan SSL koneksi database |

Aplikasi akan gagal cepat (fail-fast) saat dijalankan jika variabel wajib belum diisi.

## Setup Database

Buat database PostgreSQL (sesuaikan dengan `DB_NAME`):

```bash
createdb schoolyshop
```

Jalankan migrasi yang tersedia:

```bash
npm run db:migrate
```

Jika ingin mengubah schema, edit `src/db/schema.ts`, lalu generate dan jalankan migrasi baru:

```bash
npm run db:generate
npm run db:migrate
```

Perintah `npm run db:push` juga tersedia untuk menyinkronkan schema langsung tanpa file migrasi (cocok untuk eksperimen lokal).

## Menjalankan Aplikasi

### Development

```bash
npm run dev
```

Server berjalan di `http://localhost:3000` (atau sesuai `PORT`) dan otomatis restart ketika file berubah.

### Production

```bash
npm run build
npm start
```

Hasil build TypeScript disimpan di folder `dist/`.

## Health Check

```bash
curl http://localhost:3000/health
```

Contoh response ketika server dan database sehat:

```json
{
  "status": "ok",
  "environment": "development",
  "database": "connected",
  "uptime": 12.34,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Endpoint mengembalikan HTTP `200` jika database terhubung, atau HTTP `503` dengan status `degraded` jika koneksi database bermasalah.

## Scripts

| Script | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan server dengan hot reload |
| `npm run build` | Compile TypeScript ke folder `dist/` |
| `npm start` | Menjalankan hasil build |
| `npm run lint` | Menjalankan ESLint |
| `npm run lint:fix` | Menjalankan ESLint dan memperbaiki masalah otomatis |
| `npm run typecheck` | Cek tipe tanpa menghasilkan file build |
| `npm run db:generate` | Generate file migrasi dari schema |
| `npm run db:migrate` | Menjalankan migrasi ke database |
| `npm run db:push` | Sinkronisasi schema langsung ke database |
| `npm run db:studio` | Membuka Drizzle Studio |

## Catatan

- Tabel contoh `users` disediakan untuk membuktikan setup Drizzle dan migrasi berjalan. Autentikasi dan fitur e-commerce lainnya akan dikembangkan pada issue terpisah.
- File `.env` tidak boleh di-commit. Gunakan `.env.example` sebagai referensi konfigurasi.
