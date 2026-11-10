// Add Netlify GitHub commit-status notification hooks (deploy_created/deploy_failed/deploy_building)
const { execFileSync } = require('child_process');
const SITE_ID = 'afe76a9b-510d-4979-aa26-884f41b7ab7a';
const NETLIFY_JS = 'C:\\Users\\SAM\\AppData\\Roaming\\npm\\node_modules\\netlify-cli\\bin\\run.js';

const nl = (method, data) =>
  JSON.parse(
    execFileSync(process.execPath, [NETLIFY_JS, 'api', method, '--data', JSON.stringify({ site_id: SITE_ID, ...data })], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  );

// token comes from the local gh keyring; never printed
const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();

const existing = nl('listHooksBySiteId');
const EVENTS = ['deploy_created', 'deploy_failed', 'deploy_building'];

for (const event of EVENTS) {
  const found = existing.find((h) => h.type === 'github_commit_status' && h.event === event);
  try {
    if (found && !found.disabled) {
      nl('updateHook', { hook_id: found.id, body: { data: { access_token: token } } });
      console.log(`updated hook for ${event} (${found.id})`);
    } else {
      const created = nl('createHookBySiteId', {
        body: { type: 'github_commit_status', event, data: { access_token: token } },
      });
      console.log(`created hook for ${event} (${created.id})`);
    }
  } catch (e) {
    console.log(`FAILED ${event}: ${String(e.stdout || '') || String(e.stderr || e.message).slice(0, 200)}`);
  }
}
