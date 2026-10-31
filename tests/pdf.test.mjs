import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyVariant, contactFrom, webUrlFor } from '../src/lib/pdf-data.mjs';
import { renderAts, renderVisual } from '../src/lib/pdf-html.mjs';
import { pdfTitle } from '../src/build.mjs';

const data = () => JSON.parse(readFileSync(new URL('./fixtures/nadia.json', import.meta.url), 'utf8'));
const priv = () => JSON.parse(readFileSync(new URL('./fixtures/nadia.private.json', import.meta.url), 'utf8'));
const text = (html) => html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('varian menimpa urutan pencapaian dan menambah kata kunci', () => {
  const d = data();
  d.experience[0].achievements.push({ id: 'lain', bullet: 'Pencapaian lain' });
  const v = applyVariant(d, 'var-ecommerce');
  assert.deepEqual(v.experience[0].achievements.map((a) => a.id), ['dashboard-retur']);
  assert.ok(v.skills.groups[0].items.some((i) => i.name === 'A/B testing'));
  assert.equal(d.experience[0].achievements.length, 2, 'data asli tidak berubah');
  assert.throws(() => applyVariant(d, 'tidak-ada'), /tidak ada/);
});

test('kontak dari file privat; slug harus cocok; nomor HP bisa disembunyikan', () => {
  assert.deepEqual(contactFrom(priv(), data()), { email: 'nadia@contoh.id', phone: '+62 812 0000 0000', city: 'Jakarta Selatan' });
  const p = priv(); p.contact.showPhoneOnPdf = false;
  assert.equal(contactFrom(p, data()).phone, null);
  const q = priv(); q.slug = 'orang-lain';
  assert.throws(() => contactFrom(q, data()), /slug/);
  assert.equal(contactFrom(null, data()), null);
});

test('alamat web untuk QR', () => {
  assert.equal(webUrlFor(data(), priv()), 'https://contoh-nadia.github.io/');
  const p = priv(); p.github.repo = 'cv';
  assert.equal(webUrlFor(data(), p), 'https://contoh-nadia.github.io/cv/');
  const d = data(); d.outputs.web.enabled = false;
  assert.equal(webUrlFor(d, priv()), null);
});

test('PDF ATS: satu kolom, teks murni, tanggal MM/YYYY, tanpa ligatur', () => {
  const html = renderAts({ data: data(), lang: 'id', contact: contactFrom(priv(), data()), webUrl: 'https://contoh-nadia.github.io/' });
  assert.doesNotMatch(html, /<svg|<img|grid-template|column-count|float:/);
  assert.match(html, /font-variant-ligatures:none/);
  const t = text(html);
  assert.match(t, /07\/2025 – 12\/2025/);
  assert.match(t, /nadia@contoh\.id \| \+62 812 0000 0000 \| linkedin\.com\/in\/contoh-nadia/);
  const order = ['Ringkasan', 'Pengalaman Kerja', 'Proyek', 'Pendidikan', 'Keahlian', 'Organisasi', 'Bahasa'].map((h) => t.indexOf(h));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.ok(!order.includes(-1));
});

test('PDF ATS mengikuti outputs.ats.sectionOrder', () => {
  const d = data(); d.outputs.ats.sectionOrder = ['education', 'experience'];
  const t = text(renderAts({ data: d, lang: 'en', contact: null }));
  assert.ok(t.indexOf('Education') < t.indexOf('Work Experience'));
  assert.ok(!t.includes('Projects'));
});

test('PDF visual tanpa kontak privat tidak memuat email/nomor HP', () => {
  const html = renderVisual({ data: data(), lang: 'id', contact: null, webUrl: 'https://x.github.io/', figure: '<svg class="iso"></svg>', qr: '' });
  assert.doesNotMatch(text(html), /@|\+62/);
  assert.match(html, /class="layout-sidebar-left"/);
});

test('judul PDF terbaca dari metadata', () => {
  assert.equal(pdfTitle(Buffer.from('<< /Title (Nadia Putri Lestari - CV) >>')), 'Nadia Putri Lestari - CV');
  assert.equal(pdfTitle(Buffer.from('<< /Title <FEFF004E00E9> >>')), 'Né');
  assert.equal(pdfTitle(Buffer.from('tanpa judul')), null);
});

test('PDF visual varian timeline: garis waktu, indikator level, figur', () => {
  const d = data(); d.outputs.visual.layout = 'timeline';
  const html = renderVisual({ data: d, lang: 'en', contact: contactFrom(priv(), d), webUrl: 'https://x.github.io/', figure: '<svg class="iso"></svg>', qr: '<svg></svg>' });
  assert.match(html, /class="layout-timeline"/);
  assert.match(html, /<ol class="tl">/);
  assert.match(html, /class="dots"/);
  assert.match(html, /<div class="plate"><svg class="iso">/);
  assert.match(text(html), /Work Experience/);
});
