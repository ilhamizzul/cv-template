// Pemeriksaan cepat tanpa build: npm run check [path/ke/cv.json]
import { readFileSync } from 'node:fs';
import { checkCv } from './lib/check.mjs';

const file = process.argv[2] || 'data/cv.json';
const { errors, warnings } = checkCv(JSON.parse(readFileSync(file, 'utf8')));
console.log(file);
warnings.forEach((w) => console.log(`  ! ${w}`));
errors.forEach((e) => console.log(`  ✗ ${e}`));
if (!errors.length) console.log('  ✓ lolos: skema valid, tidak ada data kontak pribadi');
process.exit(errors.length ? 1 : 0);
