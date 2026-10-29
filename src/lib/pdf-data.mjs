// Menyiapkan data untuk PDF: varian per lowongan, kontak privat, alamat web.
import { execSync } from 'node:child_process';

const clone = (x) => JSON.parse(JSON.stringify(x));

// Varian (add-on) hanya menimpa bagian tertentu; sisanya ikut data utama.
export function applyVariant(data, variantId) {
  if (!variantId) return data;
  const v = (data.variants ?? []).find((x) => x.id === variantId);
  if (!v) throw new Error(`Varian "${variantId}" tidak ada di cv.json (variants[].id)`);
  const d = clone(data);
  if (v.headline) d.profile.headline = v.headline;
  if (v.summary) d.profile.summary = v.summary;
  if (v.achievementOrder?.length) {
    const rank = new Map(v.achievementOrder.map((id, i) => [id, i]));
    for (const group of [d.experience ?? [], d.organizations ?? []]) {
      for (const e of group) {
        e.achievements = (e.achievements ?? []).filter((a) => rank.has(a.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
      }
    }
  }
  if (v.extraKeywords?.length && d.skills?.groups?.length) {
    const have = new Set(d.skills.groups.flatMap((g) => g.items.map((i) => i.name.toLowerCase())));
    const add = v.extraKeywords.filter((k) => !have.has(k.toLowerCase())).map((name) => ({ name }));
    d.skills.groups[0].items.push(...add);
  }
  return d;
}

// Kontak dari file privat. Hanya dicetak di PDF, tidak pernah ke web.
export function contactFrom(priv, data) {
  if (!priv) return null;
  if (priv.slug !== data.meta.slug) throw new Error(`slug file privat ("${priv.slug}") tidak sama dengan meta.slug ("${data.meta.slug}")`);
  const c = priv.contact ?? {};
  return {
    email: c.email,
    phone: c.showPhoneOnPdf === false ? null : c.phone,
    city: c.cityLine || [data.profile.location?.city].filter(Boolean).join(''),
  };
}

function gitRemoteRepo() {
  try {
    const url = execSync('git remote get-url origin', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const m = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    return m ? `${m[1]}/${m[2]}` : null;
  } catch {
    return null;
  }
}

// Alamat web CV untuk QR dan baris kontak PDF. Urutan: --site-url, domain sendiri,
// akun GitHub klien di file privat, lalu repo tempat skrip ini dijalankan.
export function webUrlFor(data, priv, explicit) {
  if (data.outputs?.web?.enabled === false) return null;
  const slash = (u) => (u.endsWith('/') ? u : `${u}/`);
  if (explicit) return slash(explicit);
  if (data.outputs?.web?.customDomain) return `https://${data.outputs.web.customDomain}/`;
  const gh = priv?.github;
  const repo = gh?.username && gh?.repo ? `${gh.username}/${gh.repo}` : (process.env.GITHUB_REPOSITORY || gitRemoteRepo());
  if (!repo) return null;
  const [owner, name] = repo.split('/');
  const host = `${owner.toLowerCase()}.github.io`;
  return name.toLowerCase() === host ? `https://${host}/` : `https://${host}/${name}/`;
}
