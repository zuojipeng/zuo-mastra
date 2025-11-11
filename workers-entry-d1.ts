/**
 * ========================================
 * Cloudflare Workers + D1 持久化存储
 * ========================================
 * 
 * 功能：
 * - 使用 D1 (SQLite) 存储对话历史
 * - 自动保存每次对话
 * - 按用户 ID 隔离数据
 * - 支持会话管理
 */

import { Agent } from '@mastra/core/agent';

// 创建 Agent
const promptOptimizerAgent = new Agent({
  name: 'Prompt Optimizer Agent',
  model: 'openai/gpt-4o-mini',
  instructions: `你是一位专业的 AI 提示词优化专家。你的唯一职责是优化用户的提示词，而不是执行任务本身。

当用户说"帮我翻译这段话"时，你应该：
1. 分析这个提示词的问题
2. 提供优化后的翻译提示词
3. 解释为什么这样优化更好

输出格式：
📊 原始提示词分析
✨ 优化后的提示词（版本1和版本2）
💡 优化要点说明
🎯 使用建议`,
  tools: {},
  scorers: {},
});

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Session-Id',
  'Content-Type': 'application/json',
};

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 保存对话到 D1
 */
async function saveConversation(
  db: any,
  userId: string,
  sessionId: string,
  messages: any[]
): Promise<void> {
  const id = generateId();
  const now = Date.now();
  
  await db.prepare(`
    INSERT INTO conversations (id, user_id, session_id, messages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    sessionId,
    JSON.stringify(messages),
    now,
    now
  ).run();
}

/**
 * 获取用户的对话历史
 */
async function getConversationHistory(
  db: any,
  userId: string,
  sessionId?: string,
  limit: number = 10
): Promise<any[]> {
  let query: any;
  
  if (sessionId) {
    // 获取特定会话的历史
    query = db.prepare(`
      SELECT messages, created_at
      FROM conversations
      WHERE user_id = ? AND session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(userId, sessionId, limit);
  } else {
    // 获取用户的所有历史
    query = db.prepare(`
      SELECT messages, created_at
      FROM conversations
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(userId, limit);
  }
  
  const { results } = await query.all();
  
  return results.map((row: any) => ({
    messages: JSON.parse(row.messages),
    timestamp: row.created_at,
  }));
}

/**
 * 清理过期数据（超过 30 天）
 */
async function cleanupOldConversations(db: any): Promise<void> {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  await db.prepare(`
    DELETE FROM conversations
    WHERE created_at < ?
  `).bind(thirtyDaysAgo).run();
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // API 端点：POST /api/optimize
    if (url.pathname === '/api/optimize' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { message } = body;

        // 从请求头获取用户 ID 和会话 ID（可选）
        const userId = request.headers.get('X-User-Id') || 'anonymous';
        const sessionId = request.headers.get('X-Session-Id') || generateId();

        if (!message || typeof message !== 'string') {
          return new Response(
            JSON.stringify({
              error: '请提供有效的 message 字段',
              example: { message: '帮我翻译这段话' },
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        // 检查环境变量
        if (!env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
            { status: 500, headers: corsHeaders }
          );
        }

        // 设置 OpenAI API Key
        process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;

        // 获取对话历史（如果有 D1 数据库）
        let conversationHistory: any[] = [];
        if (env.DB) {
          try {
            conversationHistory = await getConversationHistory(
              env.DB,
              userId,
              sessionId,
              5 // 最近 5 条对话
            );
          } catch (error) {
            console.error('Failed to fetch history:', error);
            // 继续处理，即使历史获取失败
          }
        }

        // 构建消息列表（包含历史上下文）
        const messages: any[] = [];
        
        // 添加历史消息（倒序，最旧的在前）
        conversationHistory.reverse().forEach(history => {
          messages.push(...history.messages);
        });
        
        // 添加当前消息
        messages.push({
          role: 'user',
          content: message,
        });

        // 调用 Agent
        const response = await promptOptimizerAgent.generate(messages);

        // 保存对话到 D1
        if (env.DB) {
          try {
            const conversationMessages = [
              { role: 'user', content: message },
              { role: 'assistant', content: response.text },
            ];
            
            await saveConversation(
              env.DB,
              userId,
              sessionId,
              conversationMessages
            );
            
            // 定期清理旧数据（10% 概率执行）
            if (Math.random() < 0.1) {
              cleanupOldConversations(env.DB).catch(console.error);
            }
          } catch (error) {
            console.error('Failed to save conversation:', error);
            // 继续返回结果，即使保存失败
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              originalPrompt: message,
              optimizedPrompt: response.text,
              sessionId: sessionId,
              hasHistory: conversationHistory.length > 0,
            },
            metadata: {
              model: 'gpt-4o-mini',
              timestamp: new Date().toISOString(),
              historyCount: conversationHistory.length,
            },
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (error: any) {
        console.error('Agent error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || '服务器内部错误',
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // API 端点：GET /api/history（获取历史记录）
    if (url.pathname === '/api/history' && request.method === 'GET') {
      try {
        const userId = request.headers.get('X-User-Id') || 'anonymous';
        const sessionId = request.headers.get('X-Session-Id') || undefined;
        
        if (!env.DB) {
          return new Response(
            JSON.stringify({ error: 'Database not configured' }),
            { status: 500, headers: corsHeaders }
          );
        }
        
        const history = await getConversationHistory(
          env.DB,
          userId,
          sessionId,
          20 // 最近 20 条
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              userId,
              sessionId,
              history,
              count: history.length,
            },
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (error: any) {
        console.error('History error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 健康检查
    if (url.pathname === '/api/health' && request.method === 'GET') {
      const hasDb = !!env.DB;
      
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Prompt Optimizer Agent (Workers + D1)',
          features: {
            memory: hasDb,
            database: hasDb ? 'D1 (SQLite)' : 'none',
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: corsHeaders }
    );
  },
};

