# Glowfolio CV Template

Template web CV untuk klien [Glowfolio](https://glowfolio.github.io/). Isi web diambil dari satu file, `data/cv.json`. Setiap kali file itu berubah, GitHub Actions memeriksa datanya, membangun halaman, lalu memasangnya ke GitHub Pages.

Contoh isi bawaan adalah **Nadia Putri Lestari**, klien fiktif.

## Isi repo

```
data/cv.json        ← satu-satunya file yang diganti per klien
public/             ← file pendukung: foto, cv.pdf tanpa kontak (opsional)
private/            ← kontak klien untuk PDF; diabaikan git, tidak pernah di-push
figures/            ← ilustrasi iso-glow, dipilih lewat brand.illustration.symbol
schema/             ← skema data (sama dengan glowfolio-data)
src/                ← generator, tampilan, dan skrip
tests/              ← tes generator (memakai tests/fixtures, bukan data klien)
tools/ats_check.py  ← uji keterbacaan PDF ATS dengan 3 pengurai
docs/               ← standar lulus ATS
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
| `brand.illustration.symbol` | Figur profesi: `server-rack` (developer), `data-chart` (data analyst), `food-lab` (QA pangan), `design-desk` (desainer). Kalau belum ada, dipakai `default.svg`. Figur dibuat oleh `tools/figures.py` |
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

## PDF (ATS & visual)

PDF dibuat di komputer Glowfolio, **bukan** di GitHub Actions. PDF lengkap memuat email dan nomor HP dari file privat, dan file itu tidak boleh masuk repo. Polanya `private/` dan `*.private.json` sudah ada di `.gitignore`.

```bash
npm install
npx playwright install chromium        # sekali saja
npm run pdf -- --private ../glowfolio-data/klien/nadia.private.json
```

Hasilnya disimpan di `out/`:

- `<slug>-id-ats.pdf`: satu kolom, teks murni, tanpa grafis. Untuk diunggah ke portal lowongan. Semua paket mendapatkannya.
- `<slug>-id-visual.pdf`: ber-brand, dengan warna, monogram, figur iso-glow, dan QR ke web CV. Untuk paket Signature ke atas.

| Opsi | Fungsi |
|---|---|
| `--lang en` / `--lang all` | Bahasa lain (add-on Terjemahan) |
| `--variant <id>` | Varian per lowongan dari `variants[]` (add-on Varian) |
| `--only ats` / `--only visual` | Hanya satu jenis |
| `--public` | Versi visual **tanpa kontak** ke `public/cv.pdf`, untuk tombol "Unduh CV" di web |
| `--site-url <url>` | Paksa alamat untuk QR (default dihitung dari `github` di file privat) |

Tata letak PDF visual diatur di `outputs.visual.layout`: `sidebar-left`, `sidebar-right`, `header-band`, `single-column`, atau `timeline` (Editorial Timeline: halaman terang, figur besar di kepala, pengalaman sebagai garis waktu, keahlian dengan indikator level). Kalau isinya melebihi `outputs.*.pages`, ukuran huruf diperkecil bertahap sampai 84%. Kalau masih belum muat, akan muncul peringatan agar bullet diringkas.

Build web akan **gagal** kalau `public/cv.pdf` berjudul nama orang lain, misalnya PDF contoh Nadia yang lupa diganti.

Standar lulus PDF ATS dan cara mengujinya ada di [docs/standar-lulus-ats.md](docs/standar-lulus-ats.md):

```bash
pip install pdfminer.six pypdf
npm run test:pdf
```

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
