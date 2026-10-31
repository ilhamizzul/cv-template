// HTML untuk dua PDF dari data yang sama:
//  - ATS: satu kolom, teks murni, tanpa grafis, judul bagian standar, tanggal MM/YYYY.
//  - Visual: ber-brand (warna, monogram, figur iso-glow statis, QR ke web CV).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { UI, pick, formatPeriod } from './i18n.mjs';
import { renderTimeline } from './pdf-timeline.mjs';
import { esc, FONTS, initials, linkLabel, hostOf, verifiedMetrics, metricText } from './render.mjs';

const require = createRequire(import.meta.url);

export const T = {
  id: {
    summary: 'Ringkasan', experience: 'Pengalaman Kerja', projects: 'Proyek', education: 'Pendidikan', skills: 'Keahlian',
    certifications: 'Sertifikasi', languages: 'Bahasa', organizations: 'Organisasi', awards: 'Penghargaan',
    contact: 'Kontak', links: 'Tautan', highlights: 'Sorotan', web: 'Web CV', scan: 'Pindai untuk versi web',
    gpa: 'IPK', thesis: 'Skripsi', present: 'Sekarang',
  },
  en: {
    summary: 'Summary', experience: 'Work Experience', projects: 'Projects', education: 'Education', skills: 'Skills',
    certifications: 'Certifications', languages: 'Languages', organizations: 'Leadership & Activities', awards: 'Awards',
    contact: 'Contact', links: 'Links', highlights: 'Highlights', web: 'Web CV', scan: 'Scan for the web version',
    gpa: 'GPA', thesis: 'Thesis', present: 'Present',
  },
};

const DEFAULT_ATS_ORDER = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'languages', 'organizations', 'awards'];

