// Menyusun halaman HTML dari cv.json. Semua teks dari data di-escape.
import { UI, pick, formatPeriod, formatYm } from './i18n.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FONTS = {
  geometric: { head: 'Sora', body: 'Plus Jakarta Sans', css: 'family=Sora:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700' },
  humanist: { head: 'Source Sans 3', body: 'Source Sans 3', css: 'family=Source+Sans+3:wght@400;500;600;700' },
  serif: { head: 'Newsreader', body: 'Source Sans 3', css: 'family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Source+Sans+3:wght@400;500;600' },
  mono: { head: 'JetBrains Mono', body: 'Plus Jakarta Sans', css: 'family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600' },
};

export const LINK_LABEL = { portfolio: 'Portfolio', linkedin: 'LinkedIn', github: 'GitHub', gitlab: 'GitLab', behance: 'Behance', dribbble: 'Dribbble', medium: 'Medium', youtube: 'YouTube', instagram: 'Instagram', website: 'Website', other: 'Link' };

export const DEFAULT_SECTIONS = ['hero', 'highlights', 'experience', 'projects', 'skills', 'education', 'contact'];

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0].toUpperCase()).join('');
}

export const linkLabel = (l) => l.label || LINK_LABEL[l.type] || 'Link';
export const hostOf = (u) => { try { const x = new URL(u); return (x.host + x.pathname).replace(/^www\./, '').replace(/\/$/, ''); } catch { return u; } };

function linksList(links, cls = 'links') {
  if (!links?.length) return '';
  return `<ul class="${cls}">${links.map((l) => `<li><a href="${esc(l.url)}" rel="noopener me" target="_blank"><span class="lk-type">${esc(linkLabel(l))}</span><span class="lk-host">${esc(hostOf(l.url))}</span></a></li>`).join('')}</ul>`;
}

// Hanya metrik yang sudah dikonfirmasi klien yang boleh tampil.
export const verifiedMetrics = (ms) => (ms ?? []).filter((m) => m.verified === true);

export function metricText(m, lang) {
  const n = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID').format(m.value);
  return { value: m.unit === '%' ? `${n}%` : n, unit: m.unit === '%' ? '' : (m.unit ?? ''), label: pick(m.label, lang) };
}

function sectionHead(id, lang, n) {
  return `<header class="sec-head"><span class="sec-no">${String(n).padStart(2, '0')}</span><h2>${esc(UI[lang][id])}</h2></header>`;
}

function hero(ctx) {
  const { data, lang, t, rel } = ctx;
  const p = data.profile;
  const b = data.brand;
  const loc = p.location;
  const where = [loc?.city, loc?.country].filter(Boolean).join(', ');
  const photo = ctx.photo ? `<img class="photo" src="${rel}${esc(ctx.photo)}" alt="${esc(p.fullName)}" width="96" height="96">` : '';
  const actions = [
    ctx.sections.includes('experience') ? `<a class="btn" href="#experience">${t.seeExperience}</a>` : '',
    ctx.hasPdf ? `<a class="btn ghost" href="${rel}cv.pdf" download>${t.downloadPdf}</a>` : '',
  ].join('');
  return `<section id="hero" class="hero">
  <div class="hero-text">
    ${photo ? `<div class="id-row">${photo}</div>` : ''}
    <h1>${esc(p.fullName)}</h1>
    <p class="headline">${esc(pick(p.headline, lang))}</p>
    ${b.positioning ? `<p class="positioning">${esc(pick(b.positioning, lang))}</p>` : ''}
    <p class="summary">${esc(pick(p.summary, lang))}</p>
    <p class="meta">${where ? `<span>${esc(where)}</span>` : ''}${loc?.openToRemote ? `<span>${t.openToRemote}</span>` : ''}</p>
    ${linksList(p.links, 'links inline')}
    ${actions ? `<div class="actions">${actions}</div>` : ''}
  </div>
  <figure class="figure ${b.illustration?.mode === 'static' ? '' : 'live'}" tabindex="0">${ctx.figure}</figure>
</section>`;
}

function allAchievements(data) {
  const out = [];
  for (const group of [data.experience ?? [], data.organizations ?? []]) {
    for (const e of group) {
      if (e.confidential) continue;
      for (const a of e.achievements ?? []) out.push({ a, e });
    }
  }
  return out;
}

