/**
 * Cloudflare Workers + D1 — AI 视频创作提示词优化 API
 */

import { buildPromptInstructions } from './src/mastra/agents/build-prompt-instructions';
import {
  buildUserMessage,
  normalizeScenario,
  type OptimizeRequestBody,
} from './src/mastra/agents/build-user-message';
import { parseOptimizationOutputV3, type V3OptimizationOutput } from './src/mastra/schemas/optimization-output';
import {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL_NAME,
  resolveDeepSeekApiKey,
} from './src/mastra/llm/model-config';

type D1Db = {
  prepare(query: string): {
    bind(...args: unknown[]): {
      run(): Promise<unknown>;
      all<T = unknown>(): Promise<{ results?: T[] }>;
    };
  };
};

type Env = {
  DEEPSEEK_API_KEY?: string;
  OPENAI_API_KEY?: string;
  DB?: D1Db;
  API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  DEBUG_ERRORS?: string;
};

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://prompt-optimizer-frontend.pages.dev',
  'https://prompt-mastra-agent-ui.pages.dev',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3003',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
]);

const MAX_BODY_BYTES = 12_000;
const MAX_SYNC_BODY_BYTES = 100_000;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STYLE_LENGTH = 80;
const MAX_REFINEMENT_CONTENT_LENGTH = 4_000;
const MAX_REFINEMENT_LABEL_LENGTH = 120;
const MAX_REFINEMENT_INSTRUCTION_LENGTH = 400;
const MAX_PROJECT_BIBLE_FIELD_LENGTH = 500;
const MAX_PROJECT_BIBLE_ARRAY_ITEMS = 5;
const MAX_HEADER_ID_LENGTH = 128;
const VALID_REFINEMENT_TARGETS = new Set([
  'full_prompt',
  'negative_prompt',
  'timeline_segment',
  'platform_variant',
  'version',
]);

function getAllowedOrigins(env: Env): Set<string> | '*' {
  if (env.ALLOWED_ORIGINS?.trim() === '*') return '*';
  const configured = env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) {
    return new Set(configured);
  }

  return DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedPagesPreviewOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return (
      protocol === 'https:' &&
      (hostname === 'prompt-mastra-agent-ui.pages.dev' || hostname.endsWith('.prompt-mastra-agent-ui.pages.dev'))
    );
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string, allowedOrigins: Set<string> | '*'): boolean {
  return allowedOrigins === '*' || allowedOrigins.has(origin) || isAllowedPagesPreviewOrigin(origin);
}

function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin =
    allowedOrigins === '*'
      ? '*'
      : origin && isAllowedOrigin(origin, allowedOrigins)
        ? origin
        : Array.from(allowedOrigins)[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Session-Id, X-Api-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function isOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  const allowedOrigins = getAllowedOrigins(env);
  return isAllowedOrigin(origin, allowedOrigins);
}

function jsonResponse(body: unknown, status: number, request: Request, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(request, env),
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function sanitizeHeaderId(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9._:-]+$/.test(normalized)) return fallback;
  return normalized.slice(0, MAX_HEADER_ID_LENGTH);
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Response(JSON.stringify({ success: false, error: 'Content-Type 必须是 application/json' }), {
      status: 415,
    });
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    throw new Response(JSON.stringify({ success: false, error: '请求体过大' }), { status: 413 });
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Response(JSON.stringify({ success: false, error: '请求体过大' }), { status: 413 });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Response(JSON.stringify({ success: false, error: 'JSON 格式无效' }), { status: 400 });
  }
}

