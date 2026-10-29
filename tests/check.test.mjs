import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCv } from '../src/lib/check.mjs';

const base = () => JSON.parse(readFileSync(new URL('./fixtures/nadia.json', import.meta.url), 'utf8'));

test('data contoh lolos pemeriksaan', () => {
  assert.deepEqual(checkCv(base()).errors, []);
});

test('menolak kunci kontak pribadi', () => {
  const d = base();
  d.profile.phone = '081234567890';
  assert.ok(checkCv(d).errors.some((e) => e.includes('$.profile.phone')));
});

for (const [label, text] of [
  ['email', 'Hubungi nadia.contoh@gmail.com'],
  ['nomor HP 08xx', 'WA 0812-3456-7890'],
  ['nomor HP +62', 'Telp +62 812 3456 789'],
  ['tautan WhatsApp', 'Chat https://wa.me/6281234567890'],
]) {
  test(`menolak ${label} di dalam teks`, () => {
    const d = base();
    d.profile.summary = { id: text, en: 'x' };
    assert.ok(checkCv(d).errors.some((e) => e.startsWith('$.profile.summary.id')), checkCv(d).errors.join('\n'));
  });
}

test('tahun dan bulan tidak dikira nomor HP', () => {
  const d = base();
  d.profile.summary = 'Magang 2025-08 sampai 2026-03, 20 ribu baris data, 08 proyek';
  assert.deepEqual(checkCv(d).errors, []);
});

test('menolak placeholder yang belum diisi', () => {
  const d = base();
  d.profile.headline = '[ISI headline]';
  assert.ok(checkCv(d).errors.some((e) => e.includes('placeholder')));
});

test('menolak data yang tidak sesuai skema', () => {
  const d = base();
  delete d.profile.fullName;
  assert.ok(checkCv(d).errors.length > 0);
});
