const fs = require('fs');

// Files we converted to .webp - we should rewrite refs to these
const KEEP_PNG = new Set(['logo.png', 'logo-horizontal.png']);
// note: KEEP_PNG values must include the extension (e.g. 'logo.png')

const targets = [
  'index.html',
  'morgenland/index.html',
  'kookworkshops/index.html',
];

function rewriteExt(html) {
  // Rewrite img src and CSS url() refs ending in .png/.jpg/.jpeg to .webp,
  // but skip logos and data: URIs.
  let count = 0;
  const replaced = html.replace(
    /((?:src=|url\()['"]?)([^'"()\s>]+?)\.(png|jpe?g)(['"]?)/gi,
    (match, prefix, filepath, ext, suffix) => {
      if (filepath.startsWith('data:')) return match;
      const basename = filepath.split('/').pop();
      if (KEEP_PNG.has(basename + '.' + ext.toLowerCase())) return match;
      count++;
      return prefix + filepath + '.webp' + suffix;
    }
  );
  return { html: replaced, count };
}

function addLazyToGcImg(html) {
  // Add loading="lazy" to all <img class="gc-img" ...> that don't already have it
  let count = 0;
  const replaced = html.replace(
    /<img\s+([^>]*class="gc-img"[^>]*)>/gi,
    (match, attrs) => {
      if (/loading\s*=/i.test(attrs)) return match;
      count++;
      return `<img loading="lazy" ${attrs}>`;
    }
  );
  return { html: replaced, count };
}

for (const file of targets) {
  if (!fs.existsSync(file)) { console.log(`skip (niet gevonden): ${file}`); continue; }
  const original = fs.readFileSync(file, 'utf8');
  const { html: extDone, count: extCount } = rewriteExt(original);
  const { html: final, count: lazyCount } = addLazyToGcImg(extDone);

  if (final === original) {
    console.log(`${file}: geen wijzigingen`);
    continue;
  }
  fs.writeFileSync(file, final, 'utf8');
  console.log(`${file}: ${extCount} ext-rewrites, ${lazyCount} loading="lazy" toegevoegd`);
}
