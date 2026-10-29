// Build: data/cv.json → dist/ (halaman statis siap GitHub Pages).
//   node src/build.mjs            pakai data/cv.json
//   CV_DATA=path.json node ...    pakai file lain
//   SITE_URL=https://... node ... paksa alamat web (untuk QR dan tautan kanonik)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { checkCv } from './lib/check.mjs';
import { UI } from './lib/i18n.mjs';
import { renderHome, renderCase, DEFAULT_SECTIONS, initials, esc } from './lib/render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

export function resolveSiteUrl(data, env = process.env) {
  const ensureSlash = (u) => (u.endsWith('/') ? u : `${u}/`);
  if (env.SITE_URL) return ensureSlash(env.SITE_URL);
  const domain = data.outputs?.web?.customDomain;
  if (domain) return `https://${domain}/`;
  const repo = env.GITHUB_REPOSITORY; // "pemilik/nama-repo" di GitHub Actions
  if (repo) {
    const [owner, name] = repo.split('/');
    const host = `${owner.toLowerCase()}.github.io`;
    return name.toLowerCase() === host ? `https://${host}/` : `https://${host}/${name}/`;
  }
  return 'http://localhost:4173/';
}

function figureFor(symbol) {
  const file = join(ROOT, 'figures', `${symbol}.svg`);
  if (existsSync(file)) return { svg: readFileSync(file, 'utf8'), found: true };
  return { svg: readFileSync(join(ROOT, 'figures', 'default.svg'), 'utf8'), found: false };
}

function favicon(data) {
  const p = data.brand.palette;
  const mono = esc(data.brand.monogram || initials(data.profile.fullName));
  const size = mono.length > 2 ? 22 : 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${p.primary}"/><text x="32" y="${32 + size * 0.36}" font-family="system-ui,sans-serif" font-weight="700" font-size="${size}" text-anchor="middle" fill="${p.ground ?? '#fff'}">${mono}</text></svg>`;
}

export async function build({ dataPath = process.env.CV_DATA || join(ROOT, 'data', 'cv.json'), outDir = DIST, env = process.env, log = console.log } = {}) {
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const { errors, warnings } = checkCv(data);
  warnings.forEach((w) => log(`  ! ${w}`));
  if (errors.length) {
    const err = new Error(`cv.json belum lolos pemeriksaan:\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`);
    err.errors = errors;
    throw err;
  }

  const web = data.outputs?.web ?? {};
  const locales = data.meta.locales;
  const primary = locales[0];
  const sections = web.sections?.length ? web.sections : DEFAULT_SECTIONS;
  const multi = web.mode === 'multi';
  const siteUrl = resolveSiteUrl(data, env);
  const { svg: figure, found } = figureFor(data.brand.illustration.symbol);
  if (!found) log(`  ! figur "${data.brand.illustration.symbol}" belum ada di figures/, memakai default.svg`);

  const qr = web.qr === false ? '' : await QRCode.toString(siteUrl, {
    type: 'svg', margin: 0, errorCorrectionLevel: 'M',
    color: { dark: data.brand.palette.ink ?? '#0F172A', light: '#0000' },
  });

  const publicDir = join(ROOT, 'public');
  const hasPdf = existsSync(join(publicDir, 'cv.pdf'));
  const photo = data.profile.photo ? data.profile.photo.replace(/^\.?\/?(public\/)?/, '') : '';
  if (photo && !existsSync(join(publicDir, photo))) throw new Error(`profile.photo "${data.profile.photo}" tidak ditemukan di folder public/`);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'assets'), { recursive: true });
  if (existsSync(publicDir)) cpSync(publicDir, outDir, { recursive: true, filter: (src) => !src.endsWith('.gitkeep') });
  cpSync(join(ROOT, 'src', 'assets'), join(outDir, 'assets'), { recursive: true });
  writeFileSync(join(outDir, 'favicon.svg'), favicon(data));
  writeFileSync(join(outDir, '.nojekyll'), '');
  if (web.customDomain) writeFileSync(join(outDir, 'CNAME'), `${web.customDomain}\n`);

  // Bahasa pertama di root, bahasa lain di /<kode>/.
  const pathFor = (lang, sub = '') => (lang === primary ? '' : `${lang}/`) + sub;
  const pages = [];
  const casesFor = multi ? (data.projects ?? []).filter((p) => p.caseStudy && !p.confidential) : [];

  for (const lang of locales) {
    const make = (sub) => {
      const here = pathFor(lang, sub);
      const depth = here.split('/').filter(Boolean).length;
      const rel = depth ? '../'.repeat(depth) : './';
      return {
        data, lang, t: UI[lang], locales, sections, multi, siteUrl, figure, qr, hasPdf, photo, rel, pathFor,
        homeHref: rel + pathFor(lang) || './',
        langHref: (other, s) => rel + pathFor(other, s) || './',
        caseHref: (id) => `${rel}${pathFor(lang, `case/${id}/`)}`,
      };
    };
    const homeCtx = make('');
    pages.push([pathFor(lang), renderHome(homeCtx)]);
    for (const p of casesFor) {
      const ctx = make(`case/${p.id}/`);
      ctx.navIds = homeCtx.navIds;
      pages.push([pathFor(lang, `case/${p.id}/`), renderCase(ctx, p)]);
    }
  }

  for (const [path, html] of pages) {
    mkdirSync(join(outDir, path), { recursive: true });
    writeFileSync(join(outDir, path, 'index.html'), html);
  }
  writeFileSync(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([p]) => `  <url><loc>${esc(siteUrl + p)}</loc><lastmod>${data.meta.updatedAt.slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`);

  log(`  ✓ ${pages.length} halaman → ${outDir.replace(ROOT + '/', '')}/  (${siteUrl})`);
  return { pages: pages.map(([p]) => p), siteUrl, outDir };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch((e) => { console.error(e.message); process.exit(1); });
}

