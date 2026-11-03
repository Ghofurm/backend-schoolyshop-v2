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
│   │   ├── seed/            # Data seed katalog (produk, kategori, seller)
│   │   ├── schema.ts        # Definisi schema Drizzle
│   │   └── seed.ts          # Seed akun + katalog development
│   ├── middlewares/         # Middleware Express (error handler, logger, auth, 404)
│   ├── routes/              # Definisi rute API
│   ├── schemas/             # Skema validasi zod
│   ├── services/            # Logika bisnis
│   ├── types/               # Deklarasi tipe Express (req.user)
│   ├── utils/               # Helper error, validasi zod, dan pagination
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
| `FRONTEND_ORIGINS` | Tidak | `http://localhost:5173` | Origin frontend yang diizinkan CORS, dipisah koma |
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

Setelah migrasi, isi akun development dengan seed:

```bash
npm run db:seed
```

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

## Konvensi API

Semua endpoint berikutnya mengikuti konvensi di bawah ini.

### Format error

```json
{
  "code": "VALIDATION",
  "message": "Data yang dikirim tidak valid",
  "details": {}
}
```

`details` selalu ada (objek kosong bila tidak ada detail). Lempar error dengan `AppError` dari `src/utils/httpError.ts`:

```ts
throw new AppError(409, 'Email sudah terdaftar', { code: 'EMAIL_TAKEN' });
```

Pemetaan status ke kode default:

| HTTP | `code` |
| --- | --- |
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHENTICATED` (atau `INVALID_CREDENTIALS`) |
| 403 | `FORBIDDEN` (atau `ACCOUNT_INACTIVE`) |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` (atau `EMAIL_TAKEN`) |
| 422 | `VALIDATION` |
| 500 | `SERVER` |

Error yang tidak tertangani selalu menjadi 500 `SERVER`; pesan internal hanya dikembalikan saat bukan production.

### Validasi input

Validasi memakai zod di layer controller lewat helper `parseInput`:

```ts
const query = parseInput(paginationQuerySchema, req.query);
```

Jika gagal, helper melempar 422 `VALIDATION` dengan `details.fields` berisi satu pesan per field. Field bersarang memakai dot (`address.city`); error tingkat root memakai `root`:

```json
{
  "code": "VALIDATION",
  "message": "Data yang dikirim tidak valid",
  "details": {
    "fields": {
      "email": "Email tidak valid"
    }
  }
}
```

### Pagination

Query standar: `page` (default `1`) dan `perPage` (default `10`, maksimum `50`). Gunakan `paginationQuerySchema`, `paginationOffset`, dan `paginate` dari `src/utils/pagination.ts` agar format tidak disalin per endpoint.

```ts
const query = parseInput(paginationQuerySchema, req.query);
const [rows, total] = await getRows(query); // implementasi endpoint
res.json(paginate(rows, total, query));
```

Bentuk respons:

```json
{
  "data": [],
  "meta": { "page": 1, "perPage": 10, "total": 0, "totalPages": 0 }
}
```

### CORS dan logger

CORS mengizinkan origin dari `FRONTEND_ORIGINS` (dipisah koma) dan mengirim kredensial (cookie). Request logger (method, path, status, durasi) hanya aktif di `NODE_ENV=development`.

### Sebelum commit

Wajib lulus:

```bash
npm run lint
npm run typecheck
```

## Autentikasi & Sesi

Kata sandi di-hash dengan **bcrypt** (cost 12). bcrypt dipilih karena pustaka matang, tersedia prebuilt untuk Node LTS, dan memadai untuk kebutuhan aplikasi ini.

