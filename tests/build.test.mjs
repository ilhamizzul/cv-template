import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, resolveSiteUrl } from '../src/build.mjs';

const base = () => JSON.parse(readFileSync(new URL('./fixtures/nadia.json', import.meta.url), 'utf8'));
const quiet = () => {};

async function buildWith(mutate, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cvt-'));
  const d = base();
  mutate?.(d);
  const dataPath = join(dir, 'cv.json');
  writeFileSync(dataPath, JSON.stringify(d));
  const outDir = join(dir, 'dist');
  const res = await build({ dataPath, outDir, publicDir: join(dir, 'public'), env, log: quiet });
  return { ...res, read: (p) => readFileSync(join(outDir, p), 'utf8'), has: (p) => existsSync(join(outDir, p)) };
}

test('alamat web mengikuti nama repo', () => {
  const d = base();
  assert.equal(resolveSiteUrl(d, { GITHUB_REPOSITORY: 'nadia/nadia.github.io' }), 'https://nadia.github.io/');
  assert.equal(resolveSiteUrl(d, { GITHUB_REPOSITORY: 'Nadia/cv' }), 'https://nadia.github.io/cv/');
  assert.equal(resolveSiteUrl({ outputs: { web: { customDomain: 'nadia.id' } } }, {}), 'https://nadia.id/');
  assert.equal(resolveSiteUrl(d, { SITE_URL: 'https://x.test' }), 'https://x.test/');
});

test('membangun halaman ID di root dan EN di /en/', async () => {
  const r = await buildWith(null, { GITHUB_REPOSITORY: 'nadia/cv' });
  assert.deepEqual(r.pages, ['', 'en/']);
  assert.match(r.read('index.html'), /<html lang="id">/);
  assert.match(r.read('en/index.html'), /<html lang="en">/);
  assert.match(r.read('en/index.html'), /href="\.\.\/assets\/site\.css"/);
  assert.match(r.read('index.html'), /hreflang="en" href="https:\/\/nadia\.github\.io\/cv\/en\/"/);
  assert.ok(r.has('.nojekyll') && r.has('sitemap.xml') && r.has('favicon.svg'));
});

test('satu bahasa: tanpa tombol ganti bahasa', async () => {
  const r = await buildWith((d) => { d.meta.locales = ['id']; });
  assert.deepEqual(r.pages, ['']);
  assert.doesNotMatch(r.read('index.html'), /class="lang"/);
});

test('metrik yang belum diverifikasi tidak tampil', async () => {
  const r = await buildWith((d) => { d.experience[0].achievements[0].metrics[0].verified = false; });
  assert.doesNotMatch(r.read('index.html'), /hl-num/);
});

test('pengalaman rahasia: bullet disembunyikan', async () => {
  const r = await buildWith((d) => { d.experience[0].confidential = true; d.experience[0].achievements[0].highlight = false; });
  assert.doesNotMatch(r.read('index.html'), /menggantikan laporan manual/);
  assert.match(r.read('index.html'), /bersifat rahasia/);
});

test('mode multi: studi kasus jadi halaman sendiri', async () => {
  const r = await buildWith((d) => { d.outputs.web.mode = 'multi'; });
  assert.ok(r.pages.includes('case/skripsi-churn/') && r.pages.includes('en/case/skripsi-churn/'));
  assert.match(r.read('index.html'), /href="\.\/case\/skripsi-churn\/"/);
  assert.match(r.read('en/case/skripsi-churn/index.html'), /href="\.\.\/\.\.\/\.\.\/assets\/site\.css"/);
});

test('QR dan teks dari data di-escape', async () => {
  const r = await buildWith((d) => { d.profile.fullName = 'Nadia <script>'; });
  assert.doesNotMatch(r.read('index.html'), /Nadia <script>/);
  assert.match(r.read('index.html'), /<figure class="qr"><svg/);
});

test('build gagal bila ada data kontak', async () => {
  await assert.rejects(buildWith((d) => { d.profile.summary = 'email saya a@b.co'; }), /belum lolos/);
});

test('build gagal bila public/cv.pdf milik orang lain', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvt-'));
  mkdirSync(join(dir, 'public'));
  writeFileSync(join(dir, 'public', 'cv.pdf'), '%PDF-1.4\n<< /Title (Orang Lain - CV) >>');
  writeFileSync(join(dir, 'cv.json'), JSON.stringify(base()));
  await assert.rejects(build({ dataPath: join(dir, 'cv.json'), outDir: join(dir, 'dist'), publicDir: join(dir, 'public'), env: {}, log: quiet }), /bukan milik/);
});
