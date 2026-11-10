/*
 * Fetch the current citi.com homepage HTML and compare its visible text /
 * campaign content with the existing mirror.
 */
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

(async () => {
  const res = await fetch('https://www.citi.com/', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  console.log('status', res.status, 'content-type', res.headers.get('content-type'));
  const html = await res.text();
  console.log('bytes', html.length);
  fs.writeFileSync('real-home-current.html', html);

  const checks = [
    'Earn 50,000',
    'AAdvantage',
    'Choose the right',
    'HP_20382_Hero',
    'HP_18285_Hero',
    'Greater for Balance',
    'Great for Balance',
    'Citi Premium Boost',
    'HP_19886_GPA'
  ];
  for (const c of checks) console.log('  ' + JSON.stringify(c) + ' -> ' + (html.split(c).length - 1));

  const mirror = fs.readFileSync('public/index.html', 'utf8');
  console.log('\n--- mirror ---');
  for (const c of checks) console.log('  ' + JSON.stringify(c) + ' -> ' + (mirror.split(c).length - 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