function normalizeOptimizeBody(raw: unknown): OptimizeRequestBody {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Response(JSON.stringify({ success: false, error: '请求体必须是 JSON 对象' }), { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  if (typeof body.message !== 'string' || !body.message.trim()) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: '请提供有效的 message 字段',
        example: { message: '雨夜街头，一个女孩回头', scenario: 'video', style: 'wong-kar-wai' },
      }),
      { status: 400 },
    );
  }

  const message = body.message.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Response(JSON.stringify({ success: false, error: `message 不能超过 ${MAX_MESSAGE_LENGTH} 个字符` }), {
      status: 400,
    });
  }

  const style = typeof body.style === 'string' ? body.style.trim().slice(0, MAX_STYLE_LENGTH) : undefined;
  let projectBible: OptimizeRequestBody['projectBible'];
  let shotCount: number | undefined;
  if (typeof body.shotCount === 'number') {
    shotCount = body.shotCount;
  } else if (typeof body.shotCount === 'string') {
    const parsed = parseInt(body.shotCount, 10);
    if (!isNaN(parsed)) shotCount = parsed;
  }
  let refinement: OptimizeRequestBody['refinement'];

  if (body.projectBible !== undefined) {
    if (!body.projectBible || typeof body.projectBible !== 'object' || Array.isArray(body.projectBible)) {
      throw new Response(JSON.stringify({ success: false, error: 'projectBible 必须是 JSON 对象' }), { status: 400 });
    }

    const rawProjectBible = body.projectBible as Record<string, unknown>;
    const readText = (key: string): string | undefined => {
      const value = rawProjectBible[key];
      return typeof value === 'string' && value.trim()
        ? value.trim().slice(0, MAX_PROJECT_BIBLE_FIELD_LENGTH)
        : undefined;
    };
    const readList = (key: string): string[] | undefined => {
      const value = rawProjectBible[key];
      if (!Array.isArray(value)) return undefined;
      const items = value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, MAX_PROJECT_BIBLE_FIELD_LENGTH))
        .slice(0, MAX_PROJECT_BIBLE_ARRAY_ITEMS);
      return items.length ? items : undefined;
    };

    const normalizedProjectBible = {
      protagonist: readText('protagonist'),
      mission: readText('mission'),
      world: readText('world'),
      visualSymbols: readList('visualSymbols'),
      lookAndFeel: readText('lookAndFeel'),
      continuityRules: readList('continuityRules'),
      shotIntent: readText('shotIntent'),
    };

    if (Object.values(normalizedProjectBible).some((value) => value !== undefined)) {
      projectBible = normalizedProjectBible;
    }
  }

  if (body.refinement !== undefined) {
    if (!body.refinement || typeof body.refinement !== 'object' || Array.isArray(body.refinement)) {
      throw new Response(JSON.stringify({ success: false, error: 'refinement 必须是 JSON 对象' }), { status: 400 });
    }

    const rawRefinement = body.refinement as Record<string, unknown>;
    const targetType = rawRefinement.targetType;
    const label = rawRefinement.label;
    const content = rawRefinement.content;
    const instruction = rawRefinement.instruction;

    if (typeof targetType !== 'string' || !VALID_REFINEMENT_TARGETS.has(targetType)) {
      throw new Response(JSON.stringify({ success: false, error: 'refinement.targetType 无效' }), { status: 400 });
    }
    if (typeof label !== 'string' || !label.trim()) {
      throw new Response(JSON.stringify({ success: false, error: 'refinement.label 必须是非空字符串' }), { status: 400 });
    }
    if (typeof content !== 'string' || !content.trim()) {
      throw new Response(JSON.stringify({ success: false, error: 'refinement.content 必须是非空字符串' }), { status: 400 });
    }
    if (content.length > MAX_REFINEMENT_CONTENT_LENGTH) {
      throw new Response(
        JSON.stringify({ success: false, error: `refinement.content 不能超过 ${MAX_REFINEMENT_CONTENT_LENGTH} 个字符` }),
        { status: 400 },
      );
    }

    refinement = {
      targetType: targetType as NonNullable<OptimizeRequestBody['refinement']>['targetType'],
      label: label.trim().slice(0, MAX_REFINEMENT_LABEL_LENGTH),
      content: content.trim(),
      ...(typeof instruction === 'string' && instruction.trim()
        ? { instruction: instruction.trim().slice(0, MAX_REFINEMENT_INSTRUCTION_LENGTH) }
        : {}),
    };
  }

  return {
    message,
    scenario: normalizeScenario(body.scenario),
    ...(style ? { style } : {}),
    ...(shotCount !== undefined ? { shotCount: Math.max(1, Math.min(10, Math.floor(shotCount))) } : {}),
    ...(projectBible ? { projectBible } : {}),
    ...(refinement ? { refinement } : {}),
  };
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown-ip'
  );
}

