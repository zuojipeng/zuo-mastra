/**
 * Cloudflare Workers + D1 — AI 视频创作提示词优化 API
 */

import { buildPromptInstructions } from './src/mastra/agents/build-prompt-instructions';
import {
  buildUserMessage,
  normalizeScenario,
  type OptimizeRequestBody,
} from './src/mastra/agents/build-user-message';
import { parseOptimizationOutput } from './src/mastra/schemas/optimization-output';
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
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const MAX_BODY_BYTES = 12_000;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STYLE_LENGTH = 80;
const MAX_HEADER_ID_LENGTH = 128;

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

function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin =
    allowedOrigins === '*'
      ? '*'
      : origin && allowedOrigins.has(origin)
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
  return allowedOrigins === '*' || allowedOrigins.has(origin);
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

  return {
    message,
    scenario: normalizeScenario(body.scenario),
    ...(style ? { style } : {}),
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
      max_tokens: 3200,
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
        const { message, scenario, style } = body;

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

        const userContent = buildUserMessage({ message, scenario, style });
        messages.push({ role: 'user', content: userContent });

        const responseText = await callDeepSeekChat(llmApiKey, messages);
        let structured: ReturnType<typeof parseOptimizationOutput>;

        try {
          structured = parseOptimizationOutput(responseText);
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

        if (env.DB) {
          try {
            await ensureConversationSchema(env.DB);
            await saveConversation(env.DB, userId, sessionId, [
              { role: 'user', content: userContent },
              { role: 'assistant', content: responseText },
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
              result: structured,
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
