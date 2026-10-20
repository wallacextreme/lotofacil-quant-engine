async function main() {
  const html = await fetch('http://localhost:4173/').then((r) => r.text());
  const assetMatches = html.match(/\/assets\/[^"'\s]+/g) || [];
  const uniqueAssets = Array.from(new Set(assetMatches));

  console.log(`Checking ${uniqueAssets.length} assets...`);
  let allOk = true;
  for (const asset of uniqueAssets) {
    const res = await fetch(`http://localhost:4173${asset}`);
    const ok = res.status === 200;
    console.log(`- ${asset}: ${res.status} [${res.headers.get('content-type')}]`);
    if (!ok) allOk = false;
  }

  // Also check manifest and sw.js
  for (const extra of ['/manifest.json', '/sw.js', '/icons/icon.svg']) {
    const res = await fetch(`http://localhost:4173${extra}`);
    console.log(`- ${extra}: ${res.status} [${res.headers.get('content-type')}]`);
    if (res.status !== 200) allOk = false;
  }

  if (!allOk) {
    console.error('Some assets failed to load!');
    process.exit(1);
  }
  console.log('All static assets and endpoints verified 200 OK!');
}

main().catch(console.error);
