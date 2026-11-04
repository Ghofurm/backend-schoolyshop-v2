const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const ok = (description: string, schema: unknown, example?: unknown) => ({
  description,
  content: {
    'application/json': {
      schema,
      ...(example === undefined ? {} : { example }),
    },
  },
});

const err = (description: string, code: string, message: string, details: unknown = {}) => ({
  description,
  content: {
    'application/json': {
      schema: ref('ErrorResponse'),
      example: { code, message, details },
    },
  },
});

const body = (schema: string, example?: unknown, required = true) => ({
  required,
  content: {
    'application/json': {
      schema: ref(schema),
      ...(example === undefined ? {} : { example }),
    },
  },
});

const param = (name: string, where: 'path' | 'query' | 'header', schema: unknown, extra = {}) => ({
  name,
  in: where,
  ...(where === 'path' || where === 'header' ? { required: true } : {}),
  schema,
  ...extra,
});

const idParam = param('id', 'path', { type: 'integer' });
const productIdParam = param('productId', 'path', { type: 'integer' });
const slugParam = param('slug', 'path', { type: 'string' });
const sellerIdParam = param('sellerId', 'path', { type: 'integer' });
const pageParam = param('page', 'query', { type: 'integer', minimum: 1, default: 1 });
const perPageParam = param('perPage', 'query', {
  type: 'integer',
  minimum: 1,
  maximum: 50,
  default: 10,
});

const unauthorized = { $ref: '#/components/responses/Unauthorized' };
const forbidden = { $ref: '#/components/responses/Forbidden' };
const notFound = { $ref: '#/components/responses/NotFound' };
const conflict = { $ref: '#/components/responses/Conflict' };
const validation = { $ref: '#/components/responses/Validation' };
const serverError = { $ref: '#/components/responses/ServerError' };

const success = ok('OK', {
  type: 'object',
  properties: { success: { type: 'boolean', example: true } },
});

