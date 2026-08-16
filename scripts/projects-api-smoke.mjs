const PROJECT_ID = `smoke-project-${Date.now()}`;
let cleanupContext = null;

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, '');
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function isLocalBaseUrl(value) {
  const { hostname } = new URL(value);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
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
    throw new Error(JSON.stringify({ step: name, status: result.status, response: result.json }, null, 2));
  }
  console.log(JSON.stringify({ step: name, status: result.status, ok: true }));
}

function matchesProjectSummary(project, expected) {
  return (
    project?.id === PROJECT_ID &&
    project?.handoffReady === expected.handoffReady &&
    project?.handoffBlockingIssueCount === expected.handoffBlockingReasons.length &&
    expected.handoffBlockingReasons.every(
      (reason, index) => project?.handoffBlockingReasons?.[index] === reason,
    ) &&
    project?.selectedAttemptCount === expected.selectedAttemptCount
  );
}

function assertProjectDetail(name, result, expected) {
  assertStep(
    name,
    result,
    (json) =>
      json?.success === true &&
      json?.data?.payload?.id === PROJECT_ID &&
      matchesProjectSummary({ id: PROJECT_ID, ...json.data }, expected),
  );
}

function buildWorkspace(status = 'pending', resultNote = '', approvalAttemptId = '') {
  const now = new Date().toISOString();
  const workspace = {
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
    iterations: [
      {
        id: 'iteration-1',
        createdAt: now,
        focus: '主体一致性',
      },
    ],
    platformCalibrations: [
      {
        id: 'calibration-1',
        createdAt: now,
        platform: 'Seedance',
        outcome: 'validated',
      },
    ],
  };
  if (status !== 'pending') {
    workspace.shotAttempts = {
      1: [
        {
          id: 'attempt-1',
          createdAt: now,
          shotId: 1,
          provider: 'Runway',
          model: 'Gen-4.5',
          status,
          assetRef: 'b2://jingci-preview/shot-1.mp4',
        },
      ],
    };
    workspace.selectedShotAttemptIds = { 1: 'attempt-1' };
    if (approvalAttemptId) {
      workspace.shotApprovalReceipts = {
        1: {
          id: 'approval-1',
          approvedAt: now,
          shotId: 1,
          attemptId: approvalAttemptId,
          provider: 'Runway',
          model: 'Gen-4.5',
          assetRef: 'b2://jingci-preview/shot-1.mp4',
          decisionNote: '已人工复核，可交付。',
          evidenceKind: 'human_approval',
        },
      };
    }
  } else {
    workspace.shotAttempts = {
      1: [
        {
          id: 'attempt-stale',
          createdAt: 'invalid-date',
          shotId: 1,
          provider: 'Unknown',
          model: 'Unknown',
          status: 'generated',
        },
      ],
    };
    workspace.selectedShotAttemptIds = { 1: 'attempt-stale' };
  }
  return workspace;
}

