/**
 * ========================================
 * Cloudflare Workers 入口文件
 * ========================================
 */

import { Agent } from '@mastra/core/agent';

// 创建 Agent（直接在这里，避免打包问题）
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
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

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

        if (!message || typeof message !== 'string') {
          return new Response(
            JSON.stringify({
              error: '请提供有效的 message 字段',
              example: { message: '帮我翻译这段话' },
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        // 从环境变量获取 API Key
        if (!env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
            { status: 500, headers: corsHeaders }
          );
        }

        // 临时设置环境变量（Workers 需要这样做）
        process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;

        // 调用 Agent
        const response = await promptOptimizerAgent.generate([
          {
            role: 'user',
            content: message,
          },
        ]);

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              originalPrompt: message,
              optimizedPrompt: response.text,
            },
            metadata: {
              model: 'gpt-4o-mini',
              timestamp: new Date().toISOString(),
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

    // 健康检查
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Prompt Optimizer Agent (Workers)',
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