function isDebugEnabled(env: Env): boolean {
  return env.DEBUG_ERRORS === 'true';
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function enforceProjectBibleContinuity(
  output: V3OptimizationOutput,
  projectBible: OptimizeRequestBody['projectBible'],
): V3OptimizationOutput {
  if (!projectBible) return output;

  const symbols = projectBible.visualSymbols?.filter(Boolean).slice(0, MAX_PROJECT_BIBLE_ARRAY_ITEMS) ?? [];
  if (!symbols.length) return output;

  const updatedPrompts = output.prompts.map((prompt, index) => {
    const missingSymbols = symbols.filter((symbol) => !includesText(prompt, symbol));
    if (!missingSymbols.length) return prompt;
    // Distribute missing symbols across prompts
    const symbolForThisPrompt = missingSymbols[index % missingSymbols.length];
    return `${prompt} 画面中出现了${symbolForThisPrompt}。`;
  });

  return { ...output, prompts: updatedPrompts };
}

async function saveConversation(
  db: D1Db,
  userId: string,
  sessionId: string,
  messages: { role: string; content: string }[],
): Promise<void> {
  const id = generateId();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO conversations (id, user_id, session_id, messages, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, sessionId, JSON.stringify(messages), now, now)
    .run();
}

async function getConversationHistory(
  db: D1Db,
  userId: string,
  sessionId?: string,
  limit = 10,
): Promise<{ messages: { role: string; content: string }[]; timestamp: number }[]> {
  const query = sessionId
    ? db
        .prepare(
          `SELECT messages, created_at FROM conversations
           WHERE user_id = ? AND session_id = ?
           ORDER BY created_at DESC LIMIT ?`,
        )
        .bind(userId, sessionId, limit)
    : db
        .prepare(
          `SELECT messages, created_at FROM conversations
           WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        )
        .bind(userId, limit);

  const { results } = await query.all<{ messages: string; created_at: number }>();
  return (results ?? []).map((row: { messages: string; created_at: number }) => ({
    messages: JSON.parse(row.messages) as { role: string; content: string }[],
    timestamp: row.created_at,
  }));
}

async function cleanupOldConversations(db: D1Db): Promise<void> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await db.prepare(`DELETE FROM conversations WHERE created_at < ?`).bind(thirtyDaysAgo).run();
}

/** 简易频率限制：每用户每分钟最多 5 次（基于 KV 或内存；Workers 无全局内存时用 D1 可选，此处用请求头+时间窗口缓存模拟） */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function checkApiKey(request: Request, env: { API_KEY?: string }): boolean {
  if (!env.API_KEY) return true;
  const key = request.headers.get('X-Api-Key');
  return key === env.API_KEY;
}

let schemaReadyPromise: Promise<void> | undefined;

function ensureConversationSchema(db: D1Db): Promise<void> {
  schemaReadyPromise ??= (async () => {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          session_id TEXT,
          messages TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`,
      )
      .bind()
      .run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_id ON conversations(user_id)`).bind().run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_session_id ON conversations(session_id)`).bind().run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_created_at ON conversations(created_at DESC)`).bind().run();
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS feedbacks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          input TEXT,
          prompt TEXT,
          shot_index INTEGER DEFAULT 0,
          rating TEXT CHECK(rating IN ('like', 'dislike')),
          comment TEXT DEFAULT '',
          created_at INTEGER
        )`,
      )
      .bind()
      .run();
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS user_data (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          payload TEXT,
          updated_at INTEGER
        )`,
      )
      .bind()
      .run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedbacks(user_id)`).bind().run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedbacks(rating)`).bind().run();
  })().catch((error) => {
    schemaReadyPromise = undefined;
    throw error;
  });

  return schemaReadyPromise;
}

async function callDeepSeekChat(
  apiKey: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL_NAME,
      messages,
      temperature: 0,
      max_tokens: 5000,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `DeepSeek API error: ${response.status}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek response missing message content');
  }

  return content;
}