Sesi disimpan di tabel `sessions` sebagai hash SHA-256 dari token acak. Cookie hanya berisi token asli; saat logout baris sesi dihapus, sehingga token tidak bisa dipakai lagi. Cookie `schoolyshop_session` bersifat `httpOnly`, `SameSite=Lax`, `Secure` di production, dan berlaku 1 hari (30 hari bila login mengirim `rememberMe: true`). Frontend harus mengirim request dengan kredensial (`credentials: 'include'`) dan origin-nya harus terdaftar di `FRONTEND_ORIGINS`.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/auth/register` | Body `{ name, email, password }`; 201 mengembalikan profil user; email terdaftar → 409 `EMAIL_TAKEN` |
| `POST` | `/auth/login` | Body `{ email, password, rememberMe? }`; 200 mengembalikan profil user + cookie sesi; kredensial salah → 401 `INVALID_CREDENTIALS`; akun nonaktif → 403 `ACCOUNT_INACTIVE` |
| `POST` | `/auth/logout` | Menghapus sesi dan cookie; 204 |
| `GET` | `/auth/me` | Butuh sesi; mengembalikan profil lengkap user yang login; tanpa sesi → 401 `UNAUTHENTICATED` |

Middleware `requireAuth` dan `requireAdmin` tersedia di `src/middlewares/auth.ts`. `requireAdmin` menolak non-admin dengan 403 `FORBIDDEN`.

### Akun seed development

```bash
npm run db:seed
```

| Email | Password | Role |
| --- | --- | --- |
| `admin@schoolyshop.test` | `Schoolyshop123!` | `admin` |
| `user@schoolyshop.test` | `Schoolyshop123!` | `user` |

Seed bersifat idempotent: jika email sudah ada, data akun diperbarui.

## Profil Pengguna

Semua endpoint di bawah ini butuh sesi login (`requireAuth`). `GET /users/me` dan `GET /auth/me` mengembalikan bentuk yang sama:

```json
{
  "id": 1,
  "name": "Nama Pengguna",
  "email": "user@example.com",
  "phone": "08123456789",
  "role": "user",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/users/me` | Profil lengkap termasuk telepon dan tanggal daftar |
| `PATCH` | `/users/me` | Body `{ name?, email?, phone? }`; mengembalikan profil terbaru. Email yang sudah dipakai → 409 `EMAIL_TAKEN`. `phone: ""` atau `null` mengosongkan telepon |
| `PATCH` | `/users/me/password` | Body `{ currentPassword, newPassword }`; 204 jika berhasil. Kata sandi lama salah → 422 `VALIDATION` dengan `details.fields.currentPassword` |

Setelah kata sandi diubah, sesi lain milik user tersebut dihapus; sesi yang dipakai untuk mengubah tetap aktif. Berlaku untuk semua akun, termasuk akun seed.

## Katalog Produk & Kategori

Endpoint katalog bersifat publik (tanpa login). Data seed diambil dari `PRODUCT_MOCKS` frontend: 24 produk, 7 kategori, dan 9 seller. Produk kategori `Pakaian Sekolah` mendapat varian ukuran `S`, `M`, `L`, `XL`, `XXL`; kategori lain memakai satu varian `All Size`.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/products` | Daftar produk dengan pencarian, filter, sorting, dan pagination |
| `GET` | `/products/:slug` | Detail produk beserta `variants[]` |
| `GET` | `/products/:id/related` | Produk terkait (kategori sama dulu, lalu kategori lain); default 4, `?limit=` maks 20 |
| `GET` | `/categories` | Daftar kategori + `productCount` |

Query `GET /products`:

| Parameter | Keterangan |
| --- | --- |
| `q` | Cari di nama produk, kategori, nama seller, dan role seller |
| `category` | Slug atau nama kategori, mis. `pakaian-sekolah` |
| `minPrice`, `maxPrice` | Rentang harga angka (Rupiah), memakai harga dasar produk |
| `sort` | `relevan` (default), `termurah`, `termahal` |
| `page`, `perPage` | Pagination standar; `perPage` maksimum 50 |
| `featured` | `true` untuk produk unggulan beranda |
| `limit` | Membatasi jumlah item (mis. beranda `?featured=true&limit=8`); mengalahkan `perPage` |

Respons daftar memakai format pagination standar. `limit=1` bisa dipakai beranda untuk mengambil `meta.total`:

```json
{
  "data": [
    {
      "id": 1,
      "slug": "seragam-batik-sekolah-resmi",
      "name": "Seragam Batik Sekolah Resmi",
      "description": "...",
      "price": 120000,
      "tag": "Pakaian",
      "image": null,
      "featured": true,
      "category": "Pakaian Sekolah",
      "categorySlug": "pakaian-sekolah",
      "seller": { "id": 1, "label": "Bu Siti (Guru)", "role": "Guru" },
      "stock": 67
    }
  ],
  "meta": { "page": 1, "perPage": 10, "total": 24, "totalPages": 3 }
}
```

Detail produk menambahkan `variants[]`:

```json
{
  "variants": [
    { "id": 1, "sku": "seragam-batik-sekolah-resmi-s", "size": "S", "stock": 7, "priceAdjustment": 0 }
  ]
}
```

`GET /products/:id/related` dan `GET /categories` mengembalikan `{ "data": [...] }`.

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
| `npm run db:seed` | Mengisi akun dan katalog development |
| `npm run db:studio` | Membuka Drizzle Studio |

## Catatan

- Tabel `users` dan `sessions` dipakai untuk autentikasi. Fitur e-commerce lainnya akan dikembangkan pada issue terpisah.
- File `.env` tidak boleh di-commit. Gunakan `.env.example` sebagai referensi konfigurasi.
