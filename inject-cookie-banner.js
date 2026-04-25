const fs = require('fs');

const snippet = fs.readFileSync('cookie-banner-snippet.html', 'utf8');
// Strip de <!-- comment header — alleen de daadwerkelijke HTML/JS injecteren
const html = snippet.replace(/^<!--[\s\S]*?-->\n?/, '').trim();

const targets = ['index.html', 'morgenland/index.html', 'kookworkshops/index.html'];

for (const file of targets) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('id="cookieBanner"')) {
    console.log(file, '— banner zit er al, skip');
    continue;
  }
  content = content.replace('</body>', html + '\n\n</body>');
  fs.writeFileSync(file, content, 'utf8');
  console.log(file, '— banner geplaatst');
}
