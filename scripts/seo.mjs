import { readFile, writeFile } from 'node:fs/promises';

const raw = process.env.SITE_URL;
if (raw) {
  const site = new URL(raw);
  if (site.protocol !== 'https:') throw new Error('SITE_URL must be an HTTPS URL.');
  if (site.username || site.password) throw new Error('SITE_URL must not contain credentials.');
  site.search = '';
  site.hash = '';
  if (!site.pathname.endsWith('/')) site.pathname += '/';
  const url = site.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const html = await readFile('dist/index.html', 'utf8');
  await writeFile(
    'dist/index.html',
    html.replace(
      '</head>',
      `<link rel="canonical" href="${url}"/><meta property="og:url" content="${url}"/></head>`,
    ),
  );
  await writeFile(
    'dist/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>`,
  );
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.href}sitemap.xml\n`);
  console.log(`SEO files generated for ${site.href}`);
} else {
  await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\n');
  console.log(
    'SITE_URL not set; domain-specific SEO files will be generated after a domain is configured.',
  );
}