function highlights(ctx, n) {
  const { data, lang } = ctx;
  const items = allAchievements(data).filter(({ a }) => a.highlight);
  if (!items.length) return '';
  return `<section id="highlights" class="sec">${sectionHead('highlights', lang, n)}
  <div class="hl-grid">${items.map(({ a, e }) => {
    const m = verifiedMetrics(a.metrics)[0];
    const mt = m && metricText(m, lang);
    return `<article class="hl">${mt ? `<p class="hl-num">${esc(mt.value)}<small>${esc(mt.unit)}</small></p><p class="hl-lbl">${esc(mt.label)}</p>` : ''}
      <p class="hl-text">${esc(pick(a.bullet, lang))}</p><p class="hl-src">${esc(pick(e.role, lang))} · ${esc(e.organization)}</p></article>`;
  }).join('')}</div>
</section>`;
}

function role(e, ctx) {
  const { lang, t } = ctx;
  const org = e.organizationUrl && !e.confidential ? `<a href="${esc(e.organizationUrl)}" rel="noopener" target="_blank">${esc(e.organization)}</a>` : esc(e.organization);
  const sub = [e.employmentType ? t.employment[e.employmentType] : '', e.location].filter(Boolean).join(' · ');
  const body = e.confidential
    ? `${e.summary ? `<p>${esc(pick(e.summary, lang))}</p>` : ''}<p class="note">${t.confidential}</p>`
    : `${e.summary ? `<p>${esc(pick(e.summary, lang))}</p>` : ''}${e.achievements?.length ? `<ul class="bullets">${e.achievements.map((a) => `<li>${esc(pick(a.bullet, lang))}</li>`).join('')}</ul>` : ''}`;
  const chips = !e.confidential && e.skills?.length ? `<ul class="chips">${e.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '';
  return `<li class="role"><div class="when">${esc(formatPeriod(e.period, lang))}</div><div class="what">
    <h3>${esc(pick(e.role, lang))}</h3><p class="org">${org}${sub ? ` <span>· ${esc(sub)}</span>` : ''}</p>${body}${chips}</div></li>`;
}

function experience(ctx, n) {
  const { data, lang, t } = ctx;
  const exp = data.experience ?? [];
  const org = data.organizations ?? [];
  if (!exp.length && !org.length) return '';
  return `<section id="experience" class="sec">${sectionHead('experience', lang, n)}
  ${exp.length ? `<ol class="timeline">${exp.map((e) => role(e, ctx)).join('')}</ol>` : ''}
  ${org.length ? `<h3 class="sub">${t.organizations}</h3><ol class="timeline">${org.map((e) => role(e, ctx)).join('')}</ol>` : ''}
</section>`;
}

function caseBlock(cs, lang, t) {
  const ms = verifiedMetrics(cs.metrics).map((m) => metricText(m, lang));
  return `${ms.length ? `<div class="hl-grid">${ms.map((m) => `<article class="hl"><p class="hl-num">${esc(m.value)}<small>${esc(m.unit)}</small></p><p class="hl-lbl">${esc(m.label)}</p></article>`).join('')}</div>` : ''}
  <dl class="case">${['problem', 'approach', 'outcome'].filter((k) => cs[k]).map((k) => `<dt>${t[k]}</dt><dd>${esc(pick(cs[k], lang))}</dd>`).join('')}</dl>
  ${(cs.images ?? []).map((im) => `<img class="case-img" src="${esc(im.src)}" alt="${esc(im.alt)}" loading="lazy">`).join('')}`;
}

function projects(ctx, n) {
  const { data, lang, t, multi } = ctx;
  const ps = data.projects ?? [];
  if (!ps.length) return '';
  return `<section id="projects" class="sec">${sectionHead('projects', lang, n)}
  <div class="cards">${ps.map((p) => {
    const showCase = p.caseStudy && !p.confidential;
    return `<article class="card"><p class="card-meta">${[pick(p.role, lang), formatPeriod(p.period, lang)].filter(Boolean).map(esc).join(' · ')}</p>
    <h3>${esc(p.name)}</h3><p>${esc(pick(p.description, lang))}</p>
    ${p.highlights?.length ? `<ul class="bullets">${p.highlights.map((h) => `<li>${esc(pick(h, lang))}</li>`).join('')}</ul>` : ''}
    ${p.tech?.length ? `<ul class="chips">${p.tech.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${!p.confidential ? linksList(p.links, 'links inline small') : ''}
    ${showCase && multi ? `<a class="more" href="${ctx.caseHref(p.id)}">${t.readCase} →</a>` : ''}
    ${showCase && !multi && !ctx.sections.includes('case-studies') ? `<details class="case-inline"><summary>${t.readCase}</summary>${caseBlock(p.caseStudy, lang, t)}</details>` : ''}
    </article>`;
  }).join('')}</div>
</section>`;
}

function caseStudies(ctx, n) {
  const { data, lang, t, multi } = ctx;
  if (multi) return '';
  const ps = (data.projects ?? []).filter((p) => p.caseStudy && !p.confidential);
  if (!ps.length) return '';
  return `<section id="case-studies" class="sec">${sectionHead('case-studies', lang, n)}
  ${ps.map((p) => `<article class="case-wrap"><h3>${esc(p.name)}</h3>${caseBlock(p.caseStudy, lang, t)}</article>`).join('')}
</section>`;
}

function skills(ctx, n) {
  const { data, lang, t } = ctx;
  const groups = data.skills?.groups ?? [];
  const langs = data.languages ?? [];
  return `<section id="skills" class="sec">${sectionHead('skills', lang, n)}
  <div class="skill-grid">${groups.map((g) => `<div class="skill-group"><h3>${esc(pick(g.name, lang))}</h3><ul>${g.items.map((s) => `<li><span>${esc(s.name)}</span>${s.level ? `<span class="lvl lvl-${s.level}" title="${t.levels[s.level]}">${t.levels[s.level]}</span>` : ''}</li>`).join('')}</ul></div>`).join('')}
  ${langs.length ? `<div class="skill-group"><h3>${t.languages}</h3><ul>${langs.map((l) => `<li><span>${esc(l.name)}</span><span class="lvl">${esc(t.langLevels[l.level])}${l.certificate ? ` · ${esc(l.certificate)}` : ''}</span></li>`).join('')}</ul></div>` : ''}
  </div>
</section>`;
}

function education(ctx, n) {
  const { data, lang, t } = ctx;
  const ed = data.education ?? [];
  const certs = data.certifications ?? [];
  const awards = data.awards ?? [];
  return `<section id="education" class="sec">${sectionHead('education', lang, n)}
  <ol class="timeline">${ed.map((e) => `<li class="role"><div class="when">${esc(formatPeriod(e.period, lang))}</div><div class="what">
    <h3>${esc([e.degree, pick(e.field, lang)].filter(Boolean).join(' '))}</h3><p class="org">${esc(e.institution)}${e.gpa ? ` <span>· ${t.gpa} ${esc(e.gpa.value.toFixed(2))}/${esc(e.gpa.scale)}</span>` : ''}</p>
    ${e.thesis ? `<p>${t.thesis}: ${esc(pick(e.thesis, lang))}</p>` : ''}
    ${e.highlights?.length ? `<ul class="bullets">${e.highlights.map((h) => `<li>${esc(pick(h, lang))}</li>`).join('')}</ul>` : ''}</div></li>`).join('')}</ol>
  ${certs.length ? `<h3 class="sub">${t.certifications}</h3><ul class="plain">${certs.map((c) => `<li><strong>${esc(c.name)}</strong> · ${esc(c.issuer)}${c.date ? ` · ${esc(formatYm(c.date, lang))}` : ''}${c.credentialUrl ? ` · <a href="${esc(c.credentialUrl)}" rel="noopener" target="_blank">${t.credential}</a>` : ''}</li>`).join('')}</ul>` : ''}
  ${awards.length ? `<h3 class="sub">${t.awards}</h3><ul class="plain">${awards.map((a) => `<li><strong>${esc(pick(a.title, lang))}</strong>${a.issuer ? ` · ${esc(a.issuer)}` : ''}${a.date ? ` · ${esc(formatYm(a.date, lang))}` : ''}${a.description ? `<br>${esc(pick(a.description, lang))}` : ''}</li>`).join('')}</ul>` : ''}
</section>`;
}

function contact(ctx, n) {
  const { data, lang, t } = ctx;
  return `<section id="contact" class="sec contact">${sectionHead('contact', lang, n)}
  <div class="contact-grid"><div><p class="lead">${t.contactLead}</p>${linksList(data.profile.links)}</div>
  ${ctx.qr ? `<figure class="qr">${ctx.qr}<figcaption>${t.scanQr}<br><span>${esc(ctx.siteUrl.replace(/^https?:\/\//, ''))}</span></figcaption></figure>` : ''}</div>
</section>`;
}

const RENDER = { hero, highlights, experience, projects, 'case-studies': caseStudies, skills, education, contact };

function themeCss(brand) {
  const p = brand.palette;
  const f = FONTS[brand.font ?? 'geometric'];
  return `:root{--primary:${p.primary};--accent:${p.accent};--ink:${p.ink ?? '#0F172A'};--ground:${p.ground ?? '#FFFFFF'};--font-head:'${f.head}',system-ui,sans-serif;--font-body:'${f.body}',system-ui,sans-serif}`;
}

function shell(ctx, { title, description, main, navIds, canonicalPath }) {
  const { data, lang, t, rel, locales } = ctx;
  const f = FONTS[data.brand.font ?? 'geometric'];
  const other = locales.find((l) => l !== lang);
  const nav = navIds.filter((id) => id !== 'hero').map((id) => `<a href="${ctx.homeHref}#${id}" data-spy="${id}">${t[id]}</a>`).join('');
  const alternates = locales.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(ctx.siteUrl + ctx.pathFor(l, canonicalPath))}">`).join('');
  const person = {
    '@context': 'https://schema.org', '@type': 'Person', name: data.profile.fullName,
    jobTitle: pick(data.profile.headline, lang), sameAs: (data.profile.links ?? []).map((l) => l.url),
    address: data.profile.location?.city ? { '@type': 'PostalAddress', addressLocality: data.profile.location.city, addressCountry: data.profile.location.country } : undefined,
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(ctx.siteUrl + ctx.pathFor(lang, canonicalPath))}">
<meta name="theme-color" content="${esc(data.brand.palette.ground ?? '#FFFFFF')}">
<link rel="canonical" href="${esc(ctx.siteUrl + ctx.pathFor(lang, canonicalPath))}">
${alternates}
<link rel="icon" href="${rel}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${f.css}&display=swap">
<link rel="stylesheet" href="${rel}assets/site.css">
<link rel="stylesheet" href="${rel}assets/iso.css">
<style>${themeCss(data.brand)}</style>
<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#main">${lang === 'en' ? 'Skip to content' : 'Langsung ke isi'}</a>
<header class="top"><a class="brand" href="${ctx.homeHref}#hero"><span class="brand-mono">${esc(data.brand.monogram || initials(data.profile.fullName))}</span><span class="brand-name">${esc(data.profile.preferredName || data.profile.fullName)}</span></a>
<nav class="nav" aria-label="${t.jumpTo}">${nav}</nav>
${other ? `<a class="lang" href="${ctx.langHref(other, canonicalPath)}" hreflang="${other}" lang="${other}">${other.toUpperCase()}</a>` : ''}</header>
<main id="main">${main}</main>
<footer class="foot"><p>© ${new Date(data.meta.updatedAt).getFullYear()} ${esc(data.profile.fullName)}</p><p><a href="https://glowfolio.github.io/" rel="noopener" target="_blank">${t.made}</a></p></footer>
<details class="mmenu"><summary class="mfab" aria-label="${t.menu}"><span class="bars" aria-hidden="true"></span><span class="lbl">${t.menu}</span></summary>
<div class="msheet"><p class="mtitle">${t.jumpTo}</p><div class="mgrid">${nav}</div>${other ? `<a class="mlang" href="${ctx.langHref(other, canonicalPath)}" hreflang="${other}">${UI[lang].switchLang}</a>` : ''}</div></details>
<script src="${rel}assets/site.js" defer></script>
</body>
</html>
`;
}

export function renderHome(ctx) {
  const { data, lang } = ctx;
  let n = 0;
  const parts = [];
  const navIds = [];
  for (const id of ctx.sections) {
    const fn = RENDER[id];
    if (!fn) continue;
    const html = id === 'hero' ? fn(ctx) : fn(ctx, n + 1);
    if (!html) continue;
    if (id !== 'hero') n += 1;
    parts.push(html);
    navIds.push(id);
  }
  ctx.navIds = navIds;
  const name = data.profile.fullName;
  return shell(ctx, {
    title: `${name} · ${pick(data.profile.headline, lang)}`,
    description: pick(data.profile.summary, lang).slice(0, 160),
    main: parts.join('\n'),
    navIds,
    canonicalPath: '',
  });
}

export function renderCase(ctx, project) {
  const { data, lang, t } = ctx;
  const main = `<section class="sec case-page"><p><a class="more" href="${ctx.homeHref}#projects">← ${t.backHome}</a></p>
  <p class="card-meta">${[pick(project.role, lang), formatPeriod(project.period, lang)].filter(Boolean).map(esc).join(' · ')}</p>
  <h1>${esc(project.name)}</h1><p class="summary">${esc(pick(project.description, lang))}</p>
  ${project.tech?.length ? `<ul class="chips">${project.tech.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
  ${caseBlock(project.caseStudy, lang, t)}
  ${linksList(project.links, 'links inline')}</section>`;
  return shell(ctx, {
    title: `${project.name} · ${data.profile.fullName}`,
    description: pick(project.description, lang).slice(0, 160),
    main,
    navIds: ctx.navIds ?? ctx.sections,
    canonicalPath: `case/${project.id}/`,
  });
}
