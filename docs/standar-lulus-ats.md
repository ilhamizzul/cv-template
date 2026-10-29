# Standar lulus PDF ATS

PDF ATS Glowfolio dianggap **lulus** kalau semua butir di bawah terpenuhi. Pemeriksaan otomatisnya ada di `tools/ats_check.py`, dijalankan untuk setiap PDF ATS sebelum dikirim ke klien.

```bash
npm run pdf -- --private private/cv.private.json --only ats
python3 tools/ats_check.py out/ --data data/cv.json --private private/cv.private.json
```

## Kenapa diuji dengan tiga pengurai

Sebelum memecah CV menjadi bagian (nama, pengalaman, pendidikan, …), parser ATS lebih dulu mengubah PDF menjadi teks. Kebanyakan memakai salah satu pustaka umum berikut, dan kualitas hasil akhir ditentukan di tahap ini. Karena itu PDF diuji dengan tiga pengurai yang cara kerjanya berbeda:

| Pengurai | Dipakai oleh |
|---|---|
| **pdfminer.six** | Banyak parser CV berbasis Python, misalnya pyresparser |
| **pdftotext** (poppler) | Pipeline server dan konversi dokumen |
| **pypdf** | Pengurai ringan |

PDF lulus kalau ketiganya membaca isi yang sama dengan urutan yang sama.

## Butir pemeriksaan

| # | Butir | Alasan |
|---|---|---|
| 1 | Jumlah halaman ≤ `outputs.ats.pages` (default 1) | Perekrut membaca sekilas, dan sebagian ATS memotong halaman berikutnya |
| 2 | Tidak ada gambar raster | Teks di dalam gambar tidak terbaca |
| 3 | Semua font tertanam dan punya peta Unicode (ToUnicode) | Tanpa peta Unicode, teks keluar sebagai simbol acak |
| 4 | Semua judul bagian terbaca dengan urutan benar, di ketiga pengurai | Membuktikan tata letak satu kolom. Kolom ganda membuat urutan teks melompat |
| 5 | Nama, headline, email, nomor HP, jabatan, organisasi, institusi, skill, dan semua bullet terbaca utuh | Tidak ada teks yang terpotong, tergabung, atau hilang |
| 6 | Tidak ada ligatur (ﬁ, ﬂ) atau karakter rusak (�, area Private Use) | Ligatur membuat kata seperti "certified" tidak cocok dengan kata kunci |
| 7 | Tanggal terbaca dalam format `MM/YYYY` | Format angka dikenali parser dalam bahasa apa pun, sedangkan "Agu" dan "Des" sering tidak |
| 8 | Email terbaca persis | Kontak adalah bidang wajib di hampir semua ATS |

## Aturan desain PDF ATS (`renderAts`)

- Satu kolom. Tanpa tabel, kolom, float, ikon, foto, atau grafis; satu-satunya garis adalah garis bawah judul bagian.
- Judul bagian memakai nama standar: Ringkasan, Pengalaman Kerja, Proyek, Pendidikan, Keahlian, Sertifikasi, Bahasa, Organisasi, Penghargaan (versi EN: Summary, Work Experience, …).
- Kontak dalam satu baris teks biasa, dipisah `|`. Tautan ditulis sebagai teks (`linkedin.com/in/…`), bukan ikon.
- Ligatur dimatikan (`font-variant-ligatures: none`).
- Font tertanam dari `@fontsource`, jadi hasilnya sama di komputer mana pun.
- Teks hitam di atas latar putih, ukuran badan 10,4 pt. Kalau isi melebihi target halaman, skala diperkecil bertahap sampai minimal 84%.

## Hasil uji template (29 Okt 2026)

Data contoh Nadia (`tests/fixtures/nadia.json`), dibuat dengan `npm run test:pdf`.

| PDF | Halaman | pdfminer | pdftotext | pypdf | Status |
|---|---|---|---|---|---|
| `contoh-nadia-id-ats.pdf` | 1 | 5/5 | 5/5 | 5/5 | **Lulus** (18/18 butir) |
| `contoh-nadia-en-ats.pdf` | 1 | 5/5 | 5/5 | 5/5 | **Lulus** (18/18 butir) |

Sebagai kontrol, PDF visual yang sama **gagal** pemeriksaan ini: ada 4 gambar hasil efek cahaya, judul bagian tidak berurutan karena dua kolom, dan tanggal ditulis "Jul 2025". Ini membuktikan pemeriksaannya bisa membedakan PDF yang ramah ATS dari yang tidak. PDF visual memang untuk dibaca manusia, bukan untuk diunggah ke portal lowongan.

## Uji manual di ATS checker online

Lakukan sekali untuk setiap perubahan besar pada `renderAts`, lalu catat hasilnya di tabel ini.

| Checker | Yang dicek | Hasil |
|---|---|---|
| OpenResume Resume Parser (open-resume.com/resume-parser) | Bidang nama, email, telepon, pendidikan, dan pengalaman terisi benar | belum diuji |
| Jobscan / Resume Worded (akun gratis) | Skor format atau "ATS parse rate" | belum diuji |
| Portal lowongan lokal (Kalibrr / Glints / JobStreet) | Isian otomatis dari unggahan CV | belum diuji |
