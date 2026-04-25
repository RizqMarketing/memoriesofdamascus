const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git'].includes(e.name)) continue;
      walk(full, out);
    } else if (/\.(png|jpe?g)$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk('.');
let deleted = 0, kept = 0;
const keptList = [];
for (const f of files) {
  const webp = f.replace(/\.(png|jpe?g)$/i, '.webp');
  if (fs.existsSync(webp)) {
    fs.unlinkSync(f);
    deleted++;
  } else {
    kept++;
    keptList.push(f);
  }
}
console.log('verwijderd:', deleted);
console.log('gehouden (geen .webp counterpart):', kept);
for (const f of keptList) console.log('  -', f);
