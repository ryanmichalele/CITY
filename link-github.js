// Link GitHub repo ryanmichalele/CITY to Netlify site city-bank-ca (mirrors netlify-cli's configGithub)
const { execFileSync } = require('child_process');

const SITE_ID = 'afe76a9b-510d-4979-aa26-884f41b7ab7a';
const REPO_OWNER = 'ryanmichalele';
const REPO_NAME = 'CITY';
const NETLIFY_JS = 'C:\\Users\\SAM\\AppData\\Roaming\\npm\\node_modules\\netlify-cli\\bin\\run.js';

const nl = (method, data) =>
  JSON.parse(
    execFileSync(process.execPath, [NETLIFY_JS, 'api', method, '--data', JSON.stringify({ site_id: SITE_ID, ...data })], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  );

const gh = (args) =>
  JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

const ghJson = (args, body) =>
  JSON.parse(
    execFileSync('gh', [...args, '--input', '-'], {
      encoding: 'utf8',
      input: JSON.stringify(body),
      maxBuffer: 64 * 1024 * 1024,
    }),
  );

// 1. Netlify deploy key
let keys = nl('listDeployKeys');
if (!keys.length) keys = [nl('createDeployKey')];
const deployKey = keys[0];
console.log('1. Netlify deploy key:', deployKey.id);

// 2. Add deploy key to GitHub repo
try {
  const added = gh(['api', '--method', 'POST', `repos/${REPO_OWNER}/${REPO_NAME}/keys`,
    '-f', `title=Netlify Deploy Key`, '-f', `key=${deployKey.public_key}`, '-F', 'read_only=true']);
  console.log('2. GitHub deploy key added:', added.id);
} catch (e) {
  const msg = String(e.stdout || '') + String(e.stderr || '');
  if (msg.includes('key is already in use') || msg.includes('has already been taken')) {
    console.log('2. GitHub deploy key already present');
  } else {
    throw e;
  }
}

// 3. Repo info
const repo = gh(['api', `repos/${REPO_OWNER}/${REPO_NAME}`]);
console.log('3. Repo:', repo.full_name, 'id=', repo.id, 'branch=', repo.default_branch);

// 4. Attach repo to Netlify site (this also creates the site deploy_hook)
const updated = nl('updateSite', {
  body: {
    repo: {
      id: repo.id,
      provider: 'github',
      repo_path: repo.full_name,
      repo_branch: repo.default_branch,
      allowed_branches: [repo.default_branch],
      deploy_key_id: deployKey.id,
      base: '',
      dir: 'public',
      functions_dir: 'netlify/functions',
      cmd: '# no build command',
    },
  },
});
console.log('4. Site repo attached:', JSON.stringify(updated.repo));

// verify it actually persisted
const check = nl('getSite');
console.log('4b. VERIFY site.repo =', JSON.stringify(check.repo));
console.log('4c. VERIFY build_settings =', JSON.stringify(check.build_settings));
console.log('4d. VERIFY deploy_hook =', check.deploy_hook);

// 5. GitHub webhook -> Netlify deploy hook
const deployHook = updated.deploy_hook || check.deploy_hook;
if (deployHook) {
  const hooks = gh(['api', `repos/${REPO_OWNER}/${REPO_NAME}/hooks`, '--paginate']);
  const exists = hooks.some((h) => h.config && h.config.url === deployHook);
  if (exists) {
    console.log('5. GitHub webhook already present');
  } else {
    const hook = ghJson(
      ['api', '--method', 'POST', `repos/${REPO_OWNER}/${REPO_NAME}/hooks`],
      {
        name: 'web',
        config: { url: deployHook, content_type: 'json' },
        events: ['push', 'pull_request', 'delete'],
        active: true,
      },
    );
    console.log('5. GitHub webhook created:', hook.id, '->', deployHook);
  }
} else {
  console.log('5. SKIPPED: site.deploy_hook is null');
}
