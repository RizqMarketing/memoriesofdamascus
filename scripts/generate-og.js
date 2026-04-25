const sharp = require('sharp');

const jobs = [
  { src: 'images/dishes/mezze-buffet.webp', out: 'og-image.jpg' },
  { src: 'morgenland/sfeerimpressie.webp', out: 'morgenland/og-image.jpg' },
  { src: 'kookworkshops/hero-tile.webp', out: 'kookworkshops/og-image.jpg' }
];

(async () => {
  for (const job of jobs) {
    await sharp(job.src)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, progressive: true })
      .toFile(job.out);
    console.log(job.out, 'OK');
  }
})();
