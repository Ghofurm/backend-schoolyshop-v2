# Schoolyshop Backend

Backend API untuk aplikasi e-commerce **Schoolyshop**. Project ini menyediakan fondasi server Express, koneksi PostgreSQL melalui Drizzle ORM, struktur folder modular, serta health check untuk memastikan aplikasi dan database berjalan dengan baik.

## Tech Stack

| Komponen | Teknologi |
| --- | --- |
| Runtime | Node.js (LTS) |
| Bahasa | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (lokal / Neon) |
| ORM | Drizzle ORM |
| Hot reload | tsx |
| Linter | ESLint |
| Dokumentasi API | Swagger UI / OpenAPI 3 |

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
│   ├── docs/
│   │   └── openapi.ts       # Dokumen OpenAPI untuk Swagger UI
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
| `DATABASE_URL` | Tidak | - | Connection string **pooled** untuk runtime (mis. Neon). Bila diisi, `DB_*` tidak wajib |
| `DATABASE_URL_DIRECT` | Tidak | - | Connection string **direct** untuk migration Drizzle; fallback ke `DATABASE_URL` |
| `DB_HOST` | Ya* | - | Host PostgreSQL lokal |
| `DB_PORT` | Tidak | `5432` | Port PostgreSQL |
| `DB_USER` | Ya* | - | User PostgreSQL |
| `DB_PASSWORD` | Ya* | - | Password PostgreSQL |
| `DB_NAME` | Ya* | - | Nama database |
| `DB_SSL` | Tidak | `false` | Aktifkan SSL koneksi database lokal |

\* Wajib hanya bila `DATABASE_URL` kosong. Variabel `DB_*` adalah fallback untuk Postgres lokal.

Biteship (opsional; tanpa `BITESHIP_API_KEY` semua fitur pengiriman memakai data lokal):

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `BITESHIP_API_KEY` | Tidak | - | Aktifkan integrasi Biteship bila diisi |
| `BITESHIP_BASE_URL` | Tidak | `https://api.biteship.com` | Base URL API Biteship |
| `BITESHIP_ORIGIN_AREA_ID` | Tidak | - | Area ID asal pengiriman (disarankan) |
| `BITESHIP_ORIGIN_POSTAL_CODE` | Tidak | - | Alternatif origin jika area ID kosong |
| `BITESHIP_ORIGIN_CONTACT_NAME` | Tidak | `Koperasi Sekolah` | Nama kontak asal |
| `BITESHIP_ORIGIN_CONTACT_PHONE` | Tidak | `081200000000` | Telepon kontak asal |
| `BITESHIP_ORIGIN_ADDRESS` | Tidak | `Koperasi Sekolah` | Alamat asal |
| `BITESHIP_COURIERS` | Tidak | `jne,sicepat,jnt,anteraja` | Daftar kode kurir, dipisah koma |
| `BITESHIP_WEBHOOK_HEADER_KEY` | Tidak | `x-biteship-webhook-secret` | Nama header signature webhook |
| `BITESHIP_WEBHOOK_SECRET` | Tidak | - | Nilai secret header webhook; webhook ditolak bila kosong/tidak cocok |

Midtrans (opsional; tanpa server key memakai simulasi pembayaran lokal):

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `MIDTRANS_SERVER_KEY` | Tidak | - | Aktifkan Midtrans Core API bila diisi |
| `MIDTRANS_CLIENT_KEY` | Tidak | - | Client key Midtrans (untuk frontend) |
| `MIDTRANS_IS_PRODUCTION` | Tidak | `false` | `true` memakai API production dan mematikan simulate |
| `MIDTRANS_BASE_URL` | Tidak | otomatis | Override base URL (sandbox/production) |

Aplikasi akan gagal cepat (fail-fast) saat dijalankan jika variabel wajib belum diisi.

## Setup Database

### Opsi Neon (cloud)

