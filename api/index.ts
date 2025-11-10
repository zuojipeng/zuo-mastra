/**
 * ========================================
 * Prompt Optimizer Agent - 独立 API 服务
 * ========================================
 * 
 * 这个文件将 Agent 封装成独立的 API 端点，可以被任何前端项目调用
 * 
 * 部署方式：
 * 1. Cloudflare Workers（推荐）
 * 2. Vercel Serverless Functions
 * 3. 任何支持 Node.js 的服务器
 */

import { mastra } from '../src/mastra/index';

/**
 * CORS 配置
 * 允许跨域请求，这样任何前端项目都能调用这个 API
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 生产环境建议改为具体的前端域名
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * 主 API 处理函数
 * 这是一个标准的 HTTP 请求处理器
 */
export default async function handler(req: Request): Promise<Response> {
  // 处理 OPTIONS 预检请求（CORS 需要）
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // 解析请求体
    const body = await req.json();
    const { message } = body;

    // 验证输入
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Invalid request. Please provide a "message" field.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 调用 Agent 处理
    const agent = mastra.agents.promptOptimizerAgent;
    const response = await agent.generate({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    // 返回优化结果
    return new Response(
      JSON.stringify({
        success: true,
        optimizedPrompt: response.text,
        // 可选：返回更多信息
        metadata: {
          model: 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // 错误处理
    console.error('Agent error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 如果使用 Node.js 服务器（Express/Fastify 等）
 * 可以这样导出：
 */
export async function handlePromptOptimization(message: string) {
  const agent = mastra.agents.promptOptimizerAgent;
  const response = await agent.generate({
    messages: [{ role: 'user', content: message }],
  });
  return response.text;
}