const publicSecurity = { security: [] };

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Schoolyshop Backend API',
    version: '1.0.0',
    description: [
      'Dokumentasi kontrak API Schoolyshop.',
      '',
      'Autentikasi memakai cookie `httpOnly` bernama `schoolyshop_session`. Untuk mencoba endpoint yang butuh login:',
      '1. Jalankan `POST /auth/login` dari halaman ini.',
      '2. Cookie sesi otomatis disimpan oleh browser (UI ini memakai origin yang sama).',
      '3. Endpoint lain otomatis mengirim cookie tersebut.',
      '',
      'UI ini hanya dokumentasi; tidak menampilkan secret/environment.',
    ].join('\n'),
  },
  servers: [{ url: '/' }],
  security: [{ cookieAuth: [] }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Addresses' },
    { name: 'Products' },
    { name: 'Categories' },
    { name: 'Cart' },
    { name: 'Shipping' },
    { name: 'Checkout' },
    { name: 'Orders' },
    { name: 'Payments' },
    { name: 'Returns' },
    { name: 'Reviews' },
    { name: 'Shipments' },
    { name: 'Webhooks' },
    { name: 'Admin Products' },
    { name: 'Admin Categories' },
    { name: 'Admin Sellers' },
    { name: 'Admin Orders' },
    { name: 'Admin Returns' },
    { name: 'Admin Shipments' },
    { name: 'Admin Users' },
    { name: 'Admin Dashboard' },
    { name: 'Admin Reports' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Cek status service dan database',
        ...publicSecurity,
        responses: {
          '200': ok('Service sehat', ref('Health'), {
            status: 'ok',
            environment: 'development',
            database: 'connected',
            uptime: 12.34,
            timestamp: '2026-01-01T00:00:00.000Z',
          }),
          '503': ok('Database terputus', ref('Health'), {
            status: 'degraded',
            environment: 'development',
            database: 'disconnected',
            uptime: 12.34,
            timestamp: '2026-01-01T00:00:00.000Z',
          }),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Daftar akun',
        ...publicSecurity,
        requestBody: body('RegisterRequest', {
          name: 'Nama Pengguna',
          email: 'user@example.com',
          password: 'Password123!',
        }),
        responses: {
          '201': ok('Akun dibuat', ref('UserProfile')),
          '409': err('Email sudah terdaftar', 'EMAIL_TAKEN', 'Email sudah terdaftar'),
          '422': validation,
          '500': serverError,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login dan set cookie sesi',
        ...publicSecurity,
        requestBody: body('LoginRequest', {
          email: 'user@example.com',
          password: 'Password123!',
          rememberMe: false,
        }),
        responses: {
          '200': {
            ...ok('Login berhasil', ref('UserProfile'), {
              id: 1,
              name: 'Nama Pengguna',
              email: 'user@example.com',
              phone: null,
              role: 'user',
              createdAt: '2026-01-01T00:00:00.000Z',
            }),
            headers: {
              'Set-Cookie': {
                description: 'Cookie sesi httpOnly',
                schema: { type: 'string' },
              },
            },
          },
          '401': err('Kredensial salah', 'INVALID_CREDENTIALS', 'Email atau kata sandi salah'),
          '403': err('Akun nonaktif', 'ACCOUNT_INACTIVE', 'Akun tidak aktif'),
          '422': validation,
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout dan hapus sesi',
        responses: {
          '204': { description: 'Sesi dihapus' },
          '401': unauthorized,
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Profil user yang login',
        responses: {
          '200': ok('Profil user', ref('UserProfile')),
          '401': unauthorized,
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Profil lengkap user',
        responses: { '200': ok('Profil user', ref('UserProfile')), '401': unauthorized },
      },
      patch: {
        tags: ['Users'],
        summary: 'Ubah nama/email/telepon',
        requestBody: body('UpdateProfileRequest', { name: 'Nama Baru', phone: '08123456789' }),
        responses: {
          '200': ok('Profil terbaru', ref('UserProfile')),
          '401': unauthorized,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/users/me/password': {
      patch: {
        tags: ['Users'],
        summary: 'Ubah kata sandi',
        requestBody: body('UpdatePasswordRequest', {
          currentPassword: 'PasswordLama123!',
          newPassword: 'PasswordBaru123!',
        }),
        responses: {
          '204': { description: 'Kata sandi diperbarui' },
          '401': unauthorized,
          '422': validation,
        },
      },
    },
    '/users/me/addresses': {
      get: {
        tags: ['Addresses'],
        summary: 'Daftar alamat user',
        responses: {
          '200': ok('Daftar alamat', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('Address') } },
          }),
          '401': unauthorized,
        },
      },
      post: {
        tags: ['Addresses'],
        summary: 'Tambah alamat',
        requestBody: body('AddressRequest', {
          label: 'Rumah',
          recipientName: 'Nama Penerima',
          phone: '08123456789',
          address: 'Jl. Mawar No. 1',
          areaId: '3273010',
          district: 'Bandung Wetan',
          city: 'Bandung',
          province: 'Jawa Barat',
          postalCode: '40115',
          isPrimary: true,
        }),
        responses: {
          '201': ok('Alamat dibuat', ref('Address')),
          '401': unauthorized,
          '422': validation,
        },
      },
    },
    '/users/me/addresses/{id}': {
      patch: {
        tags: ['Addresses'],
        summary: 'Ubah alamat',
        parameters: [idParam],
        requestBody: body('AddressUpdateRequest', { label: 'Kantor', isPrimary: true }, false),
        responses: {
          '200': ok('Alamat terbaru', ref('Address')),
          '401': unauthorized,
          '404': notFound,
          '422': validation,
        },
      },
      delete: {
        tags: ['Addresses'],
        summary: 'Hapus alamat',
        parameters: [idParam],
        responses: {
          '204': { description: 'Alamat dihapus' },
          '401': unauthorized,
          '404': notFound,
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'Daftar produk publik',
        ...publicSecurity,
        parameters: [
          param('q', 'query', { type: 'string' }, { description: 'Cari nama/kategori/seller' }),
          param('category', 'query', { type: 'string' }, { description: 'Slug atau nama kategori' }),
          param('minPrice', 'query', { type: 'integer', minimum: 0 }),
          param('maxPrice', 'query', { type: 'integer', minimum: 0 }),
          param('sort', 'query', { type: 'string', enum: ['relevan', 'termurah', 'termahal'] }),
          param('featured', 'query', { type: 'string', enum: ['true', 'false'] }),
          param('limit', 'query', { type: 'integer', minimum: 1, maximum: 50 }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok(
            'Daftar produk',
            {
              type: 'object',
              properties: {
                data: { type: 'array', items: ref('ProductSummary') },
                meta: ref('PaginationMeta'),
              },
            },
            {
              data: [],
              meta: { page: 1, perPage: 10, total: 24, totalPages: 3 },
            },
          ),
          '422': validation,
          '500': serverError,
        },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Products'],
        summary: 'Detail produk berdasarkan slug',
        ...publicSecurity,
        parameters: [slugParam],
        responses: {
          '200': ok('Detail produk', ref('ProductDetail')),
          '404': notFound,
        },
      },
    },
    '/products/{id}/related': {
      get: {
        tags: ['Products'],
        summary: 'Produk terkait',
        ...publicSecurity,
        parameters: [idParam, param('limit', 'query', { type: 'integer', minimum: 1, maximum: 20, default: 4 })],
        responses: {
          '200': ok('Produk terkait', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('ProductSummary') } },
          }),
          '404': notFound,
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Daftar kategori publik + jumlah produk aktif',
        ...publicSecurity,
        responses: {
          '200': ok('Daftar kategori', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('Category') } },
          }),
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Isi keranjang user',
        responses: {
          '200': ok('Keranjang', ref('Cart')),
          '401': unauthorized,
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Kosongkan keranjang',
        responses: { '204': { description: 'Keranjang dikosongkan' }, '401': unauthorized },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Tambah item ke keranjang',
        requestBody: body('CartAddRequest', { productId: 1, variantId: 1, qty: 2 }),
        responses: {
          '201': ok('Keranjang terbaru', ref('Cart')),
          '401': unauthorized,
          '404': notFound,
          '422': validation,
        },
      },
    },
    '/cart/items/{productId}': {
      patch: {
        tags: ['Cart'],
        summary: 'Ubah qty item keranjang',
        parameters: [productIdParam],
        requestBody: body('CartUpdateRequest', { qty: 3 }),
        responses: {
          '200': ok('Keranjang terbaru', ref('Cart')),
          '401': unauthorized,
          '404': notFound,
          '422': validation,
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Hapus item dari keranjang',
        parameters: [productIdParam],
        responses: { '204': { description: 'Item dihapus' }, '401': unauthorized },
      },
    },
    '/shipping/rates': {
      get: {
        tags: ['Shipping'],
        summary: 'Tarif pengiriman lokal atau Biteship',
        ...publicSecurity,
        parameters: [
          param('destinationAreaId', 'query', { type: 'string' }),
          param('weight', 'query', { type: 'integer', minimum: 1 }),
          param('courier', 'query', { type: 'string' }),
        ],
        responses: {
          '200': ok('Daftar tarif', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('ShippingRate') } },
          }),
          '502': err('Biteship tidak tersedia', 'SERVER', 'Layanan Biteship sedang tidak tersedia'),
        },
      },
    },
    '/shipping/areas': {
      get: {
        tags: ['Shipping'],
        summary: 'Cari area Biteship',
        ...publicSecurity,
        parameters: [param('q', 'query', { type: 'string' }, { required: true })],
        responses: {
          '200': ok('Hasil pencarian area', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('Area') },
              source: { type: 'string', enum: ['biteship', 'local'] },
            },
          }),
          '502': err('Biteship tidak tersedia', 'SERVER', 'Layanan Biteship sedang tidak tersedia'),
        },
      },
    },
    '/checkouts': {
      post: {
        tags: ['Checkout'],
        summary: 'Buat pesanan dari keranjang',
        requestBody: body('CheckoutRequest', {
          addressId: 1,
          shippingRateId: 1,
          paymentMethod: 'Virtual Account BCA',
        }),
        responses: {
          '201': ok('Order dibuat', {
            type: 'object',
            properties: { orderId: { type: 'integer', example: 1 } },
          }),
          '401': unauthorized,
          '404': notFound,
          '422': validation,
        },
      },
    },
    '/checkouts/{id}': {
      get: {
        tags: ['Checkout'],
        summary: 'Ringkasan checkout/order',
        parameters: [idParam],
        responses: {
          '200': ok('Order', ref('Order')),
          '401': unauthorized,
          '404': notFound,
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Riwayat pesanan user',
        parameters: [
          param('status', 'query', { type: 'string' }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok('Daftar pesanan', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('Order') },
              meta: ref('PaginationMeta'),
            },
          }),
          '401': unauthorized,
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Detail pesanan',
        parameters: [idParam],
        responses: {
          '200': ok('Detail pesanan', ref('Order')),
          '401': unauthorized,
          '404': notFound,
        },
      },
    },
    '/orders/{id}/receive': {
      post: {
        tags: ['Orders'],
        summary: 'Konfirmasi pesanan diterima',
        parameters: [idParam],
        responses: {
          '200': ok('Status pesanan terbaru', ref('Order')),
          '401': unauthorized,
          '404': notFound,
          '422': validation,
        },
      },
    },
    '/orders/{id}/invoice': {
      get: {
        tags: ['Orders'],
        summary: 'Invoice dari snapshot checkout',
        parameters: [idParam],
        responses: {
          '200': ok('Invoice', ref('Invoice')),
          '401': unauthorized,
          '404': notFound,
        },
      },
    },
    '/orders/{id}/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Kirim ulasan untuk item pesanan',
        parameters: [idParam],
        requestBody: body('CreateReviewsRequest', {
          reviews: [{ productId: 1, rating: 5, comment: 'Bahan bagus' }],
        }),
        responses: {
          '201': ok('Ulasan dibuat', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('Review') } },
          }),
          '401': unauthorized,
          '404': notFound,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/reviews': {
      get: {
        tags: ['Reviews'],
        summary: 'Riwayat ulasan user',
        parameters: [pageParam, perPageParam],
        responses: {
          '200': ok('Riwayat ulasan', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('Review') },
              meta: ref('PaginationMeta'),
            },
          }),
          '401': unauthorized,
        },
      },
    },
    '/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Buat pembayaran Midtrans/lokal',
        requestBody: body('CreatePaymentRequest', { orderId: 1, method: 'BCA' }),
        responses: {
          '201': ok('Pembayaran dibuat', ref('Payment')),
          '401': unauthorized,
          '404': notFound,
          '409': conflict,
          '422': validation,
          '502': err('Midtrans tidak tersedia', 'SERVER', 'Layanan Midtrans sedang tidak tersedia'),
        },
      },
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Status pembayaran',
        parameters: [idParam],
        responses: {
          '200': ok('Pembayaran', ref('Payment')),
          '401': unauthorized,
          '404': notFound,
        },
      },
    },
    '/payments/{id}/simulate': {
      post: {
        tags: ['Payments'],
        summary: 'Simulasi lunas (khusus development)',
        parameters: [idParam],
        responses: {
          '200': ok('Pembayaran lunas', ref('Payment')),
          '401': unauthorized,
          '404': notFound,
          '409': conflict,
        },
      },
    },
    '/returns': {
      get: {
        tags: ['Returns'],
        summary: 'Daftar retur user',
        responses: {
          '200': ok('Daftar retur', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('ReturnRequest') } },
          }),
          '401': unauthorized,
        },
      },
      post: {
        tags: ['Returns'],
        summary: 'Ajukan retur',
        requestBody: body('CreateReturnRequest', {
          orderId: 1,
          items: [{ productId: 1, qty: 1, reason: 'Ukuran tidak cocok' }],
        }),
        responses: {
          '201': ok('Retur dibuat', ref('ReturnRequest')),
          '401': unauthorized,
          '404': notFound,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/returns/{id}/photos': {
      post: {
        tags: ['Returns'],
        summary: 'Upload foto retur',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  photos: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': ok('Retur dengan foto', ref('ReturnRequest')),
          '401': unauthorized,
          '404': notFound,
          '422': validation,
        },
      },
    },
    '/shipments/track': {
      get: {
        tags: ['Shipments'],
        summary: 'Lacak pengiriman berdasarkan resi/ID pesanan',
        parameters: [param('q', 'query', { type: 'string' }, { required: true })],
        responses: {
          '200': ok('Hasil pelacakan', ref('Tracking')),
          '401': unauthorized,
          '404': notFound,
        },
      },
    },
    '/webhooks/biteship': {
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook status Biteship',
        ...publicSecurity,
        parameters: [
          param('x-biteship-webhook-secret', 'header', { type: 'string' }, { required: true }),
        ],
        requestBody: body('BiteshipWebhook', { event: 'order.status', order_id: 'biteship-id', status: 'delivered' }),
        responses: {
          '200': success,
          '401': unauthorized,
        },
      },
    },
    '/webhooks/midtrans': {
      post: {
        tags: ['Webhooks'],
        summary: 'Notifikasi pembayaran Midtrans',
        ...publicSecurity,
        requestBody: body('MidtransNotification', {
          order_id: 'SCH-1-123',
          status_code: '200',
          gross_amount: '135000.00',
          signature_key: 'sha512...',
          transaction_status: 'settlement',
        }),
        responses: {
          '200': success,
          '400': err('Nominal tidak sesuai', 'VALIDATION', 'Nominal pembayaran tidak sesuai'),
          '401': unauthorized,
        },
      },
    },
    '/admin/products': {
      get: {
        tags: ['Admin Products'],
        summary: 'Daftar produk admin',
        parameters: [
          param('search', 'query', { type: 'string' }),
          param('q', 'query', { type: 'string' }),
          param('category', 'query', { type: 'string' }),
          param('status', 'query', { type: 'string', enum: ['Aktif', 'Nonaktif'] }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok('Daftar produk admin', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('AdminProduct') },
              meta: ref('PaginationMeta'),
              summary: ref('AdminProductSummary'),
            },
          }),
          '401': unauthorized,
          '403': forbidden,
        },
      },
      post: {
        tags: ['Admin Products'],
        summary: 'Buat produk + varian',
        requestBody: body('AdminProductCreate', {
          name: 'Lampu Belajar LED',
          description: 'Lampu belajar hemat energi',
          price: 99000,
          tag: 'Lampu',
          weight: 1000,
          categoryId: 1,
          sellerId: 1,
          status: 'Aktif',
          variants: [{ size: 'S', stock: 3, priceAdjustment: 0 }],
        }),
        responses: {
          '201': ok('Produk dibuat', ref('AdminProduct')),
          '401': unauthorized,
          '403': forbidden,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/admin/products/{id}': {
      patch: {
        tags: ['Admin Products'],
        summary: 'Ubah produk/varian',
        parameters: [idParam],
        requestBody: body('AdminProductUpdate', { price: 89000, status: 'Nonaktif' }, false),
        responses: {
          '200': ok('Produk terbaru', ref('AdminProduct')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
          '422': validation,
        },
      },
      delete: {
        tags: ['Admin Products'],
        summary: 'Hapus produk',
        parameters: [idParam],
        responses: {
          '204': { description: 'Produk dihapus' },
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
        },
      },
    },
    '/admin/products/{id}/image': {
      post: {
        tags: ['Admin Products'],
        summary: 'Upload gambar produk',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { image: { type: 'string', format: 'binary' } },
                required: ['image'],
              },
            },
          },
        },
        responses: {
          '201': ok('Produk dengan gambar baru', ref('AdminProduct')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '422': validation,
        },
      },
    },
    '/admin/categories': {
      get: {
        tags: ['Admin Categories'],
        summary: 'Daftar kategori admin',
        responses: {
          '200': ok('Daftar kategori', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('AdminCategory') } },
          }),
          '401': unauthorized,
          '403': forbidden,
        },
      },
      post: {
        tags: ['Admin Categories'],
        summary: 'Buat kategori',
        requestBody: body('CategoryRequest', { name: 'Elektronik', description: 'Perangkat elektronik' }),
        responses: {
          '201': ok('Kategori dibuat', ref('AdminCategory')),
          '401': unauthorized,
          '403': forbidden,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/admin/categories/{id}': {
      patch: {
        tags: ['Admin Categories'],
        summary: 'Ubah kategori',
        parameters: [idParam],
        requestBody: body('CategoryUpdateRequest', { name: 'Elektronik Rumah', description: '...' }, false),
        responses: {
          '200': ok('Kategori terbaru', ref('AdminCategory')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
          '422': validation,
        },
      },
      delete: {
        tags: ['Admin Categories'],
        summary: 'Hapus kategori',
        parameters: [idParam],
        responses: {
          '204': { description: 'Kategori dihapus' },
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
        },
      },
    },
    '/admin/sellers': {
      get: {
        tags: ['Admin Sellers'],
        summary: 'Daftar penjual admin',
        parameters: [
          param('search', 'query', { type: 'string' }),
          param('q', 'query', { type: 'string' }),
          param('role', 'query', { type: 'string', enum: ['Guru', 'Siswa', 'Karyawan'] }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok('Daftar penjual', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('AdminSeller') },
              meta: ref('PaginationMeta'),
              summary: ref('AdminSellerSummary'),
            },
          }),
          '401': unauthorized,
          '403': forbidden,
        },
      },
      post: {
        tags: ['Admin Sellers'],
        summary: 'Buat penjual',
        requestBody: body('SellerCreate', {
          name: 'Pak Andi',
          role: 'Guru',
          business: 'Andi Craft',
          type: 'Guru (RPL)',
          kk: '3201045802901234',
          address: 'Ruang Guru',
          whatsapp: '081200000000',
        }),
        responses: {
          '201': ok('Penjual dibuat', ref('AdminSeller')),
          '401': unauthorized,
          '403': forbidden,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/admin/sellers/{id}': {
      patch: {
        tags: ['Admin Sellers'],
        summary: 'Ubah penjual',
        parameters: [idParam],
        requestBody: body('SellerUpdateRequest', { business: 'Andi Karya' }, false),
        responses: {
          '200': ok('Penjual terbaru', ref('AdminSeller')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['Admin Orders'],
        summary: 'Daftar semua pesanan',
        parameters: [
          param('search', 'query', { type: 'string' }),
          param('q', 'query', { type: 'string' }),
          param('paymentStatus', 'query', { type: 'string', enum: ['unpaid', 'pending', 'paid', 'expired', 'refunded'] }),
          param('orderStatus', 'query', { type: 'string', enum: ['Menunggu Pembayaran', 'Menunggu Verifikasi', 'Diproses', 'Dikirim', 'Dalam Pengembalian', 'Selesai', 'Dibatalkan'] }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok('Daftar pesanan admin', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('AdminOrderSummary') },
              meta: ref('PaginationMeta'),
              summary: ref('OrderStatusSummary'),
            },
          }),
          '401': unauthorized,
          '403': forbidden,
        },
      },
    },
    '/admin/orders/{id}': {
      get: {
        tags: ['Admin Orders'],
        summary: 'Detail pesanan admin',
        parameters: [idParam],
        responses: {
          '200': ok('Detail pesanan', ref('AdminOrderDetail')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
        },
      },
    },
    '/admin/orders/{id}/verify': {
      post: {
        tags: ['Admin Orders'],
        summary: 'Verifikasi pesanan lunas',
        parameters: [idParam],
        requestBody: body('VerifyOrderRequest', { decision: 'approve', reason: undefined }),
        responses: {
          '200': ok('Pesanan terverifikasi', ref('AdminOrderDetail')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '422': validation,
        },
      },
    },
    '/admin/returns': {
      get: {
        tags: ['Admin Returns'],
        summary: 'Daftar semua retur',
        parameters: [
          param('status', 'query', { type: 'string', enum: ['Menunggu Keputusan', 'Disetujui', 'Ditolak'] }),
          param('search', 'query', { type: 'string' }),
          param('q', 'query', { type: 'string' }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok('Daftar retur admin', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('AdminReturn') },
              meta: ref('PaginationMeta'),
              summary: ref('ReturnStatusSummary'),
            },
          }),
          '401': unauthorized,
          '403': forbidden,
        },
      },
    },
    '/admin/returns/{id}': {
      get: {
        tags: ['Admin Returns'],
        summary: 'Detail retur admin',
        parameters: [idParam],
        responses: {
          '200': ok('Detail retur', ref('AdminReturn')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
        },
      },
    },
    '/admin/returns/{id}/approve': {
      post: {
        tags: ['Admin Returns'],
        summary: 'Setujui retur',
        parameters: [idParam],
        requestBody: body('ApproveReturnRequest', {
          refundMethod: 'Transfer Bank BCA',
          adminNote: 'Disetujui admin',
        }),
        responses: {
          '200': ok('Retur disetujui', ref('AdminReturn')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/admin/returns/{id}/reject': {
      post: {
        tags: ['Admin Returns'],
        summary: 'Tolak retur',
        parameters: [idParam],
        requestBody: body('RejectReturnRequest', { adminNote: 'Barang tidak memenuhi syarat retur' }),
        responses: {
          '200': ok('Retur ditolak', ref('AdminReturn')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
          '422': validation,
        },
      },
    },
    '/admin/shipments': {
      get: {
        tags: ['Admin Shipments'],
        summary: 'Daftar pengiriman admin',
        parameters: [
          param('search', 'query', { type: 'string' }),
          param('q', 'query', { type: 'string' }),
          param('status', 'query', { type: 'string', enum: ['Siap Dikirim', 'Dikirim', 'Selesai'] }),
          param('courier', 'query', { type: 'string' }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok('Daftar pengiriman', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('AdminShipmentSummary') },
              meta: ref('PaginationMeta'),
            },
          }),
          '401': unauthorized,
          '403': forbidden,
        },
      },
      post: {
        tags: ['Admin Shipments'],
        summary: 'Buat pengiriman',
        requestBody: body('CreateShipmentRequest', { orderId: 1, shippingRateId: 1 }),
        responses: {
          '201': ok('Pengiriman dibuat', ref('AdminShipment')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '409': conflict,
          '422': validation,
          '502': err('Layanan pengiriman tidak tersedia', 'SERVER', 'Layanan Biteship sedang tidak tersedia'),
        },
      },
    },
    '/admin/shipments/{id}': {
      get: {
        tags: ['Admin Shipments'],
        summary: 'Detail pengiriman',
        parameters: [idParam],
        responses: {
          '200': ok('Detail pengiriman', ref('AdminShipment')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
        },
      },
    },
    '/admin/shipments/{id}/tracking': {
      get: {
        tags: ['Admin Shipments'],
        summary: 'Riwayat event pengiriman',
        parameters: [idParam],
        responses: {
          '200': ok('Riwayat pengiriman', {
            type: 'object',
            properties: { data: { type: 'array', items: ref('TrackingEvent') } },
          }),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin Users'],
        summary: 'Daftar user',
        parameters: [
          param('search', 'query', { type: 'string' }),
          param('q', 'query', { type: 'string' }),
          param('role', 'query', { type: 'string', enum: ['admin', 'user'] }),
          param('status', 'query', { type: 'string', enum: ['active', 'inactive'] }),
          pageParam,
          perPageParam,
        ],
        responses: {
          '200': ok('Daftar user', {
            type: 'object',
            properties: {
              data: { type: 'array', items: ref('AdminUser') },
              meta: ref('PaginationMeta'),
            },
          }),
          '401': unauthorized,
          '403': forbidden,
        },
      },
    },
    '/admin/users/{id}': {
      get: {
        tags: ['Admin Users'],
        summary: 'Detail user + aktivitas',
        parameters: [idParam],
        responses: {
          '200': ok('Detail user', ref('AdminUserDetail')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
        },
      },
    },
    '/admin/dashboard/summary': {
      get: {
        tags: ['Admin Dashboard'],
        summary: 'Ringkasan dashboard',
        parameters: [
          param('startDate', 'query', { type: 'string', description: 'YYYY-MM-DD' }),
          param('endDate', 'query', { type: 'string', description: 'YYYY-MM-DD' }),
        ],
        responses: {
          '200': ok('Ringkasan dashboard', ref('DashboardSummary')),
          '401': unauthorized,
          '403': forbidden,
          '422': validation,
        },
      },
    },
    '/admin/reports/sales': {
      get: {
        tags: ['Admin Reports'],
        summary: 'Laporan penjualan per penjual',
        parameters: [
          param('startDate', 'query', { type: 'string', description: 'YYYY-MM-DD' }),
          param('endDate', 'query', { type: 'string', description: 'YYYY-MM-DD' }),
          param('sellerId', 'query', { type: 'integer' }),
        ],
        responses: {
          '200': ok('Laporan penjualan', ref('SalesReport')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '422': validation,
        },
      },
    },
    '/admin/reports/sales/{sellerId}': {
      get: {
        tags: ['Admin Reports'],
        summary: 'Detail laporan per penjual',
        parameters: [
          sellerIdParam,
          param('startDate', 'query', { type: 'string', description: 'YYYY-MM-DD' }),
          param('endDate', 'query', { type: 'string', description: 'YYYY-MM-DD' }),
        ],
        responses: {
          '200': ok('Detail laporan penjualan', ref('SalesReportDetail')),
          '401': unauthorized,
          '403': forbidden,
          '404': notFound,
          '422': validation,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'schoolyshop_session',
        description: 'Cookie sesi httpOnly yang di-set oleh POST /auth/login',
      },
    },
    responses: {
      Unauthorized: err('Belum login / sesi tidak valid', 'UNAUTHENTICATED', 'Silakan login terlebih dahulu'),
      Forbidden: err('Akses ditolak', 'FORBIDDEN', 'Akses ditolak'),
      NotFound: err('Data tidak ditemukan', 'NOT_FOUND', 'Data tidak ditemukan'),
      Conflict: err('Konflik data', 'CONFLICT', 'Data sudah ada atau tidak dapat diproses'),
      Validation: err('Validasi gagal', 'VALIDATION', 'Data yang dikirim tidak valid', {
        fields: { email: 'Format email tidak valid' },
      }),
      ServerError: err('Kesalahan server', 'SERVER', 'Internal Server Error'),
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['code', 'message', 'details'],
        properties: {
          code: {
            type: 'string',
            enum: [
              'BAD_REQUEST',
              'UNAUTHENTICATED',
              'INVALID_CREDENTIALS',
              'FORBIDDEN',
              'ACCOUNT_INACTIVE',
              'NOT_FOUND',
              'CONFLICT',
              'EMAIL_TAKEN',
              'VALIDATION',
              'SERVER',
            ],
          },
          message: { type: 'string' },
          details: { type: 'object', additionalProperties: true },
        },
      },
      PaginationMeta: {
        type: 'object',
        required: ['page', 'perPage', 'total', 'totalPages'],
        properties: {
          page: { type: 'integer', example: 1 },
          perPage: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 24 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          environment: { type: 'string' },
          database: { type: 'string', enum: ['connected', 'disconnected'] },
          uptime: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['admin', 'user'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', maxLength: 120 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          rememberMe: { type: 'boolean', default: false },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
        },
      },
      UpdatePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      Address: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          label: { type: 'string' },
          recipientName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string', nullable: true },
          areaId: { type: 'string' },
          district: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postalCode: { type: 'string' },
          note: { type: 'string', nullable: true },
          isPrimary: { type: 'boolean' },
        },
      },
      AddressRequest: {
        type: 'object',
        required: ['label', 'recipientName', 'phone', 'areaId', 'district', 'city', 'province', 'postalCode'],
        properties: {
          label: { type: 'string' },
          recipientName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          areaId: { type: 'string' },
          district: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postalCode: { type: 'string' },
          note: { type: 'string' },
          isPrimary: { type: 'boolean' },
        },
      },
      AddressUpdateRequest: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          recipientName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          areaId: { type: 'string' },
          district: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postalCode: { type: 'string' },
          note: { type: 'string' },
          isPrimary: { type: 'boolean' },
        },
      },
      Seller: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          label: { type: 'string' },
          role: { type: 'string', enum: ['Guru', 'Siswa', 'Karyawan'] },
        },
      },
      Variant: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          sku: { type: 'string' },
          size: { type: 'string' },
          stock: { type: 'integer' },
          priceAdjustment: { type: 'integer' },
        },
      },
      ProductSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          slug: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'integer' },
          tag: { type: 'string' },
          image: { type: 'string', nullable: true },
          featured: { type: 'boolean' },
          weight: { type: 'integer' },
          category: { type: 'string' },
          categorySlug: { type: 'string' },
          seller: ref('Seller'),
          stock: { type: 'integer' },
        },
      },
      ProductDetail: {
        allOf: [
          ref('ProductSummary'),
          {
            type: 'object',
            properties: { variants: { type: 'array', items: ref('Variant') } },
          },
        ],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          slug: { type: 'string' },
          productCount: { type: 'integer' },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          productId: { type: 'integer' },
          variantId: { type: 'integer', nullable: true },
          qty: { type: 'integer' },
          unitPrice: { type: 'integer' },
          subtotal: { type: 'integer' },
          product: ref('ProductSummary'),
          variant: ref('Variant'),
        },
      },
      Cart: {
        type: 'object',
        properties: {
          data: { type: 'array', items: ref('CartItem') },
          total: { type: 'integer' },
          itemCount: { type: 'integer' },
        },
      },
      CartAddRequest: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'integer' },
          variantId: { type: 'integer' },
          qty: { type: 'integer', minimum: 1, default: 1 },
        },
      },
      CartUpdateRequest: {
        type: 'object',
        required: ['qty'],
        properties: { qty: { type: 'integer', minimum: 1 } },
      },
      ShippingRate: {
        type: 'object',
        properties: {
          id: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
          code: { type: 'string' },
          courier: { type: 'string' },
          service: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'integer' },
          eta: { type: 'string' },
          badge: { type: 'string', nullable: true },
        },
      },
      Area: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          province: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          district: { type: 'string', nullable: true },
          postalCode: { type: 'string', nullable: true },
        },
      },
      CheckoutRequest: {
        type: 'object',
        required: ['addressId', 'shippingRateId'],
        properties: {
          addressId: { type: 'integer' },
          shippingRateId: {
            oneOf: [{ type: 'integer' }, { type: 'string' }],
            description: 'ID tarif lokal (angka) atau kode tarif Biteship (string)',
          },
          paymentMethod: { type: 'string' },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          productId: { type: 'integer', nullable: true },
          productSlug: { type: 'string' },
          productName: { type: 'string' },
          productImage: { type: 'string', nullable: true },
          variantId: { type: 'integer', nullable: true },
          variantSku: { type: 'string', nullable: true },
          variantSize: { type: 'string', nullable: true },
          seller: ref('Seller'),
          unitPrice: { type: 'integer' },
          priceAdjustment: { type: 'integer' },
          qty: { type: 'integer' },
          subtotal: { type: 'integer' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          status: { type: 'string' },
          paymentStatus: { type: 'string' },
          paymentMethod: { type: 'string', nullable: true },
          subtotal: { type: 'integer' },
          shippingCost: { type: 'integer' },
          total: { type: 'integer' },
          buyer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
            },
          },
          shipping: { type: 'object', additionalProperties: true },
          courier: { type: 'object', additionalProperties: true },
          items: { type: 'array', items: ref('OrderItem') },
          sellers: { type: 'array', items: ref('Seller') },
          verifiedAt: { type: 'string', format: 'date-time', nullable: true },
          verificationDecision: { type: 'string', nullable: true },
          verificationReason: { type: 'string', nullable: true },
          expiresAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Invoice: {
        type: 'object',
        additionalProperties: true,
        example: {
          orderId: 1,
          invoiceNumber: 'INV-000001',
          customerName: 'Nama Pengguna',
          shippingAddress: 'Jl. Mawar No. 1, Bandung',
          total: 135000,
          paymentMethod: 'Virtual Account BCA',
          virtualAccountNumber: '12345678901',
          status: 'Menunggu Verifikasi',
        },
      },
      Payment: {
        type: 'object',
        properties: {
          paymentId: { type: 'integer' },
          orderId: { type: 'integer' },
          provider: { type: 'string', enum: ['local', 'midtrans'] },
          method: { type: 'string' },
          methodLabel: { type: 'string' },
          vaNumber: { type: 'string' },
          billerCode: { type: 'string', nullable: true },
          amount: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['unpaid', 'pending', 'paid', 'expired', 'refunded'] },
          paidAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePaymentRequest: {
        type: 'object',
        required: ['orderId', 'method'],
        properties: {
          orderId: { type: 'integer' },
          method: { type: 'string', example: 'BCA' },
        },
      },
      ReturnItem: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          orderItemId: { type: 'integer', nullable: true },
          productId: { type: 'integer', nullable: true },
          productName: { type: 'string' },
          variantId: { type: 'integer', nullable: true },
          variantSize: { type: 'string', nullable: true },
          qty: { type: 'integer' },
          reason: { type: 'string' },
        },
      },
      ReturnPhoto: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          url: { type: 'string' },
          originalName: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'integer' },
        },
      },
      ReturnRequest: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          orderId: { type: 'integer' },
          status: { type: 'string', enum: ['Menunggu Keputusan', 'Disetujui', 'Ditolak'] },
          decisionAt: { type: 'string', format: 'date-time', nullable: true },
          refundMethod: { type: 'string', nullable: true },
          adminNote: { type: 'string', nullable: true },
          submittedAt: { type: 'string', format: 'date-time' },
          items: { type: 'array', items: ref('ReturnItem') },
          photos: { type: 'array', items: ref('ReturnPhoto') },
        },
      },
      CreateReturnRequest: {
        type: 'object',
        required: ['orderId', 'items'],
        properties: {
          orderId: { type: 'integer' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                orderItemId: { type: 'integer' },
                productId: { type: 'integer' },
                qty: { type: 'integer', minimum: 1 },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          orderId: { type: 'integer' },
          orderItemId: { type: 'integer', nullable: true },
          productId: { type: 'integer', nullable: true },
          productName: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          submittedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateReviewsRequest: {
        type: 'object',
        properties: {
          reviews: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'rating'],
              properties: {
                productId: { type: 'integer' },
                rating: { type: 'integer', minimum: 1, maximum: 5 },
                comment: { type: 'string', maxLength: 1000 },
              },
            },
          },
        },
      },
      TrackingEvent: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          status: { type: 'string' },
          location: { type: 'string' },
          description: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
        },
      },
      Tracking: {
        type: 'object',
        properties: {
          orderId: { type: 'integer' },
          orderStatus: { type: 'string' },
          courier: { type: 'string' },
          service: { type: 'string' },
          trackingNumber: { type: 'string' },
          status: { type: 'string' },
          recipientName: { type: 'string' },
          shippingAddress: { type: 'string' },
          history: { type: 'array', items: ref('TrackingEvent') },
        },
      },
      AdminProduct: {
        allOf: [
          ref('ProductSummary'),
          {
            type: 'object',
            properties: {
              categoryId: { type: 'integer' },
              categoryName: { type: 'string' },
              sellerId: { type: 'integer' },
              sellerName: { type: 'string' },
              sellerRole: { type: 'string' },
              status: { type: 'string', enum: ['Aktif', 'Nonaktif'] },
              isNew: { type: 'boolean' },
              variants: { type: 'array', items: ref('Variant') },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      AdminProductSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          active: { type: 'integer' },
          inactive: { type: 'integer' },
          lowStock: { type: 'integer' },
          new: { type: 'integer' },
        },
      },
      AdminProductCreate: {
        type: 'object',
        required: ['name', 'description', 'price', 'categoryId', 'sellerId'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'integer', minimum: 1 },
          tag: { type: 'string' },
          weight: { type: 'integer', minimum: 1, default: 1000 },
          categoryId: { type: 'integer' },
          sellerId: { type: 'integer' },
          image: { type: 'string' },
          featured: { type: 'boolean' },
          status: { type: 'string', enum: ['Aktif', 'Nonaktif'] },
          stock: { type: 'integer', minimum: 0 },
          variants: { type: 'array', items: ref('Variant') },
        },
      },
      AdminProductUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'integer' },
          tag: { type: 'string' },
          weight: { type: 'integer' },
          categoryId: { type: 'integer' },
          sellerId: { type: 'integer' },
          image: { type: 'string', nullable: true },
          featured: { type: 'boolean' },
          status: { type: 'string', enum: ['Aktif', 'Nonaktif'] },
          stock: { type: 'integer' },
          variants: { type: 'array', items: ref('Variant') },
        },
      },
      AdminCategory: {
        allOf: [
          ref('Category'),
          {
            type: 'object',
            properties: { description: { type: 'string' } },
          },
        ],
      },
      CategoryRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string', maxLength: 250 },
        },
      },
      CategoryUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', maxLength: 250 },
        },
      },
      AdminSeller: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['Guru', 'Siswa', 'Karyawan'] },
          business: { type: 'string', nullable: true },
          type: { type: 'string', nullable: true },
          kk: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          whatsapp: { type: 'string', nullable: true },
          productCount: { type: 'integer' },
        },
      },
      AdminSellerSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          guru: { type: 'integer' },
          siswa: { type: 'integer' },
          karyawan: { type: 'integer' },
        },
      },
      SellerCreate: {
        type: 'object',
        required: ['name', 'role'],
        properties: {
          name: { type: 'string' },
          role: { type: 'string', enum: ['Guru', 'Siswa', 'Karyawan'] },
          business: { type: 'string' },
          type: { type: 'string' },
          kk: { type: 'string' },
          address: { type: 'string' },
          whatsapp: { type: 'string' },
        },
      },
      SellerUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string', enum: ['Guru', 'Siswa', 'Karyawan'] },
          business: { type: 'string' },
          type: { type: 'string' },
          kk: { type: 'string' },
          address: { type: 'string' },
          whatsapp: { type: 'string' },
        },
      },
      AdminOrderSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          status: { type: 'string' },
          orderStatus: { type: 'string' },
          paymentStatus: { type: 'string' },
          paymentMethod: { type: 'string', nullable: true },
          buyer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
            },
          },
          total: { type: 'integer' },
          itemCount: { type: 'integer' },
          productName: { type: 'string', nullable: true },
          verifiedAt: { type: 'string', format: 'date-time', nullable: true },
          verificationDecision: { type: 'string', nullable: true },
          verificationReason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderStatusSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
        },
      },
      AdminOrderDetail: {
        allOf: [
          ref('Order'),
          {
            type: 'object',
            properties: {
              orderStatus: { type: 'string' },
              summary: {
                type: 'object',
                properties: {
                  subtotal: { type: 'integer' },
                  shippingCost: { type: 'integer' },
                  total: { type: 'integer' },
                },
              },
              payment: {
                type: 'object',
                nullable: true,
                additionalProperties: true,
              },
            },
          },
        ],
      },
      VerifyOrderRequest: {
        type: 'object',
        required: ['decision'],
        properties: {
          decision: { type: 'string', enum: ['approve', 'reject'] },
          reason: { type: 'string', maxLength: 500, description: 'Wajib untuk reject' },
        },
      },
      AdminReturn: {
        allOf: [
          ref('ReturnRequest'),
          {
            type: 'object',
            properties: {
              buyer: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
              order: { type: 'object', additionalProperties: true },
            },
          },
        ],
      },
      ReturnStatusSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
        },
      },
      ApproveReturnRequest: {
        type: 'object',
        required: ['refundMethod'],
        properties: {
          refundMethod: { type: 'string' },
          adminNote: { type: 'string', maxLength: 500 },
        },
      },
      RejectReturnRequest: {
        type: 'object',
        required: ['adminNote'],
        properties: { adminNote: { type: 'string', maxLength: 500 } },
      },
      AdminShipmentSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer', nullable: true },
          orderId: { type: 'integer' },
          customerName: { type: 'string' },
          recipientName: { type: 'string' },
          productName: { type: 'string', nullable: true },
          itemCount: { type: 'integer' },
          total: { type: 'integer' },
          courier: { type: 'string', nullable: true },
          service: { type: 'string', nullable: true },
          trackingNumber: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['Siap Dikirim', 'Dikirim', 'Selesai'] },
          orderStatus: { type: 'string' },
          shippedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AdminShipment: {
        type: 'object',
        additionalProperties: true,
        properties: {
          id: { type: 'integer' },
          orderId: { type: 'integer' },
          status: { type: 'string', enum: ['Dikirim', 'Selesai'] },
          provider: { type: 'string', enum: ['local', 'biteship'] },
          biteshipOrderId: { type: 'string', nullable: true },
          biteshipTrackingId: { type: 'string', nullable: true },
          labelUrl: { type: 'string', nullable: true },
          trackingNumber: { type: 'string' },
          courier: { type: 'string' },
          service: { type: 'string' },
          recipientName: { type: 'string' },
          address: { type: 'string' },
          total: { type: 'integer' },
          items: { type: 'array', items: ref('OrderItem') },
        },
      },
      CreateShipmentRequest: {
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'integer' },
          shippingRateId: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
          courier: { type: 'string' },
          service: { type: 'string' },
        },
      },
      AdminUser: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['admin', 'user'] },
          roleLabel: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive'] },
          statusLabel: { type: 'string' },
          joinedAt: { type: 'string', format: 'date-time' },
          totalOrders: { type: 'integer' },
          completedOrders: { type: 'integer' },
          processingOrders: { type: 'integer' },
          cancelledOrders: { type: 'integer' },
          totalSpent: { type: 'integer' },
        },
      },
      AdminUserDetail: {
        allOf: [
          ref('AdminUser'),
          {
            type: 'object',
            properties: {
              recentOrders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    status: { type: 'string' },
                    paymentStatus: { type: 'string' },
                    total: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        ],
      },
      DashboardSummary: {
        type: 'object',
        properties: {
          period: { type: 'object', additionalProperties: true },
          totalProducts: { type: 'integer' },
          totalOrders: { type: 'integer' },
          totalUsers: { type: 'integer' },
          totalTransactions: { type: 'integer' },
          grossRevenue: { type: 'integer' },
          totalRefunds: { type: 'integer' },
          totalRevenue: { type: 'integer' },
          recentOrders: { type: 'array', items: ref('AdminOrderSummary') },
        },
      },
      SalesReportRow: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          business: { type: 'string', nullable: true },
          type: { type: 'string', nullable: true },
          role: { type: 'string' },
          roleTone: { type: 'string' },
          initials: { type: 'string' },
          sold: { type: 'integer' },
          total: { type: 'integer' },
          refund: { type: 'integer' },
          net: { type: 'integer' },
          orderCount: { type: 'integer' },
          lastSaleAt: { type: 'string', nullable: true },
          date: { type: 'string', nullable: true },
        },
      },
      SalesReport: {
        type: 'object',
        properties: {
          data: { type: 'array', items: ref('SalesReportRow') },
          period: { type: 'object', additionalProperties: true },
          totals: ref('SalesTotals'),
        },
      },
      SalesTotals: {
        type: 'object',
        properties: {
          sold: { type: 'integer' },
          total: { type: 'integer' },
          refund: { type: 'integer' },
          net: { type: 'integer' },
          orderCount: { type: 'integer' },
        },
      },
      SalesReportDetail: {
        type: 'object',
        properties: {
          seller: ref('SalesReportRow'),
          period: { type: 'object', additionalProperties: true },
          products: { type: 'array', items: ref('SalesProductRow') },
          totals: ref('SalesTotals'),
        },
      },
      SalesProductRow: {
        type: 'object',
        properties: {
          productId: { type: 'integer', nullable: true },
          productName: { type: 'string' },
          sku: { type: 'string', nullable: true },
          sold: { type: 'integer' },
          total: { type: 'integer' },
          refund: { type: 'integer' },
          net: { type: 'integer' },
          unitPrice: { type: 'integer' },
          status: { type: 'string' },
          lastSaleAt: { type: 'string', nullable: true },
          date: { type: 'string', nullable: true },
        },
      },
      BiteshipWebhook: {
        type: 'object',
        additionalProperties: true,
        properties: {
          event: { type: 'string' },
          order_id: { type: 'string' },
          status: { type: 'string' },
          courier_waybill_id: { type: 'string' },
          courier_tracking_id: { type: 'string' },
        },
      },
      MidtransNotification: {
        type: 'object',
        additionalProperties: true,
        properties: {
          order_id: { type: 'string' },
          status_code: { type: 'string' },
          gross_amount: { type: 'string' },
          signature_key: { type: 'string' },
          transaction_status: { type: 'string' },
          fraud_status: { type: 'string' },
          transaction_id: { type: 'string' },
          payment_type: { type: 'string' },
        },
      },
    },
  },
};

export type OpenApiDocument = typeof openapiDocument;
