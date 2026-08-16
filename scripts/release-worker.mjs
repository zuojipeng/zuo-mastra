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
  npm run release:worker -- --deploy [--apply-schema] --allow-production-smoke
  npm run release:worker -- --smoke-only [--allow-production-smoke]

Environment:
  CLOUDFLARE_API_TOKEN     Optional when Wrangler login session is available
  PROJECTS_API_BASE_URL    Required for deploy and smoke-only modes
`);
}

if (args.has('--help') || args.size === 0) {
  usage();
  process.exit(args.has('--help') ? 0 : 2);
}

const dryRun = args.has('--dry-run');
const deploy = args.has('--deploy');
const applySchema = args.has('--apply-schema');
const smokeOnly = args.has('--smoke-only');
const allowProductionSmoke = args.has('--allow-production-smoke');

if ([dryRun, deploy, smokeOnly].filter(Boolean).length !== 1) {
  console.error('Choose exactly one mode: --dry-run, --deploy, or --smoke-only.');
  usage();
  process.exit(2);
}

if (applySchema && !deploy) {
  console.error('--apply-schema can only be used with --deploy.');
  process.exit(2);
}

if ((deploy || smokeOnly) && !process.env.PROJECTS_API_BASE_URL) {
  console.error('PROJECTS_API_BASE_URL is required before deploy or smoke-only execution.');
  process.exit(2);
}

if (deploy && !allowProductionSmoke) {
  console.error('--deploy requires --allow-production-smoke for the post-deploy production check.');
  process.exit(2);
}

function runProjectsSmoke() {
  const smokeArgs = ['run', 'test:projects'];
  if (allowProductionSmoke) smokeArgs.push('--', '--allow-production');
  run('npm', smokeArgs);
}

if (dryRun) {
  run('npm', ['run', 'check']);
  run('npx', ['--yes', 'wrangler', 'deploy', '--dry-run', '--outdir', '/private/tmp/prompt-optimizer-worker-dry-run']);
  process.exit(0);
}

if (smokeOnly) {
  runProjectsSmoke();
  process.exit(0);
}

run('npm', ['run', 'check']);
run('npx', ['--yes', 'wrangler', 'deploy']);

if (applySchema) {
  run('npx', ['--yes', 'wrangler', 'd1', 'execute', 'prompt-optimizer-db', '--remote', '--file=schema.sql']);
}

runProjectsSmoke();
