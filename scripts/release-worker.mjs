import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));

function run(command, commandArgs, options = {}) {
  console.log(`\n$ ${[command, ...commandArgs].join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function usage() {
  console.log(`Usage:
  npm run release:worker -- --dry-run
  npm run release:worker -- --deploy [--apply-schema]
  npm run release:worker -- --smoke-only

Environment:
  CLOUDFLARE_API_TOKEN     Required for --deploy and --apply-schema
  PROJECTS_API_BASE_URL    Optional smoke base URL
`);
}

function requireCloudflareToken() {
  if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    console.error('CLOUDFLARE_API_TOKEN is required for deploy/schema actions.');
    process.exit(2);
  }
}

if (args.has('--help') || args.size === 0) {
  usage();
  process.exit(args.has('--help') ? 0 : 2);
}

const dryRun = args.has('--dry-run');
const deploy = args.has('--deploy');
const applySchema = args.has('--apply-schema');
const smokeOnly = args.has('--smoke-only');

if ([dryRun, deploy, smokeOnly].filter(Boolean).length !== 1) {
  console.error('Choose exactly one mode: --dry-run, --deploy, or --smoke-only.');
  usage();
  process.exit(2);
}

if (applySchema && !deploy) {
  console.error('--apply-schema can only be used with --deploy.');
  process.exit(2);
}

if (dryRun) {
  run('npm', ['run', 'check']);
  run('npx', ['--yes', 'wrangler', 'deploy', '--dry-run', '--outdir', '/private/tmp/prompt-optimizer-worker-dry-run']);
  process.exit(0);
}

if (smokeOnly) {
  run('npm', ['run', 'test:projects']);
  process.exit(0);
}

requireCloudflareToken();
run('npm', ['run', 'check']);
run('npx', ['--yes', 'wrangler', 'deploy']);

if (applySchema) {
  run('npx', ['--yes', 'wrangler', 'd1', 'execute', 'prompt-optimizer-db', '--remote', '--file=schema.sql']);
}

run('npm', ['run', 'test:projects']);

