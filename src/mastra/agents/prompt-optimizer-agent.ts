import { createPromptOptimizerAgent } from './create-prompt-optimizer-agent';

/**
 * AI 视频创作提示词优化 Agent（MVP）
 * 默认场景：video；可通过 createPromptOptimizerAgent({ scenario }) 切换
 */
export const promptOptimizerAgent = createPromptOptimizerAgent({
  scenario: 'video',
  withMemory: true,
});

export { createPromptOptimizerAgent } from './create-prompt-optimizer-agent';
export { buildPromptInstructions } from './build-prompt-instructions';
export type { OptimizationScenario } from './build-prompt-instructions';
export { DIRECTOR_STYLE_PRESETS } from './video-prompt-knowledge';
export {
  optimizationOutputSchema,
  parseOptimizationOutput,
  type OptimizationOutput,
} from '../schemas/optimization-output';
