// PDF visual varian "timeline" (Editorial Timeline).
// Halaman terang tanpa sidebar berwarna: kepala besar dengan figur iso-glow di kanan,
// pita kontak, lalu dua kolom. Kiri: ringkasan dan pengalaman sebagai garis waktu vertikal.
// Kanan: angka sorotan, keahlian dengan indikator level, pendidikan, bahasa, QR.
import { UI, pick, formatPeriod } from './i18n.mjs';
import { esc, FONTS, initials, linkLabel, hostOf, verifiedMetrics, metricText } from './render.mjs';
import { T, fontFaces, ymNum, ISO_CSS } from './pdf-html.mjs';

const LEVEL = { familiar: 1, proficient: 2, advanced: 3, expert: 4 };
const join2 = (parts, sep) => parts.filter(Boolean).join(sep);

export function renderTimeline({ data, lang, contact, webUrl, figure, qr, photoUrl, scale = 1 }) {
  const t = T[lang];
  const ui = UI[lang];
  const p = data.profile;
  const b = data.brand;
  const pal = b.palette;
  const f = FONTS[b.font ?? 'geometric'];
  const pages = data.outputs?.visual?.pages ?? 1;
  const mono = b.monogram || initials(p.fullName);
  const showPhoto = data.outputs?.visual?.showPhoto && photoUrl;

  const contactItems = [
    contact?.email && [contact.email, `mailto:${contact.email}`],
    contact?.phone && [contact.phone, null],
    (contact?.city || p.location?.city) && [contact?.city || p.location.city, null],
    webUrl && [hostOf(webUrl), webUrl],
    ...(p.links ?? []).map((l) => [`${linkLabel(l)} · ${hostOf(l.url).replace(/^[^/]+\//, '')}`, l.url]),
  ].filter(Boolean);

  const metrics = [...(data.experience ?? []), ...(data.organizations ?? [])]
    .flatMap((e) => (e.achievements ?? []).filter((a) => a.highlight).flatMap((a) => verifiedMetrics(a.metrics)))
    .slice(0, 3).map((m) => metricText(m, lang));

  const step = (e, kind) => `<li class="step ${kind}"><p class="when">${esc(formatPeriod(e.period, lang))}</p>
    <h4>${esc(pick(e.role, lang))}</h4>
    <p class="org">${esc(join2([e.organization, e.location, e.employmentType ? ui.employment[e.employmentType] : ''], ' · '))}</p>
    ${e.summary ? `<p>${esc(pick(e.summary, lang))}</p>` : ''}
    ${e.achievements?.length ? `<ul class="bul">${e.achievements.map((a) => `<li>${esc(pick(a.bullet, lang))}</li>`).join('')}</ul>` : ''}</li>`;

  const sec = (title, html, cls = '') => (html ? `<section class="${cls}"><h3><span>${esc(title)}</span></h3>${html}</section>` : '');

  const left = [
    sec(t.summary, `<p class="lead">${esc(pick(p.summary, lang))}</p>`),
    sec(t.experience, data.experience?.length ? `<ol class="tl">${data.experience.map((e) => step(e, 'job')).join('')}</ol>` : ''),
    sec(t.projects, (data.projects ?? []).map((pr) => `<div class="proj"><div class="ph"><h4>${esc(pr.name)}</h4><span class="when">${esc(formatPeriod(pr.period, lang))}</span></div>
      <p class="org">${esc(join2([pick(pr.role, lang), pr.tech?.join(', ')], ' · '))}</p><p>${esc(pick(pr.description, lang))}</p>
      ${pr.highlights?.length ? `<ul class="bul">${pr.highlights.map((h) => `<li>${esc(pick(h, lang))}</li>`).join('')}</ul>` : ''}</div>`).join('')),
    sec(t.organizations, data.organizations?.length ? `<ol class="tl">${data.organizations.map((e) => step(e, 'org')).join('')}</ol>` : ''),
  ].join('');

  const dots = (lvl) => `<span class="dots" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>`;

  const right = [
    metrics.length ? `<div class="nums">${metrics.map((m) => `<div><p class="mv">${esc(m.value)}<small>${esc(m.unit)}</small></p><p class="ml">${esc(m.label)}</p></div>`).join('')}</div>` : '',
    sec(t.skills, (data.skills?.groups ?? []).map((g) => `<p class="sg">${esc(pick(g.name, lang))}</p><ul class="skills">${g.items.map((i) => `<li><span>${esc(i.name)}</span>${i.level ? dots(LEVEL[i.level]) : ''}</li>`).join('')}</ul>`).join('')),
    sec(t.education, (data.education ?? []).map((e) => `<div class="edu"><h4>${esc(join2([e.degree, pick(e.field, lang)], ' '))}</h4>
      <p class="org">${esc(e.institution)}</p><p class="when">${esc(join2([formatPeriod(e.period, lang), e.gpa ? `${t.gpa} ${e.gpa.value.toFixed(2)}/${e.gpa.scale}` : ''], ' · '))}</p>
      ${e.thesis ? `<p class="small">${t.thesis}: ${esc(pick(e.thesis, lang))}</p>` : ''}</div>`).join('')),
    sec(t.languages, data.languages?.length ? `<ul class="plain">${data.languages.map((l) => `<li><b>${esc(l.name)}</b><span>${esc(ui.langLevels[l.level])}${l.certificate ? ` · ${esc(l.certificate)}` : ''}</span></li>`).join('')}</ul>` : ''),
    sec(t.certifications, data.certifications?.length ? `<ul class="plain">${data.certifications.map((c) => `<li><b>${esc(c.name)}</b><span>${esc(join2([c.issuer, c.date && ymNum(c.date, lang)], ' · '))}</span></li>`).join('')}</ul>` : ''),
    sec(t.awards, data.awards?.length ? `<ul class="plain">${data.awards.map((a) => `<li><b>${esc(pick(a.title, lang))}</b><span>${esc(join2([a.issuer, a.date && ymNum(a.date, lang)], ' · '))}</span></li>`).join('')}</ul>` : ''),
    qr ? `<div class="qr">${qr}<p>${t.scan}<br><b>${esc(hostOf(webUrl))}</b></p></div>` : '',
  ].join('');

  return `<!doctype html><html lang="${lang}" class="layout-timeline"><head><meta charset="utf-8"><title>${esc(p.fullName)} - CV</title>
<style>
${fontFaces([f.head, f.body])}
@page{size:A4;margin:12mm 0 12mm}
@page:first{margin-top:0}
:root{--k:${scale};--primary:${pal.primary};--accent:${pal.accent};--ink:${pal.ink ?? '#0F172A'};--ground:${pal.ground ?? '#FFFFFF'};
  --muted:color-mix(in srgb,var(--ink) 58%,#fff);--line:color-mix(in srgb,var(--ink) 13%,#fff);--tint:color-mix(in srgb,var(--primary) 6%,var(--ground))}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:var(--ground)}
body{margin:0;color:var(--ink);font:400 calc(9.3pt * var(--k))/1.45 '${f.body}',sans-serif}
h1,h3,h4{font-family:'${f.head}','${f.body}',sans-serif;margin:0}
p{margin:0 0 2.6pt}
ul,ol{margin:0;padding:0;list-style:none}
a{color:inherit;text-decoration:none}
${ISO_CSS}

.head{display:grid;grid-template-columns:1fr 62mm;gap:8mm;align-items:center;padding:calc(13mm * var(--k)) 14mm calc(6mm * var(--k));position:relative}
.head::before{content:"";position:absolute;left:0;top:0;width:100%;height:3.2mm;background:linear-gradient(90deg,var(--primary) 0 72%,var(--accent) 72%)}
.kicker{display:flex;align-items:center;gap:3mm;margin-bottom:3mm}
.mono{display:grid;place-items:center;min-width:11mm;height:11mm;padding:0 2mm;border-radius:3mm;background:var(--primary);color:var(--ground);font:700 calc(10pt * var(--k)) '${f.head}',sans-serif;letter-spacing:.06em}
.photo{width:16mm;height:16mm;border-radius:50%;object-fit:cover}
.pos{font-size:calc(8.6pt * var(--k));color:var(--muted);text-transform:uppercase;letter-spacing:.14em;margin:0}
h1{font-size:calc(30pt * var(--k));line-height:1.02;letter-spacing:-.02em}
.headline{font-size:calc(11.5pt * var(--k));font-weight:600;color:var(--primary);margin:2.4mm 0 0}
.plate{background:#070C24;border-radius:4mm;padding:3.5mm;box-shadow:0 0 0 .3mm color-mix(in srgb,var(--accent) 30%,transparent)}

.bar{display:flex;flex-wrap:wrap;gap:1.2mm 0;margin:0 14mm;padding:2.6mm 4mm;background:var(--tint);border-radius:2.4mm;font-size:calc(8.2pt * var(--k))}
.bar span{padding:0 3mm;border-left:.3mm solid var(--line)}
.bar span:first-child{border-left:0;padding-left:0}

.cols{display:grid;grid-template-columns:1fr 60mm;gap:9mm;padding:calc(7mm * var(--k)) 14mm 0}
section{margin-bottom:calc(5.4mm * var(--k))}
h3{break-after:avoid;font-size:calc(8.2pt * var(--k));text-transform:uppercase;letter-spacing:.16em;color:var(--primary);margin-bottom:calc(3mm * var(--k));display:flex;align-items:center;gap:3mm}
h3::after{content:"";flex:1;height:.3mm;background:var(--line)}
.lead{font-size:calc(10pt * var(--k));line-height:1.5}
.when{font-size:calc(7.8pt * var(--k));color:var(--muted);font-variant-numeric:tabular-nums;margin:0}
h4{font-size:calc(10.4pt * var(--k));color:var(--ink)}
.org{color:var(--primary);font-weight:600;margin:.4mm 0 1.4mm}

.tl{position:relative;padding-left:7mm}
.tl::before{content:"";position:absolute;left:1.6mm;top:1.4mm;bottom:1mm;width:.5mm;background:linear-gradient(var(--primary),color-mix(in srgb,var(--primary) 15%,transparent))}
.step{position:relative;margin-bottom:calc(4mm * var(--k));break-inside:avoid}
.step::before{content:"";position:absolute;left:-7mm;top:.4mm;width:3.7mm;height:3.7mm;border-radius:50%;background:var(--ground);border:.6mm solid var(--primary)}
.step:first-child::before{background:var(--accent);border-color:var(--accent);box-shadow:0 0 0 1mm color-mix(in srgb,var(--accent) 25%,transparent)}
.bul li{position:relative;padding-left:3.6mm;margin-bottom:1mm}
.bul li::before{content:"";position:absolute;left:0;top:.62em;width:1.6mm;height:.5mm;background:var(--accent)}
.proj{margin-bottom:calc(3.6mm * var(--k));padding:2.6mm 3.4mm;border:.3mm solid var(--line);border-radius:2.4mm;break-inside:avoid}
.ph{display:flex;justify-content:space-between;gap:3mm;align-items:baseline}

.nums{display:grid;gap:2.4mm;margin-bottom:calc(5.4mm * var(--k))}
.nums > div{padding:2.6mm 3.4mm;border-radius:2.4mm;background:var(--primary);color:var(--ground)}
.mv{font:700 calc(18pt * var(--k))/1 '${f.head}',sans-serif;margin:0 0 .8mm;color:var(--ground)}
.mv small{font-size:calc(8pt * var(--k));margin-left:1mm;color:var(--accent)}
.ml{font-size:calc(7.8pt * var(--k));margin:0;opacity:.85}
.sg{font-weight:600;margin:1.6mm 0 1mm}
.skills li{display:flex;justify-content:space-between;align-items:center;gap:3mm;padding:.9mm 0;border-bottom:.25mm dashed var(--line)}
.dots{display:inline-flex;gap:.8mm;flex:none}
.dots i{width:1.8mm;height:1.8mm;border-radius:.5mm;background:var(--line)}
.dots i.on{background:var(--primary)}
.dots i.on:last-of-type{background:var(--primary)}
.edu{margin-bottom:2.6mm}
.small{font-size:calc(8pt * var(--k))}
.plain li{margin-bottom:1.6mm}
.plain span{display:block;color:var(--muted);font-size:calc(8pt * var(--k))}
.qr{display:flex;gap:3mm;align-items:center;margin-top:calc(4mm * var(--k));padding:2.6mm;border:.3mm solid var(--line);border-radius:2.4mm}
.qr svg{width:19mm;height:19mm;flex:none}
.qr p{margin:0;font-size:calc(7.6pt * var(--k));color:var(--muted)}
.qr b{color:var(--ink);word-break:break-all}
</style></head><body>
<header class="head"><div>
  <div class="kicker">${showPhoto ? `<img class="photo" src="${esc(photoUrl)}" alt="">` : ''}<span class="mono">${esc(mono)}</span>${b.positioning ? `<p class="pos">${esc(pick(b.positioning, lang))}</p>` : ''}</div>
  <h1>${esc(p.fullName)}</h1><p class="headline">${esc(pick(p.headline, lang))}</p></div>
  <div class="plate">${figure}</div>
</header>
<div class="bar">${contactItems.map(([v, href]) => `<span>${href ? `<a href="${esc(href)}">${esc(v)}</a>` : esc(v)}</span>`).join('')}</div>
<div class="cols" style="min-height:${pages > 1 ? 0 : 1}px"><main>${left}</main><aside>${right}</aside></div>
</body></html>`;
}
