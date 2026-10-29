// Render PDF CV dari data/cv.json. Dijalankan di komputer Glowfolio, BUKAN di GitHub Actions,
// karena PDF lengkap berisi kontak dari file privat yang tidak boleh masuk repo.
//
//   npm run pdf                                   PDF lengkap → out/ (kontak dari private/cv.private.json)
//   npm run pdf -- --private ../klien/x.private.json
//   npm run pdf -- --lang en | --lang all         bahasa (default: bahasa pertama di meta.locales)
//   npm run pdf -- --variant var-ecommerce        varian per lowongan (add-on)
//   npm run pdf -- --only ats | visual            hanya satu jenis
//   npm run pdf -- --public                       versi TANPA kontak → public/cv.pdf (tombol unduh di web)
//   npm run pdf -- --site-url https://...         alamat web untuk QR (default: dihitung otomatis)
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import QRCode from 'qrcode';
import { checkCv } from './lib/check.mjs';
import { applyVariant, contactFrom, webUrlFor } from './lib/pdf-data.mjs';
import { renderAts, renderVisual } from './lib/pdf-html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/;
const PHONE = /(?:\+?62[\s.-]?|\b0)8\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,5}\b/;

const { values: opt } = parseArgs({
  options: {
    data: { type: 'string', default: process.env.CV_DATA || join(ROOT, 'data', 'cv.json') },
    private: { type: 'string' },
    lang: { type: 'string' },
    variant: { type: 'string' },
    only: { type: 'string' },
    out: { type: 'string', default: join(ROOT, 'out') },
    public: { type: 'boolean', default: false },
    'site-url': { type: 'string' },
  },
});

const countPages = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    throw new Error('Playwright belum terpasang. Jalankan: npm install && npx playwright install chromium');
  }
}

// Kecilkan skala sedikit demi sedikit sampai muat di jumlah halaman target.
async function renderFit(browser, make, targetPages, file, tmpDir) {
  const page = await browser.newPage();
  let chosen = null;
  for (let k = 1; k >= 0.84 - 1e-9; k -= 0.02) {
    const html = join(tmpDir, 'page.html');
    writeFileSync(html, make(Number(k.toFixed(2))));
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true, outline: false });
    const n = countPages(pdf);
    chosen = { pdf, n, k: Number(k.toFixed(2)), text: await page.evaluate(() => document.body.innerText) };
    if (n <= targetPages) break;
  }
  // Tidak muat walau sudah dikecilkan: kembali ke ukuran normal, biarkan bertambah halaman.
  if (chosen.n > targetPages && chosen.k < 1) {
    const html = join(tmpDir, 'page.html');
    writeFileSync(html, make(1));
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true, outline: false });
    chosen = { pdf, n: countPages(pdf), k: 1, text: await page.evaluate(() => document.body.innerText) };
  }
  await page.close();
  writeFileSync(file, chosen.pdf);
  return chosen;
}

async function main() {
  const raw = JSON.parse(readFileSync(opt.data, 'utf8'));
  const { errors } = checkCv(raw);
  if (errors.length) throw new Error(`cv.json belum lolos pemeriksaan:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`);

  const data = applyVariant(raw, opt.variant);
  const privPath = opt.public ? null : (opt.private || join(ROOT, 'private', 'cv.private.json'));
  let priv = null;
  if (privPath && existsSync(privPath)) priv = JSON.parse(readFileSync(privPath, 'utf8'));
  else if (!opt.public) console.log(`  ! file privat tidak ditemukan (${privPath}): PDF dibuat tanpa email dan nomor HP`);
  const contact = contactFrom(priv, data);
  const webUrl = webUrlFor(data, priv, opt['site-url']);

  const tier = data.meta.tier;
  const kinds = opt.only ? [opt.only]
    : tier === 'rapi-ats' ? ['ats']
    : opt.public ? ['visual'] // tombol unduh di web memakai versi visual
    : ['ats', 'visual'];
  const langs = opt.lang === 'all' ? data.meta.locales : [opt.lang || data.meta.locales[0]];
  for (const l of langs) if (!data.meta.locales.includes(l)) throw new Error(`Bahasa "${l}" tidak ada di meta.locales`);

  const symbol = data.brand.illustration.symbol;
  const figPath = existsSync(join(ROOT, 'figures', `${symbol}.svg`)) ? join(ROOT, 'figures', `${symbol}.svg`) : join(ROOT, 'figures', 'default.svg');
  const figure = readFileSync(figPath, 'utf8');
  const qr = webUrl ? await QRCode.toString(webUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0F172A', light: '#0000' } }) : '';
  const photo = data.profile.photo ? join(ROOT, 'public', data.profile.photo.replace(/^\.?\/?(public\/)?/, '')) : null;
  const photoUrl = photo && existsSync(photo) ? pathToFileURL(photo).href : null;

  const outDir = opt.public ? join(ROOT, 'public') : resolve(opt.out);
  const tmpDir = join(ROOT, 'out', '.tmp');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const lang of langs) {
      for (const kind of kinds) {
        const target = data.outputs?.[kind]?.pages ?? 1;
        const make = (scale) => (kind === 'ats'
          ? renderAts({ data, lang, contact, webUrl, scale })
          : renderVisual({ data, lang, contact, webUrl, figure, qr, photoUrl, scale }));
        const name = opt.public
          ? (langs.length > 1 && lang !== data.meta.locales[0] ? `cv-${lang}.pdf` : 'cv.pdf')
          : `${[data.meta.slug, opt.variant, lang, kind].filter(Boolean).join('-')}.pdf`;
        const file = join(outDir, name);
        const r = await renderFit(browser, make, target, file, tmpDir);
        if (opt.public && (EMAIL.test(r.text) || PHONE.test(r.text))) {
          rmSync(file);
          throw new Error(`${name}: ditemukan email/nomor HP di PDF publik, dibatalkan`);
        }
        results.push({ name, ...r, target });
      }
    }
  } finally {
    await browser.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }

  for (const r of results) {
    const fit = r.n <= r.target ? '✓' : '!';
    console.log(`  ${fit} ${r.name}: ${r.n} halaman (target ${r.target})${r.k < 1 ? `, skala ${Math.round(r.k * 100)}%` : ''}`);
    if (r.n > r.target) console.log('    isi terlalu panjang untuk target halaman: ringkas bullet atau naikkan outputs.*.pages');
  }
  console.log(`  → ${outDir.replace(ROOT + '/', '')}/${webUrl ? `  (QR: ${webUrl})` : ''}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
