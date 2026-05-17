import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import {
  buildPromptInstructions,
  type OptimizationScenario,
} from './build-prompt-instructions';
import {
  DEEPSEEK_MODEL_NAME,
  getDeepSeekModelConfig,
} from '../llm/model-config';

export { DEEPSEEK_MODEL_NAME };

export function createPromptOptimizerAgent(options?: {
  scenario?: OptimizationScenario;
  directorStyle?: string;
  withMemory?: boolean;
  apiKey?: string;
}) {
  const scenario = options?.scenario ?? 'video';
  const instructions = buildPromptInstructions(scenario, options?.directorStyle);

  return new Agent({
    name: 'AI Video Prompt Optimizer',
    instructions,
    model: getDeepSeekModelConfig(options?.apiKey),
    tools: {},
    scorers: {},
    ...(options?.withMemory !== false
      ? {
          memory: new Memory({
            storage: new LibSQLStore({
              url: 'file:../mastra.db',
            }),
          }),
        }
      : {}),
  });
}