1. Daftar/login di [neon.com](https://neon.com), lalu buat project baru (mis. `schoolyshop`) dengan region **Singapore (`aws-ap-southeast-1`)**.
2. Buka **Dashboard → Connection string** dan catat dua bentuk:
   - **Pooled** → untuk `DATABASE_URL` (runtime aplikasi).
   - **Direct** → untuk `DATABASE_URL_DIRECT` (migration Drizzle).
3. Isi `.env` (jangan commit):

   ```env
   DATABASE_URL=postgresql://...-pooler...
   DATABASE_URL_DIRECT=postgresql://...
   ```

4. Jalankan migrasi dan seed:

   ```bash
   npm run db:migrate   # memakai DATABASE_URL_DIRECT
   npm run db:seed      # memakai runtime DATABASE_URL (pooled)
   npm run dev
   ```

`DB_*` boleh dikosongkan jika `DATABASE_URL` sudah diisi. Neon compute bisa suspend saat idle, jadi request pertama setelah lama diam bisa terasa lebih lambat — itu normal. Connection string adalah secret; `.env` sudah masuk `.gitignore`.

### Opsi PostgreSQL lokal

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

## Dokumentasi API (Swagger)

Swagger UI tersedia di `http://localhost:3000/docs` (URL kanonik `/docs`) dan spec JSON di `http://localhost:3000/docs/openapi.json`. Path lama `/docs/api` dialihkan ke `/docs`. Dokumentasi bisa dibuka tanpa login.

Pendekatan yang dipakai: **spec-first** dalam bentuk objek OpenAPI 3 di `src/docs/openapi.ts`. Alasannya, endpoint sudah banyak dan tersebar di banyak modul; code-first membutuhkan anotasi JSDoc/registry tambahan di hampir semua route dan tetap perlu mendefinisikan skema respons secara manual. Satu objek spec lebih mudah ditinjau dan dijaga konsisten, dengan aturan pembaruan di bawah.

- Endpoint dikelompokkan per domain (Auth, Products, Cart, Orders, Admin, Webhooks, dst.).
- Format error `{ code, message, details }`, contoh 401/403/404/409/422/500, dan format pagination `{ data, meta }` tersedia sebagai komponen bersama.
- **Mencoba endpoint ber-cookie:** buka `/docs`, jalankan `POST /auth/login` lewat tombol *Try it out*, lalu panggil endpoint lain. UI memakai origin yang sama dan `withCredentials`, jadi cookie `schoolyshop_session` ikut terkirim.
- Webhook Biteship/Midtrans didokumentasikan sebagai grup terpisah dengan skema payload dan catatan signature.
- Dokumen tidak memuat secret/environment.

**Aturan keberlanjutan:** setiap PR yang menambah atau mengubah endpoint wajib memperbarui `src/docs/openapi.ts`. Spec yang basi lebih buruk daripada tidak ada dokumentasi.

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

Jika menambah/mengubah endpoint, perbarui juga `src/docs/openapi.ts`.

## Autentikasi & Sesi

Kata sandi di-hash dengan **bcrypt** (cost 12). bcrypt dipilih karena pustaka matang, tersedia prebuilt untuk Node LTS, dan memadai untuk kebutuhan aplikasi ini.

Sesi disimpan di tabel `sessions` sebagai hash SHA-256 dari token acak. Cookie hanya berisi token asli; saat logout baris sesi dihapus, sehingga token tidak bisa dipakai lagi. Cookie `schoolyshop_session` bersifat `httpOnly`, `SameSite=Lax`, `Secure` di production, dan berlaku 1 hari (30 hari bila login mengirim `rememberMe: true`). Frontend harus mengirim request dengan kredensial (`credentials: 'include'`) dan origin-nya harus terdaftar di `FRONTEND_ORIGINS`.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/auth/register` | Body `{ name, email, password }`; 201 mengembalikan profil user; email terdaftar → 409 `EMAIL_TAKEN` |
| `POST` | `/auth/login` | Body `{ email, password, rememberMe? }`; 200 mengembalikan profil user + cookie sesi; kredensial salah → 401 `INVALID_CREDENTIALS`; akun nonaktif → 403 `ACCOUNT_INACTIVE` |
| `POST` | `/auth/logout` | Menghapus sesi dan cookie; 204 |
| `GET` | `/auth/me` | Butuh sesi; mengembalikan profil lengkap user yang login; tanpa sesi → 401 `UNAUTHENTICATED` |
| `POST` | `/auth/forgot-password` | Body `{ email }`; selalu 204 agar keberadaan email tidak bocor; maksimal 5 request/15 menit per IP, selebihnya 429 `RATE_LIMITED` + `Retry-After` |
| `POST` | `/auth/reset-password` | Body `{ token, password }`; 204 jika berhasil. Token tidak valid/kedaluwarsa → 422 `VALIDATION` dengan `details.fields.token` |

Token reset bersifat opaque, disimpan sebagai hash SHA-256, berlaku 30 menit, dan hanya bisa dipakai sekali. Setelah reset berhasil, semua sesi user dicabut. Backend belum mengirim email; pada `NODE_ENV` selain `production` token dicatat ke log server dengan prefix `[auth] Password reset token for ...`. Integrasi email dapat ditambahkan kemudian tanpa mengubah kontrak endpoint.

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

## Alamat Pengguna

Semua endpoint alamat butuh login dan hanya mengakses alamat milik user tersebut. Alamat milik user lain diperlakukan sebagai tidak ditemukan (404 `NOT_FOUND`).

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/users/me/addresses` | Daftar alamat user, alamat utama lebih dulu; `{ "data": [...] }` |
| `POST` | `/users/me/addresses` | Buat alamat; 201. Alamat pertama otomatis menjadi utama |
| `PATCH` | `/users/me/addresses/:id` | Ubah sebagian field; `isPrimary: true` memindahkan flag utama |
| `DELETE` | `/users/me/addresses/:id` | Hapus alamat; 204. Jika alamat utama dihapus, alamat terlama berikutnya menjadi utama |

Field wajib: `label`, `recipientName`, `phone`, `areaId`, `district`, `city`, `province`, `postalCode`. Field opsional: `address` (alamat lengkap), `note`, `isPrimary`. `areaId` disimpan sebagai string bebas; validasi area Biteship menyusul di issue integrasi.

Hanya satu alamat yang boleh utama: membuat atau mengubah alamat dengan `isPrimary: true` otomatis menurunkan flag alamat utama sebelumnya.

```json
{
  "id": 1,
  "label": "Rumah",
  "recipientName": "Nama Penerima",
  "phone": "08123456789",
  "address": "Jl. Mawar No. 1",
  "areaId": "3273010",
  "district": "Bandung Wetan",
  "city": "Bandung",
  "province": "Jawa Barat",
  "postalCode": "40115",
  "note": "Pagar hijau",
  "isPrimary": true
}
```

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

## Keranjang Belanja

Keranjang disimpan per user dan semua endpoint butuh login (`requireAuth`). Satu baris keranjang mewakili satu produk; menambahkan produk yang sama akan menambah `qty` pada baris tersebut. Jika produk sudah ada dengan varian berbeda, permintaan ditolak 422; hapus item lama dulu untuk mengganti varian.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/cart` | Item keranjang + detail produk/varian, subtotal, total, dan jumlah barang |
| `POST` | `/cart/items` | Body `{ productId, variantId?, qty? }`; 201 mengembalikan keranjang terbaru |
| `PATCH` | `/cart/items/:productId` | Body `{ qty }` (nilai absolut); 200 mengembalikan keranjang terbaru |
| `DELETE` | `/cart/items/:productId` | Hapus satu produk dari keranjang; 204 |
| `DELETE` | `/cart` | Kosongkan keranjang; 204 |

Aturan stok:

- Jika `variantId` dikirim, stok dicek dari varian tersebut dan varian harus milik produk yang sama.
- Jika `variantId` tidak dikirim, stok dicek dari total stok semua varian produk.
- Melebihi stok → 422 `VALIDATION` dengan `details.fields.qty` berisi sisa stok.
- `variantId` tidak cocok dengan produk → 422 dengan `details.fields.variantId`.
- Produk atau item keranjang tidak ditemukan → 404 `NOT_FOUND`.

Harga tidak disimpan di keranjang: `unitPrice` dihitung dari harga produk saat request ditambah `priceAdjustment` varian, lalu `subtotal = unitPrice × qty`.

```json
{
  "data": [
    {
      "id": 1,
      "productId": 1,
      "variantId": 1,
      "qty": 2,
      "unitPrice": 120000,
      "subtotal": 240000,
      "product": {
        "id": 1,
        "slug": "seragam-batik-sekolah-resmi",
        "name": "Seragam Batik Sekolah Resmi",
        "price": 120000,
        "image": null,
        "seller": { "id": 1, "label": "Bu Siti (Guru)", "role": "Guru" }
      },
      "variant": {
        "id": 1,
        "sku": "seragam-batik-sekolah-resmi-s",
        "size": "S",
        "stock": 7,
        "priceAdjustment": 0
      }
    }
  ],
  "total": 240000,
  "itemCount": 2
}
```

## Checkout, Pesanan & Invoice

Alur lokal tanpa payment gateway/ongkir nyata: keranjang + alamat + tarif statis menjadi pesanan dengan snapshot data. Semua endpoint butuh login kecuali `GET /shipping/rates`.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/shipping/rates` | Tarif kurir statis (`courier`, `service`, `price`, `eta`); `destinationAreaId`/`weight` diterima tapi diabaikan |
| `POST` | `/checkouts` | Body `{ addressId, shippingRateId, paymentMethod? }`; membuat order dari keranjang, mengurangi stok, mengosongkan keranjang; 201 `{ orderId }` |
| `GET` | `/checkouts/:id` | Ringkasan order untuk halaman pembayaran (milik user) |
| `GET` | `/orders` | Riwayat pesanan + item/seller + status pembayaran; filter `status`, pagination |
| `GET` | `/orders/:id` | Detail lengkap dari snapshot |
| `POST` | `/orders/:id/receive` | Konfirmasi diterima → `Selesai`; pesanan final ditolak 422 |
| `GET` | `/orders/:id/invoice` | Invoice dari snapshot checkout |

Status pesanan: `Menunggu Pembayaran`, `Menunggu Verifikasi`, `Diproses`, `Dikirim`, `Dalam Pengembalian`, `Selesai`, dan `Dibatalkan`. Setelah pembayaran lunas, order masuk `Menunggu Verifikasi` sampai admin memutuskan; approve → `Diproses`, reject → `Dibatalkan`. `Dibatalkan` juga dipakai untuk pesanan kedaluwarsa. Pesanan `Menunggu Pembayaran` otomatis dibatalkan saat dibaca setelah 24 jam, dan stok varian dikembalikan.

Status pembayaran disimpan di order (`unpaid`, `pending`, `paid`, `expired`, `refunded`). Order lahir `unpaid`; setelah `POST /payments` menjadi `pending`, setelah dibayar menjadi `paid`. Invoice menampilkan nomor VA dari pembayaran terakhir bila sudah ada.

Snapshot yang disimpan saat checkout: nama/email/telepon pembeli, seluruh alamat kirim, kurir/layanan/ETA/ongkir, serta nama/harga/varian/seller tiap item. Perubahan produk atau alamat setelah checkout tidak mengubah order/invoice lama.

```json
{
  "id": 1,
  "status": "Menunggu Pembayaran",
  "paymentStatus": "unpaid",
  "paymentMethod": "Virtual Account BCA",
  "subtotal": 252000,
  "shippingCost": 15000,
  "total": 267000,
  "buyer": { "name": "Nama", "email": "user@example.com", "phone": "0812..." },
  "shipping": { "recipientName": "Nama", "city": "Bandung", "postalCode": "40115" },
  "courier": { "code": "jne-reguler", "name": "JNE", "service": "Reguler", "eta": "1-2 hari kerja" },
  "items": [],
  "sellers": [],
  "expiresAt": "2026-01-02T00:00:00.000Z"
}
```

## Pembayaran

Default-nya pembayaran memakai VA lokal. Jika `MIDTRANS_SERVER_KEY` diisi, pembuatan VA memakai Midtrans Core API (`POST /v2/charge`); tanpa key semuanya kembali ke simulasi lokal. Metode yang didukung: BCA, BNI, dan Mandiri (Mandiri Bill). Pada mode lokal, VA memakai prefix bank + timestamp + angka acak.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/payments` | Body `{ orderId, method }`; membuat VA Midtrans/lokal dan mengubah order `paymentStatus` menjadi `pending`; 201 |
| `GET` | `/payments/:id` | Status + data VA; fallback lokal menghitung `expired` bila lewat `expiresAt` |
| `POST` | `/payments/:id/simulate` | Khusus development: tandai lunas tanpa gateway; 404 di production atau saat Midtrans production aktif |

Aturan:

- Order yang sudah punya pembayaran `pending` atau sudah tidak `Menunggu Pembayaran` → 409 `CONFLICT`.
- `method` menerima `BCA`, `bni_va`, `Virtual Account Mandiri`, dan bentuk serupa (case-insensitive).
- Metode tidak dikenal → 422 `VALIDATION` dengan `details.fields.method`.
- Pembayaran/order lewat `expiresAt` saat dibaca → payment `expired`, order `Dibatalkan`, stok varian dikembalikan (fallback bila webhook terlewat).
- `simulate` mengembalikan 404 di production.

Mode Midtrans:

- `POST /v2/charge` memakai `custom_expiry` 24 jam; `expiresAt` payment dan order disamakan dengan respons Midtrans.
- `provider`, `externalOrderId`, `externalId`, dan `billerCode` disimpan di tabel `payments` (VA Mandiri memakai `bill_key` + `biller_code`).
- `POST /webhooks/midtrans` memverifikasi `signature_key = SHA512(order_id + status_code + gross_amount + server_key)` dan mencocokkan nominal.
- `settlement` (atau `capture` + fraud accept) → `markPaid`: payment `paid`, order `Menunggu Verifikasi` (admin tetap harus approve → `Diproses`).
- `expire`/`cancel`/`deny`/`failure` → payment `expired`, order `Dibatalkan`, stok kembali.
- `pending` tidak mengubah status; notifikasi duplikat diabaikan (idempotent).
- Midtrans down/timeout → 502 `SERVER`; tanpa key, alur lokal tetap jalan.

```json
{
  "paymentId": 1,
  "orderId": 1,
  "provider": "midtrans",
  "method": "BCA",
  "methodLabel": "Virtual Account BCA",
  "vaNumber": "12345678901",
  "billerCode": null,
  "amount": 267000,
  "expiresAt": "2026-01-02T00:00:00.000Z",
  "status": "pending",
  "paidAt": null,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## Retur & Ulasan

### Retur

Semua endpoint retur butuh login dan hanya mengakses data milik user. Retur hanya bisa diajukan untuk pesanan berstatus `Dikirim` atau `Selesai`; satu pesanan hanya boleh punya satu retur aktif (`Menunggu Keputusan`/`Disetujui`).

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/returns` | Ajukan retur; 201 dengan status `Menunggu Keputusan` |
| `GET` | `/returns` | Daftar retur user + item, foto, dan status keputusan |
| `POST` | `/returns/:id/photos` | Upload foto barang (multipart field `photos`); 201 |

Body `POST /returns`:

```json
{
  "orderId": 1,
  "items": [
    { "orderItemId": 1, "qty": 1, "reason": "Ukuran tidak cocok" },
    { "productId": 3, "qty": 1, "reason": "Sampul rusak" }
  ]
}
```

`orderItemId` atau `productId` cukup salah satu. Qty tidak boleh melebihi qty pembelian. Field status yang disiapkan untuk keputusan admin: `status`, `decisionAt`, `refundMethod`, `adminNote` (masih `null` sampai issue admin).

Foto: maksimal 5 foto per pengajuan, masing-masing maksimal 5 MB, format JPEG/PNG/WebP. File disimpan di folder lokal `uploads/returns/<returnId>/` (gitignored) dan disajikan lewat `/uploads/...`; respons memuat URL relatifnya di `photos[].url`.

```json
{
  "id": 1,
  "orderId": 1,
  "status": "Menunggu Keputusan",
  "decisionAt": null,
  "refundMethod": null,
  "adminNote": null,
  "submittedAt": "2026-01-01T00:00:00.000Z",
  "items": [
    { "id": 1, "orderItemId": 1, "productId": 1, "productName": "Seragam Batik Sekolah Resmi", "variantSize": "S", "qty": 1, "reason": "Ukuran tidak cocok" }
  ],
  "photos": [
    { "id": 1, "url": "/uploads/returns/1/foto.png", "originalName": "foto.png", "mimeType": "image/png", "size": 1024 }
  ]
}
```

### Ulasan

Ulasan hanya untuk pesanan milik user berstatus `Selesai`. Satu produk per pesanan hanya bisa diulas sekali; ulasan tidak bisa diedit dan belum dimoderasi.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/orders/:id/reviews` | Kirim satu/lebih ulasan; 201 `{ "data": [...] }` |
| `GET` | `/reviews` | Riwayat ulasan user dengan pagination |

Body menerima `{ "reviews": [...] }` (juga array langsung atau `{ "items": [...] }`):

```json
{
  "reviews": [
    { "productId": 1, "rating": 5, "comment": "Bahan bagus" },
    { "productId": 3, "rating": 4, "comment": "Cepat sampai" }
  ]
}
```

Rating 1–5, komentar opsional maksimal 1000 karakter. Duplikat → 409 `CONFLICT`; pesanan belum `Selesai` atau produk bukan bagian pesanan → 422.

## Pengiriman & Pelacakan

Default-nya pengiriman lokal satu resi per pesanan. Jika `BITESHIP_API_KEY` diisi, tarif, pencarian area, pembuatan resi, dan pelacakan memakai Biteship; tanpa key semuanya kembali ke data lokal. Admin membuat pengiriman untuk order `Diproses`; order berpindah ke `Dikirim` dan event pertama dibuat otomatis. Saat pembeli menerima pesanan, shipment dan event pelacakannya ikut menjadi `Selesai`.

Endpoint admin (`requireAdmin`):

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/shipments` | Daftar order siap kirim + shipment; filter `status`, `courier`, cari `search`/`q` (resi/nama penerima), pagination |
| `POST` | `/admin/shipments` | Body `{ orderId, shippingRateId }` atau `{ orderId, courier, service? }`; 201 |
| `GET` | `/admin/shipments/:id` | Detail penerima, alamat, kurir, resi, item, total, `labelUrl` |
| `GET` | `/admin/shipments/:id/tracking` | Riwayat event, terbaru dulu |

Endpoint user (butuh login):

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/shipments/track?q=` | Cari dengan resi atau ID pesanan; hanya shipment milik sendiri, admin bebas |

Endpoint publik tambahan:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/shipping/rates` | Tarif lokal, atau tarif Biteship bila key aktif + `destinationAreaId` |
| `GET` | `/shipping/areas?q=` | Proxy pencarian area Biteship; tanpa key mengembalikan daftar kosong (`source: local`) |
| `POST` | `/webhooks/biteship` | Webhook status Biteship, diverifikasi lewat header key/secret dari env |

Mode Biteship:

- Berat paket dihitung dari `products.weight` (gram, default `1000`) × qty keranjang; `weight` query pada `/shipping/rates` juga diterima.
- Produk admin bisa mengisi `weight`; nilai disimpan per produk dan disalin ke `order_items` saat checkout.
- Respons tarif Biteship memakai `id` string (mis. `jne-reg`), bukan ID numerik lokal; checkout menerima keduanya.
- Saat shipment dibuat, backend memanggil `POST /v1/orders`, menyimpan `provider`, `biteshipOrderId`, `biteshipTrackingId`, resi/waybill, dan `labelUrl` dari Biteship. Order tetap `Diproses → Dikirim`.
- Webhook `order.status`/`order.waybill_id` menambah `tracking_events`; status `delivered` menandai shipment `Selesai`. Event duplikat beruntun diabaikan.
- Gangguan/timeout Biteship → 502 `SERVER`, tanpa menulis data lokal setengah jadi.

Catatan lokal:

- Status daftar: `Siap Dikirim` (order `Diproses` belum punya shipment), `Dikirim`, `Selesai`. Satu order hanya boleh punya satu shipment.
- Tanpa key, resi dibuat backend dengan pola prefix kurir + timestamp + ID shipment, unik dan terurut waktu (contoh `SC202611041530000007`).
- `shippingRateId` mengacu ke `GET /shipping/rates`; alternatif `courier` menerima nama seperti `JNE REG`/`SiCepat REG` dan dicocokkan ke tarif.
- Event awal: `Dikirim` di `Koperasi Sekolah` (lokal) atau `Biteship`; saat diterima: `Selesai` di `Tujuan`.
- Bentuk respons tracking: `orderId`, `orderStatus`, `courier`, `service`, `trackingNumber`, `status`, `recipientName`, `shippingAddress`, `history[]` (`status`, `location`, `description`, `occurredAt`).

```json
{
  "orderId": 1,
  "orderStatus": "Dikirim",
  "courier": "SiCepat",
  "service": "SIUNTUNG",
  "trackingNumber": "SC202611041530000001",
  "status": "Dikirim",
  "recipientName": "Nama Penerima",
  "shippingAddress": "Jl. Mawar No. 1, Bandung Wetan, Bandung, Jawa Barat",
  "history": [
    {
      "status": "Dikirim",
      "location": "Koperasi Sekolah",
      "description": "Paket diserahkan ke SiCepat SIUNTUNG",
      "occurredAt": "2026-11-04T08:30:00.000Z"
    }
  ]
}
```

## Admin — Katalog

Semua endpoint di bagian ini butuh admin (`requireAdmin`). Produk berstatus `Nonaktif` tidak tampil di `GET /products`, detail publik, related, maupun hitungan kategori publik.

### Produk

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/products` | Daftar produk + stok, status, seller, kategori, varian; filter `search`/`q`, `category`, `status`; pagination |
| `POST` | `/admin/products` | Buat produk + varian; slug dibuat dari nama dan dibuat unik |
| `PATCH` | `/admin/products/:id` | Ubah data produk/varian |
| `DELETE` | `/admin/products/:id` | Hapus produk; 409 jika sudah punya riwayat pesanan |
| `POST` | `/admin/products/:id/image` | Upload gambar (multipart field `image`, maks 5 MB, JPEG/PNG/WebP) |

Respons daftar menyertakan `summary` dari seluruh produk: `total`, `active`, `inactive`, `lowStock` (total stok ≤ 5), dan `new` (dibuat ≤ 30 hari). Contoh body create:

```json
{
  "name": "Lampu Belajar LED",
  "description": "Lampu belajar hemat energi",
  "price": 99000,
  "tag": "Lampu",
  "weight": 1000,
  "categoryId": 1,
  "sellerId": 1,
  "featured": true,
  "status": "Aktif",
  "variants": [
    { "size": "S", "stock": 3, "priceAdjustment": 0 },
    { "size": "M", "stock": 2, "priceAdjustment": 5000 }
  ]
}
```

- `tag` opsional (default `Umum`).
- `weight` dalam gram, opsional (default `1000`); dipakai untuk tarif Biteship dan snapshot item pesanan.
- Jika `variants` tidak dikirim, `stock` dipakai untuk membuat satu varian `All Size`.
- Pada PATCH, varian dengan `id` di-update, varian tanpa `id` dibuat baru; varian yang tidak dikirim tetap ada. `stock` hanya boleh dipakai jika produk punya 0/1 varian.
- `image` di respons berupa path publik (`/uploads/products/...`) dan dapat juga diisi langsung lewat URL/path pada create/update.

### Kategori

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/categories` | Kategori + `description` + `productCount` |
| `POST` | `/admin/categories` | Body `{ name, description? }`; slug dibuat dari nama |
| `PATCH` | `/admin/categories/:id` | Ubah nama/deskripsi; slug ikut diperbarui bila nama berubah |
| `DELETE` | `/admin/categories/:id` | 409 jika masih dipakai produk |

### Penjual

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/sellers` | Penjual + `productCount` + ringkasan `total`/`guru`/`siswa`/`karyawan`; filter `search`/`q`, `role`; pagination |
| `POST` | `/admin/sellers` | Body `{ name, role, business?, type?, kk?, address?, whatsapp? }` |
| `PATCH` | `/admin/sellers/:id` | Ubah data penjual |

Nomor KK/NIK disimpan apa adanya dan hanya dapat diakses lewat endpoint admin; masking tampilan dilakukan frontend. Belum ada endpoint hapus penjual.

## Admin — Pesanan & Retur

Semua endpoint butuh admin (`requireAdmin`).

### Pesanan

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/orders` | Semua pesanan; filter `paymentStatus`, `orderStatus`; cari `search`/`q` (ID/nama/email pembeli); pagination + ringkasan per status |
| `GET` | `/admin/orders/:id` | Detail pembeli, pembayaran, item, ringkasan biaya, status, hasil verifikasi |
| `POST` | `/admin/orders/:id/verify` | Body `{ decision: "approve" \| "reject", reason? }`; `reason` wajib saat reject |

Verifikasi hanya untuk order `Menunggu Verifikasi`, sudah `paid`, dan belum diverifikasi; selain itu 422.

- **Approve** → order `Diproses`, `verifiedAt` dan keputusan disimpan; shipment tetap dibuat terpisah.
- **Reject** → order `Dibatalkan`, `paymentStatus` menjadi `refunded`, stok varian dikembalikan, alasan tersimpan di `verificationReason` dan terlihat pembeli di detail pesanan.
- Ringkasan daftar memakai `summary.byStatus` berisi jumlah semua status (termasuk `Dibatalkan` dan `Menunggu Verifikasi`).

### Retur

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/returns` | Semua retur; filter `status`, cari pembeli/ID pesanan/produk/alasan; pagination + ringkasan per status |
| `GET` | `/admin/returns/:id` | Detail pembeli, order, item, alasan, foto, metode refund |
| `POST` | `/admin/returns/:id/approve` | Body `{ refundMethod, adminNote? }`; set status `Disetujui` |
| `POST` | `/admin/returns/:id/reject` | Body `{ adminNote }` wajib; set status `Ditolak` |

- Status retur: `Menunggu Keputusan`, `Disetujui`, `Ditolak`.
- Approve mengisi `decisionAt`/`refundMethod`/`adminNote` dan mengubah order terkait menjadi `Selesai` (pilihan yang ditetapkan; refund uang nyata menyusul).
- Reject mengisi `decisionAt`/`adminNote`; status order tidak diubah.
- Retur yang sudah diputuskan tidak bisa diputus lagi → 409.
- `GET /returns` milik pembeli otomatis menampilkan `decisionAt`, `refundMethod`, dan `adminNote`.

## Admin — Dashboard, User & Laporan

Semua endpoint butuh admin (`requireAdmin`).

### Dashboard

`GET /admin/dashboard/summary?startDate=&endDate=` — angka dari tabel nyata:

- `totalProducts`: seluruh produk.
- `totalOrders`: seluruh pesanan.
- `totalUsers`: seluruh user.
- `totalTransactions`: pesanan dengan `paymentStatus=paid` (semua waktu).
- `grossRevenue`: total `orders.total` pesanan lunas pada periode.
- `totalRefunds`: nilai item retur berstatus `Disetujui` dengan `decisionAt` pada periode.
- `totalRevenue`: `grossRevenue - totalRefunds`.
- `recentOrders`: 5 pesanan terbaru + produk pertama/jumlah item.

Periode default = bulan berjalan, timezone `Asia/Jakarta`; filter memakai format `YYYY-MM-DD` dan dihitung dari `orders.createdAt` (bukan `paidAt`). Respons menyertakan `period`.

### User

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/users` | Daftar user; cari nama/email, filter `role`/`status`, pagination |
| `GET` | `/admin/users/:id` | Profil + ringkasan aktivitas + 5 pesanan terbaru |

Ringkasan aktivitas: `totalOrders`, `completedOrders` (`Selesai`), `processingOrders` (semua status non-final selain `Selesai`/`Dibatalkan`), `cancelledOrders`, dan `totalSpent` (pesanan `paid`).

### Laporan penjualan

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/admin/reports/sales?startDate=&endDate=&sellerId=` | Agregat semua penjual; filter tanggal wajib didukung, `sellerId` opsional |
| `GET` | `/admin/reports/sales/:sellerId?startDate=&endDate=` | Breakdown produk per penjual |

- Hanya order `paid` yang dihitung; order `Dibatalkan`/belum bayar/`refunded` tidak masuk.
- `total` memakai subtotal item (bukan ongkir); `refund` = nilai item retur disetujui; `net = total - refund`; `orderCount` = jumlah order unik.
- `startDate`/`endDate` format `YYYY-MM-DD`, timezone `Asia/Jakarta`, default bulan berjalan. `startDate > endDate` → 422.
- Daftar menyertakan semua penjual (nilai 0 bila tidak ada penjualan) beserta `totals`; detail berisi `seller`, `period`, `products[]`, dan `totals`.
- Ekspor CSV tetap dibuat di frontend, tidak ada endpoint ekspor.

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
| `npm run db:migrate` | Menjalankan migrasi (memakai `DATABASE_URL_DIRECT` bila ada) |
| `npm run db:push` | Sinkronisasi schema langsung ke database |
| `npm run db:seed` | Mengisi akun dan katalog development |
| `npm run db:studio` | Membuka Drizzle Studio |

## Catatan

- Tabel `users` dan `sessions` dipakai untuk autentikasi. Fitur e-commerce lainnya akan dikembangkan pada issue terpisah.
- File `.env` tidak boleh di-commit. Gunakan `.env.example` sebagai referensi konfigurasi.
