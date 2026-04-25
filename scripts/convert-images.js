const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SKIP = new Set([
  'morgenland/logo.png',
  'morgenland/logo-horizontal.png',
]);

const HERO_PATTERNS = [
  /^baklava\.png$/,
  /^sfeerimpressie\.jpg$/,
  /^hero-buffet\.jpg$/,
  /coffee-hero\.png$/,
  /kookworkshops\/.+\.png$/,
];

function isHero(rel) { return HERO_PATTERNS.some(p => p.test(rel)); }

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

(async () => {
  const files = walk('.');
  let totalBefore = 0, totalAfter = 0, converted = 0, skipped = 0;

  for (const file of files) {
    const rel = path.relative('.', file).replace(/\\/g, '/');
    if (SKIP.has(rel)) { skipped++; continue; }

    const out = file.replace(/\.(png|jpe?g)$/i, '.webp');
    if (fs.existsSync(out)) {
      const beforeSize = fs.statSync(file).size;
      const afterSize = fs.statSync(out).size;
      totalBefore += beforeSize;
      totalAfter += afterSize;
      continue;
    }

    const hero = isHero(rel);
    const maxSize = hero ? 1600 : 800;
    const quality = hero ? 82 : 80;

    try {
      await sharp(file)
        .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toFile(out);

      const beforeSize = fs.statSync(file).size;
      const afterSize = fs.statSync(out).size;
      totalBefore += beforeSize;
      totalAfter += afterSize;
      converted++;
      console.log(`  ${rel}: ${(beforeSize/1024).toFixed(0)}KB -> ${(afterSize/1024).toFixed(0)}KB (${(100-afterSize/beforeSize*100).toFixed(0)}%)`);
    } catch (e) {
      console.error(`FAILED ${rel}:`, e.message);
    }
  }

  console.log('\n=== TOTAAL ===');
  console.log(`bestanden geconverteerd: ${converted}`);
  console.log(`bestanden overgeslagen:  ${skipped}`);
  console.log(`origineel totaal: ${(totalBefore/1024/1024).toFixed(1)}MB`);
  console.log(`webp totaal:      ${(totalAfter/1024/1024).toFixed(1)}MB`);
  console.log(`reductie:         ${(100-totalAfter/totalBefore*100).toFixed(1)}%`);
})();
