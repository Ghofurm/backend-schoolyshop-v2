# Strategi Branch

Repositori memakai dua branch utama:

| Branch | Peran | Lingkungan |
| --- | --- | --- |
| `main` | Kode stabil yang sudah terverifikasi | Production |
| `develop` | Integrasi dan pengujian perubahan | Development/testing |

Fitur dan perbaikan tidak dikerjakan langsung di `main` atau `develop`. Buat
branch terpisah, lalu merge lewat pull request.

## Alur kerja

```text
feat/...  fix/...  chore/...  docs/...
        \      |       |        /
         \     |       |       /
          →  develop  →  main
             (test)     (production)
```

1. Buat branch dari `develop`:
   ```bash
   git switch develop
   git pull
   git switch -c feat/nama-fitur
   ```
2. Commit dan push branch fitur, lalu buka pull request ke `develop`.
3. Verifikasi di lingkungan development/testing. Setelah lolos, merge ke
   `develop`.
4. Untuk rilis, buka pull request dari `develop` ke `main`. Merge hanya setelah
   perubahan terverifikasi.
5. Setelah rilis, `develop` tetap menjadi target pekerjaan berikutnya.

Jangan commit langsung ke `main` atau `develop`. Kedua branch dilindungi:
perubahan wajib lewat pull request, force push dan penghapusan branch diblokir.

## Penamaan branch

- `feat/...` — fitur baru
- `fix/...` — perbaikan bug
- `chore/...` — dependency, konfigurasi, tooling
- `docs/...` — dokumentasi
- `refactor/...` — refactor tanpa perubahan perilaku

Gunakan nama singkat dan deskriptif, misalnya `feat/checkout-va` atau
`fix/status-pesanan`.

## Aturan merge

- Perubahan masuk ke `develop` lewat PR.
- `main` hanya menerima PR dari `develop` (promosi rilis).
- Review minimal satu orang disarankan bila ada reviewer lain. Konfigurasi saat
  ini tidak mewajibkan approval agar tim kecil tetap bisa bergerak; naikkan
  `required_approving_review_count` di `.github/branch-protection.json` bila
  sudah ada dua maintainer aktif.
- Bila CI ditambahkan, tambahkan check `build` dan `lint` sebagai required
  status check. Saat ini repo belum memiliki workflow CI.
- Selesaikan semua diskusi review sebelum merge.

## Deployment

Saat ini repo belum memiliki layanan hosting/CI yang terhubung. Rencana
mapping:

| Branch | Environment |
| --- | --- |
| `develop` | Preview/testing |
| `main` | Production |

`TODO(infra):` hubungkan `develop` ke preview deployment dan `main` ke
production setelah layanan hosting tersedia. Jangan membuat layanan baru hanya
untuk memenuhi langkah ini.

## Checklist admin repo

Operasi berikut membutuhkan akses **admin** repositori:

```bash
# 1. Jadikan develop default branch untuk pull request baru.
gh api --method PATCH repos/Ghofurm/backend-schoolyshop-v2 \
  -f default_branch=develop

# 2. Lindungi main dan develop.
gh api --method PUT repos/Ghofurm/backend-schoolyshop-v2/branches/main/protection \
  --input .github/branch-protection.json
gh api --method PUT repos/Ghofurm/backend-schoolyshop-v2/branches/develop/protection \
  --input .github/branch-protection.json
```

`enforce_admins` diset `true` agar aturan juga berlaku untuk admin. Bila butuh
bypass darurat, ubah sementara lewat Settings → Branches, bukan dengan
menonaktifkan proteksi permanen.

> Catatan: repository private pada plan GitHub Free belum mendukung branch
> protection/rulesets. Perintah proteksi di atas akan menghasilkan `403`
> sampai repository dibuat public atau plan GitHub ditingkatkan. Sampai saat
> itu, aturan branch berlaku sebagai konvensi tim.

## Contoh alur

Branch `docs/41-branch-strategy` berisi dokumen ini dan di-merge ke `develop`
lewat pull request. Itu adalah contoh alur feature branch → `develop`.