function buildDirectorKitSystemPrompt(
  targetDuration?: string,
  targetType?: string,
  platform?: string,
): string {
  const durationHint = targetDuration ? `\n- 目标时长：${targetDuration}` : '';
  const typeHint = targetType ? `\n- 目标类型风格：${targetType}` : '';
  const platformHint = platform ? `\n- 目标平台：${platform}` : '';

  return `你是一位专业的AI视频导演助手。你需要根据用户的创意描述，生成完整的导演执行包（DirectorKit）。

## 用户参数
${durationHint}${typeHint}${platformHint}

## 输出要求
请严格按照以下 JSON 结构输出，不要添加任何额外的解释文字。你的输出必须是一个合法的 JSON 对象，包含以下字段：

{
  "diagnosis": {
    "feasibilityScore": 0-100的数字,
    "keyRisks": ["风险描述字符串数组"],
    "riskLevel": "low" | "medium" | "high",
    "suggestedAdjustments": ["调整建议字符串数组"],
    "recommendedDirection": "推荐方向描述"
  },
  "versions": [
    {
      "versionType": "safest" | "stylish" | "cinematic",
      "label": "版本标题",
      "summary": "版本摘要",
      "rewrittenIdea": "重写的创意描述",
      "whyThisWorks": "为什么这个版本有效",
      "reducedRisks": ["降低的风险列表"],
      "bestFor": "最适合的场景"
    }
  ],
  "selectedVersion": null,
  "storySetting": {
    "logline": "一句核心故事梗概",
    "directorIntent": "导演意图描述",
    "protagonist": "主角设定",
    "worldSetting": "世界观设定",
    "visualMotif": "视觉母题"
  },
  "shotCards": [
    {
      "shotId": 镜头编号数字,
      "duration": "时长描述（如3s）",
      "purpose": "镜头目的",
      "framing": "景别（如特写/中景/全景）",
      "description": "画面描述",
      "action": "动作描述",
      "mood": "情绪氛围",
      "motion": "运镜方式",
      "generationMode": "text-to-video" | "image-to-video" | "reference-image",
      "consistencyNeed": "low" | "medium" | "high",
      "riskLevel": "low" | "medium" | "high",
      "riskTags": ["风险标签"],
      "fixSuggestion": "补救建议"
    }
  ],
  "masterPrompt": "完整的主prompt文本",
  "negativePrompt": "负面提示词",
  "platformAdvice": [
    {
      "platform": "平台名称",
      "note": "使用说明",
      "recommended": true或false
    }
  ],
  "postProductionAdvice": {
    "editingRhythm": "剪辑节奏建议",
    "soundEffects": ["音效列表"],
    "music": "配乐建议",
    "subtitles": "字幕建议"
  },
  "riskRemediation": {
    "topRisks": ["前3风险"],
    "alternativeShots": ["替代方案"],
    "backupStrategies": ["备用策略"]
  }
}

## 注意事项
1. shotCards 数组长度应根据创意复杂度和目标时长合理确定（15秒约3-5个镜头，30秒约5-8个镜头，60秒约8-12个镜头）
2. versions 数组必须包含3个版本，分别对应 safest（保守）、stylish（风格化）、cinematic（电影感）
3. selectedVersion 固定为 null
4. diagnosis.feasibilityScore 请基于创意清晰度、可实现性、风险度综合评分，0-100之间
5. 所有文本字段使用中文`;
}

