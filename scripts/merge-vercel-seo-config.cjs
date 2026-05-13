const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const vercelPath = path.join(projectRoot, 'vercel.json');

let config = {};
if (fs.existsSync(vercelPath)) {
  try {
    config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  } catch (err) {
    console.error('Could not parse existing vercel.json:', err.message);
    process.exit(1);
  }
}

config.rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];

const spaRewrite = {
  source: '/((?!api/.*|.*\\..*).*)',
  destination: '/index.html'
};

const hasSpaRewrite = config.rewrites.some((rule) =>
  rule.source === spaRewrite.source && rule.destination === spaRewrite.destination
);

if (!hasSpaRewrite) {
  config.rewrites.push(spaRewrite);
}

config.headers = Array.isArray(config.headers) ? config.headers : [];

const securityHeaderSource = '/(.*)';
const existingSecurity = config.headers.find((h) => h.source === securityHeaderSource);

const requiredHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' }
];

if (existingSecurity) {
  existingSecurity.headers = Array.isArray(existingSecurity.headers) ? existingSecurity.headers : [];
  for (const header of requiredHeaders) {
    if (!existingSecurity.headers.some((h) => h.key.toLowerCase() === header.key.toLowerCase())) {
      existingSecurity.headers.push(header);
    }
  }
} else {
  config.headers.push({
    source: securityHeaderSource,
    headers: requiredHeaders
  });
}

fs.writeFileSync(vercelPath, JSON.stringify(config, null, 2) + '\n');
console.log('Updated vercel.json with SPA rewrite and safe headers.');
