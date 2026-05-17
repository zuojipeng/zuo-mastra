/** DeepSeek OpenAI 兼容 API：https://api-docs.deepseek.com */
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

/** Mastra OpenAI-compatible 模型 ID（provider/model） */
export const DEEPSEEK_MODEL_ROUTER_ID = 'deepseek/deepseek-chat';

/** 实际调用的模型名 */
export const DEEPSEEK_MODEL_NAME = 'deepseek-chat';

export function resolveDeepSeekApiKey(explicit?: string): string | undefined {
  return explicit ?? process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY;
}

export function getDeepSeekModelConfig(apiKey?: string): {
  id: string;
  url: string;
  apiKey: string | undefined;
} {
  const key = resolveDeepSeekApiKey(apiKey);
  return {
    id: DEEPSEEK_MODEL_ROUTER_ID,
    url: DEEPSEEK_BASE_URL,
    apiKey: key,
  };
}