function parseDirectorKitResponse(raw: string): Record<string, unknown> {
  // Try to extract JSON from markdown code block first
  const jsonBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch?.[1]?.trim() ?? raw.trim();

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  // Validate required fields
  const requiredFields = [
    'diagnosis', 'versions', 'selectedVersion', 'storySetting',
    'shotCards', 'masterPrompt', 'negativePrompt',
    'platformAdvice', 'postProductionAdvice', 'riskRemediation',
  ];
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return parsed;
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      if (!isOriginAllowed(request, env)) {
        return jsonResponse({ success: false, error: 'Origin not allowed' }, 403, request, env);
      }
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
    }

    if (!isOriginAllowed(request, env)) {
      return jsonResponse({ success: false, error: 'Origin not allowed' }, 403, request, env);
    }

    if (!checkApiKey(request, env)) {
      return jsonResponse({ success: false, error: 'Invalid or missing API key' }, 401, request, env);
    }

    if (url.pathname === '/api/optimize' && request.method === 'POST') {
      try {
        const body = normalizeOptimizeBody(await readJsonBody(request));
        const { message, scenario, style, projectBible, refinement, shotCount } = body;
        const shotCountValue = shotCount ?? 1;
        const userId = sanitizeHeaderId(request.headers.get('X-User-Id'), 'anonymous');
        const sessionId = sanitizeHeaderId(request.headers.get('X-Session-Id'), generateId());
        const rateLimitKey = `${getClientIp(request)}:${userId}`;

        if (!checkRateLimit(rateLimitKey)) {
          return jsonResponse(
            { success: false, error: '请求过于频繁，请稍后再试（每分钟最多 5 次）' },
            429,
            request,
            env,
          );
        }

        const llmApiKey = resolveDeepSeekApiKey(env.DEEPSEEK_API_KEY ?? env.OPENAI_API_KEY);
        if (!llmApiKey) {
          return jsonResponse({ success: false, error: '模型服务未配置' }, 500, request, env);
        }

        process.env.DEEPSEEK_API_KEY = llmApiKey;

        let conversationHistory: Awaited<ReturnType<typeof getConversationHistory>> = [];
        if (env.DB) {
          try {
            await ensureConversationSchema(env.DB);
            conversationHistory = await getConversationHistory(env.DB, userId, sessionId, 5);
          } catch (error) {
            console.error('Failed to fetch history:', error);
          }
        }

        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
          { role: 'system', content: buildPromptInstructions(scenario, style) },
        ];

        [...conversationHistory].reverse().forEach((history) => {
          history.messages.forEach((m) => {
            if (m.role === 'user' || m.role === 'assistant') {
              messages.push({ role: m.role, content: m.content });
            }
          });
        });

        const userContent = buildUserMessage({ message, scenario, style, projectBible, refinement });
        const shotHint = shotCountValue > 1
          ? `\n\n[硬性要求：你必须生成 ${shotCountValue} 个镜头，一个不能少]\n请严格按照以下JSON格式输出，prompts数组必须有 ${shotCountValue} 个元素：\n{"prompts": ["镜头1画面描述...", "镜头2画面描述...", ...共${shotCountValue}个]}
`
          : '';
        messages.push({ role: 'user', content: `${userContent}${shotHint}` });

        const responseText = await callDeepSeekChat(llmApiKey, messages);
        let structured: V3OptimizationOutput;

        try {
          structured = parseOptimizationOutputV3(responseText);
        } catch (parseError) {
          console.error('JSON parse failed, returning raw text:', parseError);
          return jsonResponse(
            {
              success: false,
              error: '模型返回格式无效，请重试',
              ...(isDebugEnabled(env) ? { raw: responseText } : {}),
            },
            502,
            request,
            env,
          );
        }

        structured = enforceProjectBibleContinuity(structured, projectBible);
        const structuredResponseText = JSON.stringify(structured);

        if (env.DB) {
          try {
            await ensureConversationSchema(env.DB);
            await saveConversation(env.DB, userId, sessionId, [
              { role: 'user', content: userContent },
              { role: 'assistant', content: structuredResponseText },
            ]);
            if (Math.random() < 0.1) {
              cleanupOldConversations(env.DB).catch(console.error);
            }
          } catch (error) {
            console.error('Failed to save conversation:', error);
          }
        }

        return jsonResponse(
          {
            success: true,
            data: {
              originalPrompt: message,
              scenario,
              style: style ?? null,
              prompt: structured.prompts[0],
              prompts: structured.prompts,
              shotCount: structured.prompts.length,
              result: { full_prompt: structured.prompts[0] },
              sessionId,
              hasHistory: conversationHistory.length > 0,
            },
            metadata: {
              model: DEEPSEEK_MODEL_NAME,
              timestamp: new Date().toISOString(),
              historyCount: conversationHistory.length,
            },
          },
          200,
          request,
          env,
        );
      } catch (error: unknown) {
        if (error instanceof Response) {
          return new Response(error.body, {
            status: error.status,
            headers: getCorsHeaders(request, env),
          });
        }
        const err = error as Error;
        console.error('Agent error:', err);
        return jsonResponse({ success: false, error: '服务器内部错误' }, 500, request, env);
      }
    }

    if (url.pathname === '/api/history' && request.method === 'GET') {
      try {
        const userId = sanitizeHeaderId(request.headers.get('X-User-Id'), 'anonymous');
        const rawSessionId = request.headers.get('X-Session-Id');
        const sessionId = rawSessionId ? sanitizeHeaderId(rawSessionId, '') : undefined;

        if (!env.DB) {
          return jsonResponse({ success: false, error: 'Database not configured' }, 500, request, env);
        }

        await ensureConversationSchema(env.DB);
        const history = await getConversationHistory(env.DB, userId, sessionId, 20);

        return jsonResponse(
          {
            success: true,
            data: { userId, sessionId, history, count: history.length },
          },
          200,
          request,
          env,
        );
      } catch (error: unknown) {
        const err = error as Error;
        console.error('History error:', err);
        return jsonResponse({ success: false, error: '服务器内部错误' }, 500, request, env);
      }
    }

    if (url.pathname === '/api/v2/director-kit') {
      if (request.method !== 'POST') {
        return jsonResponse({ success: false, error: 'Method not allowed' }, 405, request, env);
      }
      try {
        const body = (await readJsonBody(request)) as Record<string, unknown>;
        const message = typeof body?.message === 'string' ? body.message.trim() : '';
        if (!message) {
          return jsonResponse({ success: false, error: '请提供有效的 message 字段' }, 400, request, env);
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
          return jsonResponse(
            { success: false, error: `message 不能超过 ${MAX_MESSAGE_LENGTH} 个字符` },
            400,
            request,
            env,
          );
        }

        const validDurations = ['15s', '30s', '60s', '90s'];
        const validTypes = [
          'wasteland',
          'ancient',
          'cyberpunk',
          'wuxia',
          'thriller',
          'romance',
          'scifi',
          'comedy',
          'black-humor',
          'custom',
        ];
        const validPlatforms = ['seedance', 'kling', 'runway', 'general'];

        const targetDuration =
          typeof body.targetDuration === 'string' && validDurations.includes(body.targetDuration)
            ? body.targetDuration
            : undefined;
        const targetType =
          typeof body.targetType === 'string' && validTypes.includes(body.targetType)
            ? body.targetType
            : undefined;
        const platform =
          typeof body.platform === 'string' && validPlatforms.includes(body.platform)
            ? body.platform
            : undefined;

        const llmApiKey = resolveDeepSeekApiKey(env.DEEPSEEK_API_KEY ?? env.OPENAI_API_KEY);
        if (!llmApiKey) {
          return jsonResponse({ success: false, error: '模型服务未配置' }, 500, request, env);
        }

        const systemPrompt = buildDirectorKitSystemPrompt(targetDuration, targetType, platform);

        const userParts: string[] = ['## 用户创意', message];
        if (targetDuration) userParts.push(`\n目标时长：${targetDuration}`);
        if (targetType) userParts.push(`\n目标类型：${targetType}`);
        if (platform) userParts.push(`\n目标平台：${platform}`);
        const userContent = userParts.join('\n');

        const responseText = await callDeepSeekChat(llmApiKey, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ]);

        let directorKit: Record<string, unknown>;
        try {
          directorKit = parseDirectorKitResponse(responseText);
        } catch (parseError) {
          console.error('DirectorKit parse failed:', parseError);
          return jsonResponse(
            {
              success: false,
              error: '模型返回格式无效，请重试',
              ...(isDebugEnabled(env) ? { raw: responseText } : {}),
            },
            502,
            request,
            env,
          );
        }

        return jsonResponse(
          {
            success: true,
            data: directorKit,
          },
          200,
          request,
          env,
        );
      } catch (error: unknown) {
        if (error instanceof Response) {
          return new Response(error.body, {
            status: error.status,
            headers: getCorsHeaders(request, env),
          });
        }
        const err = error as Error;
        console.error('DirectorKit error:', err);
        return jsonResponse({ success: false, error: '服务器内部错误' }, 500, request, env);
      }
    }

    if (url.pathname === '/api/feedback') {
      try {
        if (request.method === 'POST') {
          const body = (await readJsonBody(request)) as Record<string, unknown>;
          const { input, prompt, shotIndex, rating, comment } = body || {};
          if (typeof rating !== 'string' || (rating !== 'like' && rating !== 'dislike')) {
            return jsonResponse({ success: false, error: 'rating must be "like" or "dislike"' }, 400, request, env);
          }
          const userId = sanitizeHeaderId(request.headers.get('X-User-Id'), 'anonymous');
          const id = generateId();
          const now = Date.now();
          const safeInput = typeof input === 'string' ? input.slice(0, 2000) : '';
          const safePrompt = typeof prompt === 'string' ? prompt.slice(0, 2000) : '';
          const safeComment = typeof comment === 'string' ? comment.slice(0, 500) : '';
          const idx =
            typeof shotIndex === 'number'
              ? shotIndex
              : typeof shotIndex === 'string'
                ? parseInt(shotIndex, 10) || 0
                : 0;
          await env.DB!
            .prepare(
              `INSERT INTO feedbacks (id, user_id, input, prompt, shot_index, rating, comment, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(id, userId, safeInput, safePrompt, idx, rating, safeComment, now)
            .run();
          return jsonResponse({ success: true, data: { id } }, 200, request, env);
        }
        if (request.method === 'GET') {
          const userId = sanitizeHeaderId(request.headers.get('X-User-Id'), 'anonymous');
          const { results } = await env.DB!
            .prepare(`SELECT rating, COUNT(*) as count FROM feedbacks WHERE user_id = ? GROUP BY rating`)
            .bind(userId)
            .all<{ rating: string; count: number }>();
          const rows = results ?? [];
          let likes = 0;
          let dislikes = 0;
          for (const row of rows) {
            if (row.rating === 'like') likes = row.count;
            else if (row.rating === 'dislike') dislikes = row.count;
          }
          const total = likes + dislikes;
          const ratio = total > 0 ? ((likes / total) * 100).toFixed(1) : '0.0';
          return jsonResponse({ success: true, data: { total, likes, dislikes, ratio } }, 200, request, env);
        }
        return jsonResponse({ success: false, error: 'Method not allowed' }, 405, request, env);
      } catch (error: unknown) {
        if (error instanceof Response) {
          return new Response(error.body, { status: error.status, headers: getCorsHeaders(request, env) });
        }
        console.error('Feedback error:', error);
        return jsonResponse({ success: false, error: '服务器内部错误' }, 500, request, env);
      }
    }

    if (url.pathname === '/api/user-data') {
      try {
        if (request.method === 'POST') {
          const rawText = await request.text();
          if (new TextEncoder().encode(rawText).byteLength > MAX_SYNC_BODY_BYTES) {
            return jsonResponse({ success: false, error: '请求体过大' }, 413, request, env);
          }
          let body: Record<string, unknown>;
          try {
            body = JSON.parse(rawText) as Record<string, unknown>;
          } catch {
            return jsonResponse({ success: false, error: 'JSON 格式无效' }, 400, request, env);
          }
          const userId = sanitizeHeaderId(request.headers.get('X-User-Id'), 'anonymous');
          const id = generateId();
          const now = Date.now();
          const payload = JSON.stringify(body);
          await env.DB!
            .prepare(
              `INSERT INTO user_data (id, user_id, payload, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET payload = ?, updated_at = ?`,
            )
            .bind(id, userId, payload, now, payload, now)
            .run();
          return jsonResponse({ success: true }, 200, request, env);
        }
        if (request.method === 'GET') {
          const userId = sanitizeHeaderId(request.headers.get('X-User-Id'), 'anonymous');
          const { results } = await env.DB!
            .prepare(`SELECT payload, updated_at FROM user_data WHERE user_id = ?`)
            .bind(userId)
            .all<{ payload: string; updated_at: number }>();
          const row = results?.[0] ?? null;
          if (!row) {
            return jsonResponse({ success: true, data: null }, 200, request, env);
          }
          return jsonResponse({ success: true, data: { payload: row.payload, updatedAt: row.updated_at } }, 200, request, env);
        }
        return jsonResponse({ success: false, error: 'Method not allowed' }, 405, request, env);
      } catch (error: unknown) {
        if (error instanceof Response) {
          return new Response(error.body, { status: error.status, headers: getCorsHeaders(request, env) });
        }
        console.error('User data error:', error);
        return jsonResponse({ success: false, error: '服务器内部错误' }, 500, request, env);
      }
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      const hasDb = !!env.DB;
      return jsonResponse(
        {
          status: 'ok',
          service: 'AI Video Prompt Workbench',
          focus: 'video',
          features: {
            memory: hasDb,
            database: hasDb ? 'D1 (SQLite)' : 'none',
            structuredOutput: true,
            scenarios: ['video'],
            platformVariants: ['Kling', 'Runway', 'Pika', 'Sora', 'Seedance'],
          },
        },
        200,
        request,
        env,
      );
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404, request, env);
  },
};
