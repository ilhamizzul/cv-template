# Glowfolio CV Template

Template web CV untuk klien [Glowfolio](https://glowfolio.github.io/). Isi web diambil dari satu file, `data/cv.json`. Setiap kali file itu berubah, GitHub Actions memeriksa datanya, membangun halaman, lalu memasangnya ke GitHub Pages.

Contoh isi bawaan adalah **Nadia Putri Lestari**, klien fiktif.

## Isi repo

```
data/cv.json        ← satu-satunya file yang diganti per klien
public/             ← file pendukung: foto, cv.pdf (opsional)
figures/            ← ilustrasi iso-glow, dipilih lewat brand.illustration.symbol
schema/             ← skema data (sama dengan glowfolio-data)
src/                ← generator, tampilan, dan skrip
tests/              ← tes generator (memakai tests/fixtures, bukan data klien)
.github/workflows/  ← periksa → bangun → pasang ke GitHub Pages
```

## Alur per klien

1. Klien membuat repo dari template ini di akunnya sendiri (**Use this template › Create a new repository**).
   - Nama repo `namaklien.github.io` → web di `https://namaklien.github.io/`
   - Nama repo lain, misalnya `cv` → web di `https://namaklien.github.io/cv/`
2. Klien membuka **Settings › Pages** dan memilih **Source: GitHub Actions**. Langkah ini hanya sekali dan tidak bisa diwakilkan workflow.
3. Klien mengundang akun Glowfolio sebagai kolaborator (**Settings › Collaborators**).
4. Glowfolio mengganti `data/cv.json` dengan data klien, lalu commit ke `main`. Web terpasang dalam 1–2 menit.

Alamat web dan QR code dihitung otomatis dari nama repo, jadi tidak ada yang perlu diatur. Kalau klien memakai domain sendiri, isi `outputs.web.customDomain`.

## Mengatur tampilan dari data

| Di `cv.json` | Pengaruhnya |
|---|---|
| `meta.locales` | Bahasa pertama tampil di `/`, bahasa kedua di `/en/`. Hanya satu bahasa = tanpa tombol ganti bahasa |
| `brand.palette` | `primary` untuk judul dan tautan, `accent` untuk cahaya ilustrasi dan penanda, `ink` warna teks, `ground` warna latar |
| `brand.font` | `geometric`, `humanist`, `serif`, atau `mono` |
| `brand.illustration.symbol` | Nama file di `figures/` tanpa `.svg`. Kalau belum ada, dipakai `default.svg` |
| `brand.illustration.mode` | `static` diam; `interactive` cahayanya berdenyut saat disentuh atau di-hover |
| `outputs.web.sections` | Urutan dan pilihan bagian: `hero`, `highlights`, `experience`, `projects`, `case-studies`, `skills`, `education`, `contact` |
| `outputs.web.mode` | `single` satu halaman; `multi` membuat halaman sendiri untuk tiap proyek yang punya `caseStudy` |
| `outputs.web.qr` | `false` untuk menyembunyikan QR code |
| `achievements[].highlight` | Tampil di bagian Sorotan |
| `metrics[].verified` | Hanya angka yang sudah dikonfirmasi klien (`true`) yang tampil |
| `confidential: true` | Bullet pengalaman atau tautan proyek disembunyikan dari web |

## Privasi

Repo GitHub Pages di akun gratis bersifat **publik**: siapa pun bisa membaca `data/cv.json`. Karena itu langkah **Periksa data** menggagalkan build kalau menemukan:

- kunci seperti `email`, `phone`, `whatsapp`, `address`, `nik`;
- alamat email, nomor HP Indonesia, atau tautan `wa.me` di teks mana pun;
- placeholder yang belum diisi, seperti `[ISI ...]`.

Data kontak lengkap hanya ada di PDF yang dikirim langsung ke klien. Kalau mau menaruh tombol **Unduh CV** di web, simpan `public/cv.pdf` versi **tanpa** nomor HP, email, dan alamat.

## Foto

Simpan di `public/`, misalnya `public/foto.jpg`, lalu isi `profile.photo: "foto.jpg"`. Ukuran persegi minimal 192×192 px.

## Menjalankan di komputer

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run check      # periksa data/cv.json
npm run build      # hasil di dist/
npm run preview    # buka http://localhost:4173/
npm test           # tes generator
```

## Belum didukung

- Form kontak (`profile.contactForm`): bagian Kontak memakai tautan profil.
- Statistik kunjungan (`outputs.web.analytics`): diabaikan.

Keduanya hanya memunculkan peringatan saat build, tidak menggagalkannya.