// Font dari @fontsource (devDependency), di-embed ke PDF supaya hasilnya sama di komputer mana pun.
const FONT_PKG = {
  'Plus Jakarta Sans': 'plus-jakarta-sans', Sora: 'sora', 'Source Sans 3': 'source-sans-3', Newsreader: 'newsreader', 'JetBrains Mono': 'jetbrains-mono',
};
export function fontFaces(families) {
  const out = [];
  for (const fam of new Set(families)) {
    const pkg = FONT_PKG[fam];
    let dir;
    try { dir = join(dirname(require.resolve(`@fontsource/${pkg}/package.json`)), 'files'); } catch { continue; }
    for (const w of [400, 500, 600, 700]) {
      for (const [subset, range] of [['latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'], ['latin-ext', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF']]) {
        const url = pathToFileURL(join(dir, `${pkg}-${subset}-${w}-normal.woff2`)).href;
        out.push(`@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url('${url}') format('woff2');unicode-range:${range}}`);
      }
    }
  }
  return out.join('\n');
}

// Tanggal angka (07/2025) paling aman dibaca parser ATS dalam bahasa apa pun.
export function ymNum(ym, lang) {
  if (!ym) return '';
  if (ym === 'present') return T[lang].present;
  const [y, m] = ym.split('-');
  return m ? `${m}/${y}` : y;
}
function periodNum(p, lang) {
  if (!p) return '';
  const a = ymNum(p.start, lang);
  const b = ymNum(p.end ?? 'present', lang);
  return a === b ? a : `${a} – ${b}`;
}

const bare = (u) => hostOf(u);
const join2 = (parts, sep = ' | ') => parts.filter(Boolean).join(sep);

/* ------------------------------------------------------------------ ATS */

export function renderAts({ data, lang, contact, webUrl, scale = 1 }) {
  const t = T[lang];
  const ui = UI[lang];
  const p = data.profile;
  const font = FONTS[data.brand.font ?? 'geometric'].body;
  const order = data.outputs?.ats?.sectionOrder?.length ? data.outputs.ats.sectionOrder : DEFAULT_ATS_ORDER;

  const contactLine = join2([
    contact?.city || p.location?.city,
    contact?.email,
    contact?.phone,
    ...(p.links ?? []).map((l) => bare(l.url)),
    webUrl && bare(webUrl),
  ]);

  const role = (e) => {
    const sub = join2([e.organization, e.location, e.employmentType ? ui.employment[e.employmentType] : '', periodNum(e.period, lang)]);
    const bullets = (e.achievements ?? []).map((a) => `<li>${esc(pick(a.bullet, lang))}</li>`).join('');
    return `<div class="entry"><p class="eh"><b>${esc(pick(e.role, lang))}</b></p><p class="es">${esc(sub)}</p>
      ${e.summary ? `<p>${esc(pick(e.summary, lang))}</p>` : ''}${bullets ? `<ul>${bullets}</ul>` : ''}</div>`;
  };

  const S = {
    summary: () => `<p>${esc(pick(p.summary, lang))}</p>`,
    experience: () => (data.experience ?? []).map(role).join(''),
    organizations: () => (data.organizations ?? []).map(role).join(''),
    projects: () => (data.projects ?? []).map((pr) => `<div class="entry"><p class="eh"><b>${esc(pr.name)}</b></p>
      <p class="es">${esc(join2([pick(pr.role, lang), periodNum(pr.period, lang), ...(pr.links ?? []).slice(0, 1).map((l) => bare(l.url))]))}</p>
      <ul><li>${esc(pick(pr.description, lang))}</li>${(pr.highlights ?? []).map((h) => `<li>${esc(pick(h, lang))}</li>`).join('')}${pr.tech?.length ? `<li>${esc(pr.tech.join(', '))}</li>` : ''}</ul></div>`).join(''),
    education: () => (data.education ?? []).map((e) => `<div class="entry"><p class="eh"><b>${esc(join2([e.degree, pick(e.field, lang)], ' '))}</b></p>
      <p class="es">${esc(join2([e.institution, periodNum(e.period, lang), e.gpa ? `${t.gpa} ${e.gpa.value.toFixed(2)}/${e.gpa.scale.toFixed(2)}` : '']))}</p>
      ${e.thesis ? `<p>${t.thesis}: ${esc(pick(e.thesis, lang))}</p>` : ''}${e.highlights?.length ? `<ul>${e.highlights.map((h) => `<li>${esc(pick(h, lang))}</li>`).join('')}</ul>` : ''}</div>`).join(''),
    skills: () => (data.skills?.groups ?? []).map((g) => `<p><b>${esc(pick(g.name, lang))}:</b> ${esc(g.items.map((i) => i.name).join(', '))}</p>`).join(''),
    certifications: () => (data.certifications ?? []).map((c) => `<p>${esc(join2([c.name, c.issuer, c.date && ymNum(c.date, lang)]))}</p>`).join(''),
    languages: () => (data.languages?.length ? `<p>${esc(data.languages.map((l) => `${l.name} (${ui.langLevels[l.level]}${l.certificate ? `, ${l.certificate}` : ''})`).join(', '))}</p>` : ''),
    awards: () => (data.awards ?? []).map((a) => `<p>${esc(join2([pick(a.title, lang), a.issuer, a.date && ymNum(a.date, lang)]))}</p>`).join(''),
  };

  const body = order.map((id) => {
    const html = S[id]?.();
    return html ? `<section><h2>${t[id]}</h2>${html}</section>` : '';
  }).join('\n');

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(p.fullName)} - CV</title>
<style>
${fontFaces([font])}
@page{size:A4;margin:15mm 17mm}
:root{--k:${scale}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact}
body{margin:0;font-family:'${font}',Arial,sans-serif;font-size:calc(10.4pt * var(--k));line-height:1.36;color:#000;font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0}
h1{font-size:calc(19pt * var(--k));margin:0 0 2pt;font-weight:700}
.hl{margin:0 0 3pt;font-size:calc(11pt * var(--k))}
.ct{margin:0 0 8pt}
h2{font-size:calc(10.8pt * var(--k));text-transform:uppercase;letter-spacing:.04em;margin:calc(9pt * var(--k)) 0 4pt;padding-bottom:1.5pt;border-bottom:.6pt solid #000;font-weight:700}
p{margin:0 0 3pt}
.entry{margin-bottom:calc(6pt * var(--k));break-inside:avoid}
.eh{margin:0}
.es{margin:0 0 2pt}
ul{margin:2pt 0 0;padding-left:13pt}
li{margin:0 0 1.5pt}
a{color:#000;text-decoration:none}
</style></head><body>
<header><h1>${esc(p.fullName)}</h1><p class="hl">${esc(pick(p.headline, lang))}</p><p class="ct">${esc(contactLine)}</p></header>
${body}
</body></html>`;
}

/* --------------------------------------------------------------- Visual */

// Gaya figur sama dengan web; animasi tidak berlaku di PDF (versi statis).
export const ISO_CSS = readFileSync(new URL('../assets/iso.css', import.meta.url), 'utf8');

export function renderVisual(args) {
  if ((args.data.outputs?.visual?.layout) === 'timeline') return renderTimeline(args);
  const { data, lang, contact, webUrl, figure, qr, photoUrl, scale = 1 } = args;
  const t = T[lang];
  const ui = UI[lang];
  const p = data.profile;
  const b = data.brand;
  const pal = b.palette;
  const f = FONTS[b.font ?? 'geometric'];
  const layout = data.outputs?.visual?.layout ?? 'sidebar-left';
  const pages = data.outputs?.visual?.pages ?? 1;
  const mono = b.monogram || initials(p.fullName);
  const showPhoto = data.outputs?.visual?.showPhoto && photoUrl;

  const contactItems = [
    contact?.email && ['Email', contact.email, `mailto:${contact.email}`],
    contact?.phone && [lang === 'en' ? 'Phone' : 'Telepon', contact.phone, null],
    (contact?.city || p.location?.city) && [lang === 'en' ? 'Location' : 'Lokasi', contact?.city || p.location.city, null],
    webUrl && [t.web, bare(webUrl), webUrl],
    ...(p.links ?? []).map((l) => [linkLabel(l), bare(l.url), l.url]),
  ].filter(Boolean);

  const kv = (items) => `<dl class="kv">${items.map(([k, v, href]) => `<dt>${esc(k)}</dt><dd>${href ? `<a href="${esc(href)}">${esc(v)}</a>` : esc(v)}</dd>`).join('')}</dl>`;

  const role = (e) => `<div class="entry"><div class="eh"><h4>${esc(pick(e.role, lang))}</h4><span class="when">${esc(formatPeriod(e.period, lang))}</span></div>
    <p class="org">${esc(join2([e.organization, e.location, e.employmentType ? ui.employment[e.employmentType] : ''], ' · '))}</p>
    ${e.summary ? `<p>${esc(pick(e.summary, lang))}</p>` : ''}
    ${e.achievements?.length ? `<ul>${e.achievements.map((a) => `<li>${esc(pick(a.bullet, lang))}</li>`).join('')}</ul>` : ''}</div>`;

  const metrics = [...(data.experience ?? []), ...(data.organizations ?? [])]
    .flatMap((e) => (e.achievements ?? []).filter((a) => a.highlight).flatMap((a) => verifiedMetrics(a.metrics)))
    .slice(0, 3).map((m) => metricText(m, lang));

  const sec = (title, html) => (html ? `<section><h3>${esc(title)}</h3>${html}</section>` : '');

  const side = [
    `<div class="plate">${figure}</div>`,
    sec(t.contact, kv(contactItems)),
    sec(t.skills, (data.skills?.groups ?? []).map((g) => `<p class="sg">${esc(pick(g.name, lang))}</p><ul class="tags">${g.items.map((i) => `<li>${esc(i.name)}</li>`).join('')}</ul>`).join('')),
    sec(t.languages, data.languages?.length ? `<ul class="plain">${data.languages.map((l) => `<li><b>${esc(l.name)}</b> <span>${esc(ui.langLevels[l.level])}${l.certificate ? ` · ${esc(l.certificate)}` : ''}</span></li>`).join('')}</ul>` : ''),
    sec(t.certifications, data.certifications?.length ? `<ul class="plain">${data.certifications.map((c) => `<li><b>${esc(c.name)}</b> <span>${esc(join2([c.issuer, c.date && ymNum(c.date, lang)], ' · '))}</span></li>`).join('')}</ul>` : ''),
    qr ? `<div class="qr">${qr}<p>${t.scan}</p></div>` : '',
  ].join('');

  const main = [
    metrics.length ? `<div class="metrics">${metrics.map((m) => `<div><p class="mv">${esc(m.value)}<small>${esc(m.unit)}</small></p><p class="ml">${esc(m.label)}</p></div>`).join('')}</div>` : '',
    sec(t.summary, `<p>${esc(pick(p.summary, lang))}</p>`),
    sec(t.experience, (data.experience ?? []).map(role).join('')),
    sec(t.projects, (data.projects ?? []).map((pr) => `<div class="entry"><div class="eh"><h4>${esc(pr.name)}</h4><span class="when">${esc(formatPeriod(pr.period, lang))}</span></div>
      <p class="org">${esc(join2([pick(pr.role, lang), pr.tech?.join(', ')], ' · '))}</p><p>${esc(pick(pr.description, lang))}</p>
      ${pr.highlights?.length ? `<ul>${pr.highlights.map((h) => `<li>${esc(pick(h, lang))}</li>`).join('')}</ul>` : ''}</div>`).join('')),
    sec(t.education, (data.education ?? []).map((e) => `<div class="entry"><div class="eh"><h4>${esc(join2([e.degree, pick(e.field, lang)], ' '))}</h4><span class="when">${esc(formatPeriod(e.period, lang))}</span></div>
      <p class="org">${esc(join2([e.institution, e.gpa ? `${t.gpa} ${e.gpa.value.toFixed(2)}/${e.gpa.scale}` : ''], ' · '))}</p>
      ${e.thesis ? `<p>${t.thesis}: ${esc(pick(e.thesis, lang))}</p>` : ''}</div>`).join('')),
    sec(t.organizations, (data.organizations ?? []).map(role).join('')),
    sec(t.awards, (data.awards ?? []).map((a) => `<div class="entry"><div class="eh"><h4>${esc(pick(a.title, lang))}</h4><span class="when">${esc(a.date ?? '')}</span></div>${a.issuer ? `<p class="org">${esc(a.issuer)}</p>` : ''}</div>`).join('')),
  ].join('');

  const head = `<header class="head">${showPhoto ? `<img class="photo" src="${esc(photoUrl)}" alt="">` : `<div class="mono">${esc(mono)}</div>`}
    <div><h1>${esc(p.fullName)}</h1><p class="headline">${esc(pick(p.headline, lang))}</p>${b.positioning ? `<p class="pos">${esc(pick(b.positioning, lang))}</p>` : ''}</div></header>`;

  return `<!doctype html><html lang="${lang}" class="layout-${layout}"><head><meta charset="utf-8"><title>${esc(p.fullName)} - CV</title>
<style>
${fontFaces([f.head, f.body])}
@page{size:A4;margin:12mm 0 10mm}
@page:first{margin-top:0}
:root{--k:${scale};--primary:${pal.primary};--accent:${pal.accent};--ink:${pal.ink ?? '#0F172A'};--ground:${pal.ground ?? '#FFFFFF'};
  --muted:color-mix(in srgb,var(--ink) 60%,#fff);--line:color-mix(in srgb,var(--ink) 14%,#fff);--tint:color-mix(in srgb,var(--primary) 7%,var(--ground));
  --side:${layout === 'header-band' || layout === 'single-column' ? 'var(--tint)' : 'var(--primary)'};--sideInk:${layout === 'header-band' || layout === 'single-column' ? 'var(--ink)' : 'var(--ground)'}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--ground);color:var(--ink);font:400 calc(9.4pt * var(--k))/1.42 '${f.body}',sans-serif}
h1,h3,h4{font-family:'${f.head}','${f.body}',sans-serif;margin:0}
p{margin:0 0 3pt}
ul{margin:0;padding:0;list-style:none}
a{color:inherit;text-decoration:none}
.page{display:grid;min-height:${287 + 275 * (pages - 1)}mm;grid-template-columns:68mm 1fr;grid-template-areas:"side main"}
.layout-sidebar-right .page{grid-template-columns:1fr 68mm;grid-template-areas:"main side"}
.layout-header-band .page,.layout-single-column .page{grid-template-columns:1fr 62mm;grid-template-areas:"head head" "main side";grid-template-rows:auto 1fr}
.layout-single-column .page{grid-template-columns:1fr;grid-template-areas:"head" "main" "side";grid-template-rows:auto auto 1fr}
/* Latar sidebar dilukis di latar halaman supaya penuh di setiap halaman, termasuk area margin */
html.layout-sidebar-left{background:linear-gradient(90deg,var(--side) 68mm,var(--ground) 68mm)}
html.layout-sidebar-right{background:linear-gradient(270deg,var(--side) 68mm,var(--ground) 68mm)}
.layout-sidebar-left .side,.layout-sidebar-right .side{background:transparent}
.layout-sidebar-left body,.layout-sidebar-right body{background:transparent}
.side{grid-area:side;background:var(--side);color:var(--sideInk);padding:calc(14mm * var(--k)) calc(8mm * var(--k)) 10mm}
.main{grid-area:main;padding:calc(14mm * var(--k)) calc(12mm * var(--k)) 10mm}
.layout-header-band .side,.layout-header-band .main,.layout-single-column .side,.layout-single-column .main{padding-top:calc(8mm * var(--k))}
.layout-single-column .side{display:grid;grid-template-columns:repeat(3,1fr);gap:0 8mm;align-content:start;padding-bottom:8mm}
.layout-single-column .side .kv{gap:.6mm}
.layout-single-column .side .plate{display:none}

.head{display:flex;gap:calc(5mm * var(--k));align-items:center;margin-bottom:calc(6mm * var(--k))}
.layout-header-band .head,.layout-single-column .head{grid-area:head;margin:0;padding:calc(12mm * var(--k)) 12mm calc(9mm * var(--k));background:var(--primary);color:var(--ground)}
.layout-header-band .head h1,.layout-single-column .head h1{color:var(--ground)}
.layout-header-band .head .headline,.layout-single-column .head .headline{color:var(--ground)}
.layout-header-band .head .pos,.layout-single-column .head .pos{color:color-mix(in srgb,var(--ground) 80%,var(--primary))}
.mono{flex:none;display:grid;place-items:center;width:calc(17mm * var(--k));height:calc(17mm * var(--k));border-radius:5mm;background:var(--primary);color:var(--ground);font:700 calc(15pt * var(--k)) '${f.head}',sans-serif;letter-spacing:.04em;box-shadow:inset 0 -1.2mm 0 var(--accent)}
.layout-header-band .mono,.layout-single-column .mono{background:var(--ground);color:var(--primary)}
.photo{width:22mm;height:22mm;border-radius:50%;object-fit:cover;flex:none}
h1{font-size:calc(23pt * var(--k));line-height:1.08;letter-spacing:-.01em;color:var(--ink)}
.headline{font-weight:600;color:var(--primary);font-size:calc(10.6pt * var(--k));margin:3pt 0 2pt}
.pos{color:var(--muted);font-style:italic;margin:0}

.plate{background:#070C24;border-radius:4mm;padding:4mm;margin-bottom:calc(6mm * var(--k))}
${ISO_CSS}
section{margin-bottom:calc(5.2mm * var(--k))}
h3{font-size:calc(8.4pt * var(--k));text-transform:uppercase;letter-spacing:.12em;margin-bottom:calc(2.6mm * var(--k));color:var(--primary);display:flex;align-items:center;gap:2mm}
h3::before{content:"";width:2.2mm;height:2.2mm;border-radius:.6mm;background:var(--accent)}
.side h3{color:var(--sideInk)}
.kv{margin:0;display:grid;gap:1.6mm}
.kv dt{font-size:calc(7.2pt * var(--k));text-transform:uppercase;letter-spacing:.08em;opacity:.7}
.kv dd{margin:0 0 .6mm;word-break:break-word;font-weight:500}
.sg{font-weight:600;margin:2mm 0 1.4mm}
.tags{display:flex;flex-wrap:wrap;gap:1.4mm}
.tags li{padding:.5mm 2.2mm;border-radius:3mm;border:.25mm solid color-mix(in srgb,var(--sideInk) 35%,transparent);font-size:calc(8.2pt * var(--k))}
.plain li{margin-bottom:1.4mm}
.plain span{opacity:.75;display:block;font-size:calc(8.2pt * var(--k))}
.qr{margin-top:calc(5mm * var(--k));display:flex;gap:3mm;align-items:center}
.qr svg{width:20mm;height:20mm;background:#fff;padding:1.4mm;border-radius:1.6mm;flex:none}
.qr p{font-size:calc(7.6pt * var(--k));margin:0;opacity:.85}

.metrics{display:flex;gap:4mm;margin-bottom:calc(5mm * var(--k))}
.metrics > div{flex:1;padding:calc(3mm * var(--k)) 4mm;border-radius:3mm;background:var(--tint);border-left:1mm solid var(--accent)}
.mv{font:700 calc(17pt * var(--k))/1 '${f.head}',sans-serif;color:var(--primary);margin:0 0 1mm}
.mv small{font-size:calc(8pt * var(--k));margin-left:1mm;color:var(--muted)}
.ml{font-size:calc(8pt * var(--k));color:var(--muted);margin:0}
.entry{margin-bottom:calc(3.6mm * var(--k));break-inside:avoid}
.eh{display:flex;justify-content:space-between;gap:4mm;align-items:baseline}
h4{font-size:calc(10.4pt * var(--k));color:var(--ink)}
.when{font-size:calc(8.2pt * var(--k));color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.org{color:var(--primary);font-weight:600;margin:.6mm 0 1.2mm}
.main ul li{position:relative;padding-left:4mm;margin-bottom:1mm}
.main ul li::before{content:"";position:absolute;left:.4mm;top:.62em;width:1.6mm;height:1.6mm;border-radius:.4mm;background:var(--accent)}
</style></head><body>
<div class="page">
${layout === 'header-band' || layout === 'single-column' ? head : ''}
<aside class="side">${side}</aside>
<main class="main">${layout === 'header-band' || layout === 'single-column' ? '' : head}${main}</main>
</div>
</body></html>`;
}
