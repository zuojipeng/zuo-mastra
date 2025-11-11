/**
 * Cloudflare Workers 专用配置
 * 
 * 与标准版本的区别：
 * - 使用无 Memory 的 Agent
 * - 使用内存存储（不持久化）
 */

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { promptOptimizerAgent } from './agents/prompt-optimizer-agent-workers';

export const mastra = new Mastra({
  // 注册 Prompt Optimizer Agent（Workers 兼容版）
  agents: { promptOptimizerAgent },
  
  // Workers 版本：使用内存存储（不持久化）
  // storage: 使用默认的内存存储
  
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  
  telemetry: {
    enabled: false,
  },
  
  observability: {
    default: { enabled: true },
  },
});

