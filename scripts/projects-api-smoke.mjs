const DEFAULT_BASE_URL = 'https://prompt-optimizer.hahazuo460.workers.dev';
const PROJECT_ID = `smoke-project-${Date.now()}`;

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}

async function requestJson(baseUrl, path, options = {}) {
  const { userId = 'projects-api-smoke', ...fetchOptions } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers: {
      'X-User-Id': userId,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json };
}

function assertStep(name, result, predicate) {
  if (!result.ok || !predicate(result.json)) {
    console.error(JSON.stringify({ step: name, status: result.status, response: result.json }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ step: name, status: result.status, ok: true }));
}

function buildWorkspace(status = 'pending', resultNote = '') {
  const now = new Date().toISOString();
  return {
    id: PROJECT_ID,
    title: 'Projects API Smoke',
    creativeInput: '废土小镇里，一个旧清洁机器人守护红裙人偶',
    targetDuration: '30s',
    targetType: 'wasteland',
    v2State: 'result',
    createdAt: now,
    updatedAt: now,
    directorKit: {
      shotCards: [{ shotId: 1 }],
    },
    selectedVersionIndex: 0,
    selectedShotId: 1,
    shotExecutionStatus: { 1: status },
    shotResultNotes: resultNote ? { 1: resultNote } : {},
  };
}

async function main() {
  const baseUrl = normalizeBaseUrl(
    arg('base-url') ?? process.env.PROJECTS_API_BASE_URL ?? DEFAULT_BASE_URL,
  );
  const userId = arg('user-id') ?? process.env.PROJECTS_API_USER_ID ?? `projects-api-smoke-${Date.now()}`;
  console.log(JSON.stringify({ baseUrl, userId, projectId: PROJECT_ID }));

  const health = await requestJson(baseUrl, '/api/health', { userId });
  assertStep('health', health, (json) => json?.status === 'ok');

  const initialList = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep('list:initial', initialList, (json) => json?.success === true && Array.isArray(json?.data?.projects));

  const save = await requestJson(baseUrl, '/api/projects', {
    method: 'POST',
    userId,
    body: JSON.stringify({ workspace: buildWorkspace() }),
  });
  assertStep('save', save, (json) => json?.success === true && json?.data?.id === PROJECT_ID);

  const list = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep(
    'list:blocked',
    list,
    (json) => json?.success === true && json?.data?.projects?.some((project) =>
      project.id === PROJECT_ID &&
      project.handoffReady === false &&
      project.handoffBlockingIssueCount === 1 &&
      project.handoffBlockingReasons?.[0] === '镜头 1 未执行'),
  );

  const update = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify({ workspace: buildWorkspace('usable', 'smoke result note') }),
  });
  assertStep('update:ready', update, (json) => json?.success === true && json?.data?.id === PROJECT_ID);

  const readyList = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep(
    'list:ready',
    readyList,
    (json) => json?.success === true && json?.data?.projects?.some((project) =>
      project.id === PROJECT_ID &&
      project.handoffReady === true &&
      project.handoffBlockingIssueCount === 0 &&
      Array.isArray(project.handoffBlockingReasons) &&
      project.handoffBlockingReasons.length === 0),
  );

  const detail = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, { userId });
  assertStep(
    'detail',
    detail,
    (json) =>
      json?.success === true &&
      json?.data?.payload?.id === PROJECT_ID &&
      json?.data?.handoffReady === true &&
      json?.data?.handoffBlockingIssueCount === 0,
  );

  const remove = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
    method: 'DELETE',
    userId,
  });
  assertStep('delete', remove, (json) => json?.success === true && json?.data?.id === PROJECT_ID);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