async function main() {
  const configuredBaseUrl = arg('base-url') ?? process.env.PROJECTS_API_BASE_URL;
  if (!configuredBaseUrl) {
    throw new Error('Projects API smoke requires --base-url=<url> or PROJECTS_API_BASE_URL.');
  }
  const baseUrl = normalizeBaseUrl(configuredBaseUrl);
  if (!isLocalBaseUrl(baseUrl) && !hasFlag('allow-production')) {
    throw new Error('Refusing non-local smoke without explicit --allow-production.');
  }
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
  cleanupContext = { baseUrl, userId };

  const list = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep(
    'list:blocked',
    list,
    (json) => json?.success === true && json?.data?.projects?.some((project) =>
      project.id === PROJECT_ID &&
      project.handoffReady === false &&
      project.handoffBlockingIssueCount === 1 &&
      project.handoffBlockingReasons?.[0] === '镜头 1 未执行' &&
      project.iterationCount === 1 &&
      project.latestIterationFocus === '主体一致性' &&
      project.calibrationCount === 1 &&
      project.latestCalibrationPlatform === 'Seedance' &&
      project.latestCalibrationOutcome === 'validated' &&
      project.selectedAttemptCount === 0),
  );

  const blockedDetail = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, { userId });
  assertProjectDetail('detail:blocked', blockedDetail, {
    handoffReady: false,
    handoffBlockingReasons: ['镜头 1 未执行'],
    selectedAttemptCount: 0,
  });

  const legacyWorkspace = buildWorkspace('usable', 'legacy result note');
  delete legacyWorkspace.shotAttempts;
  delete legacyWorkspace.selectedShotAttemptIds;
  const legacyUpdate = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify({ workspace: legacyWorkspace }),
  });
  assertStep('update:legacy-usable', legacyUpdate, (json) => json?.success === true && json?.data?.id === PROJECT_ID);

  const legacyList = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep(
    'list:legacy-usable',
    legacyList,
    (json) => json?.success === true && json?.data?.projects?.some((project) =>
      project.id === PROJECT_ID &&
      project.handoffReady === false &&
      project.handoffBlockingIssueCount === 1 &&
      project.handoffBlockingReasons?.[0] === '镜头 1 缺交付审批' &&
      project.selectedAttemptCount === 0),
  );

  const legacyDetail = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, { userId });
  assertProjectDetail('detail:legacy-usable', legacyDetail, {
    handoffReady: false,
    handoffBlockingReasons: ['镜头 1 缺交付审批'],
    selectedAttemptCount: 0,
  });

  const unapprovedUpdate = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify({ workspace: buildWorkspace('usable', 'smoke result note') }),
  });
  assertStep('update:usable-unapproved', unapprovedUpdate, (json) => json?.success === true && json?.data?.id === PROJECT_ID);

  const unapprovedList = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep(
    'list:usable-unapproved',
    unapprovedList,
    (json) => json?.success === true && json?.data?.projects?.some((project) =>
      project.id === PROJECT_ID &&
      project.handoffReady === false &&
      project.handoffBlockingIssueCount === 1 &&
      project.handoffBlockingReasons?.[0] === '镜头 1 缺交付审批'),
  );

  const unapprovedDetail = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, { userId });
  assertProjectDetail('detail:usable-unapproved', unapprovedDetail, {
    handoffReady: false,
    handoffBlockingReasons: ['镜头 1 缺交付审批'],
    selectedAttemptCount: 1,
  });

  const staleApprovalUpdate = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify({ workspace: buildWorkspace('usable', 'smoke result note', 'attempt-stale') }),
  });
  assertStep('update:stale-approval', staleApprovalUpdate, (json) => json?.success === true && json?.data?.id === PROJECT_ID);

  const staleApprovalList = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep(
    'list:stale-approval',
    staleApprovalList,
    (json) => json?.success === true && json?.data?.projects?.some((project) =>
      project.id === PROJECT_ID &&
      project.handoffReady === false &&
      project.handoffBlockingReasons?.[0] === '镜头 1 缺交付审批'),
  );

  const staleApprovalDetail = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, { userId });
  assertProjectDetail('detail:stale-approval', staleApprovalDetail, {
    handoffReady: false,
    handoffBlockingReasons: ['镜头 1 缺交付审批'],
    selectedAttemptCount: 1,
  });

  const update = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify({ workspace: buildWorkspace('usable', 'smoke result note', 'attempt-1') }),
  });
  assertStep('update:approved', update, (json) => json?.success === true && json?.data?.id === PROJECT_ID);

  const readyList = await requestJson(baseUrl, '/api/projects?limit=3', { userId });
  assertStep(
    'list:ready',
    readyList,
    (json) => json?.success === true && json?.data?.projects?.some((project) =>
      project.id === PROJECT_ID &&
      project.handoffReady === true &&
      project.handoffBlockingIssueCount === 0 &&
      Array.isArray(project.handoffBlockingReasons) &&
      project.handoffBlockingReasons.length === 0 &&
      project.selectedAttemptCount === 1 &&
      project.latestSelectedAttemptProvider === 'Runway' &&
      project.latestSelectedAttemptModel === 'Gen-4.5' &&
      project.latestSelectedAttemptStatus === 'usable'),
  );

  const detail = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, { userId });
  assertStep(
    'detail',
    detail,
    (json) =>
      json?.success === true &&
      json?.data?.payload?.id === PROJECT_ID &&
      json?.data?.handoffReady === true &&
      json?.data?.handoffBlockingIssueCount === 0 &&
      json?.data?.iterationCount === 1 &&
      json?.data?.calibrationCount === 1 &&
      json?.data?.selectedAttemptCount === 1 &&
      json?.data?.latestSelectedAttemptProvider === 'Runway',
  );

  const remove = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
    method: 'DELETE',
    userId,
  });
  assertStep('delete', remove, (json) => json?.success === true && json?.data?.id === PROJECT_ID);
  cleanupContext = null;
}

main().catch(async (error) => {
  if (cleanupContext) {
    const { baseUrl, userId } = cleanupContext;
    try {
      const cleanup = await requestJson(baseUrl, `/api/projects/${encodeURIComponent(PROJECT_ID)}`, {
        method: 'DELETE',
        userId,
      });
      console.error(JSON.stringify({ step: 'cleanup', status: cleanup.status, ok: cleanup.ok }));
    } catch (cleanupError) {
      console.error('Projects API smoke cleanup failed:', cleanupError);
    }
  }
  console.error(error);
  process.exitCode = 1;
});
