// Pemeriksaan sebelum build: skema, privasi, dan placeholder.
// Repo GitHub Pages di akun gratis bersifat publik, jadi data kontak pribadi
// tidak boleh masuk ke repo sama sekali. Build gagal kalau ada yang lolos.
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(new URL('../../schema/cv.schema.json', import.meta.url), 'utf8'));

export const FORBIDDEN_KEYS = ['email', 'phone', 'whatsapp', 'wa', 'telepon', 'hp', 'address', 'alamat', 'nik', 'ktp', 'npwp', 'birthdate', 'tanggallahir'];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/;
// Nomor HP Indonesia: 08xx / +62 8xx / 62 8xx, boleh dipisah spasi, titik, atau strip.
const PHONE = /(?:\+?62[\s.-]?|\b0)8\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,5}\b/;
const WHATSAPP_LINK = /(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)/i;
const PLACEHOLDER = /^\[.*\]$/;

let validate;
function validator() {
  if (!validate) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    validate = ajv.compile(schema);
  }
  return validate;
}

function walk(node, path, visit) {
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`, visit));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      visit({ key: k, value: v, path: `${path}.${k}` });
      walk(v, `${path}.${k}`, visit);
    }
  }
}

export function checkCv(data) {
  const errors = [];
  const warnings = [];

  const ok = validator()(data);
  if (!ok) {
    for (const e of validator().errors) {
      errors.push(`${'$' + e.instancePath.replaceAll('/', '.')}: ${e.message}`);
    }
  }

  walk(data, '$', ({ key, value, path }) => {
    if (key === '$schema') return;
    if (FORBIDDEN_KEYS.includes(key.toLowerCase())) {
      errors.push(`${path}: data kontak pribadi tidak boleh ada di repo publik`);
    }
    if (typeof value === 'string') {
      if (EMAIL.test(value)) errors.push(`${path}: berisi alamat email`);
      if (PHONE.test(value)) errors.push(`${path}: berisi nomor HP`);
      if (WHATSAPP_LINK.test(value)) errors.push(`${path}: berisi tautan WhatsApp`);
      if (PLACEHOLDER.test(value.trim())) errors.push(`${path}: masih placeholder "${value}"`);
    }
  });

  const web = data?.outputs?.web ?? {};
  if (web.enabled === false) warnings.push('outputs.web.enabled = false: web tetap dibangun, tapi paket ini mungkin tidak termasuk web CV');
  if (web.analytics && web.analytics.provider !== 'none') warnings.push('outputs.web.analytics belum didukung template ini, diabaikan');
  if (data?.profile?.contactForm && data.profile.contactForm.provider !== 'none') warnings.push('profile.contactForm belum didukung template ini, kontak memakai tautan profil');

  return { errors, warnings };
}
