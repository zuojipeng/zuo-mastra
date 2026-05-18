import type { OptimizationScenario } from './build-prompt-instructions';

export type OptimizeRequestBody = {
  message: string;
  scenario?: OptimizationScenario;
  style?: string;
  refinement?: {
    targetType: 'full_prompt' | 'negative_prompt' | 'timeline_segment' | 'platform_variant' | 'version';
    label: string;
    content: string;
    instruction?: string;
  };
};

const VALID_SCENARIOS = new Set<OptimizationScenario>(['video', 'image', 'code']);

export function normalizeScenario(value: unknown): OptimizationScenario {
  if (typeof value === 'string' && VALID_SCENARIOS.has(value as OptimizationScenario)) {
    return value as OptimizationScenario;
  }
  return 'video';
}

export function buildUserMessage(body: OptimizeRequestBody): string {
  const parts: string[] = [];
  if (body.scenario && body.scenario !== 'video') {
    parts.push(`[场景: ${body.scenario}]`);
  }
  if (body.style) {
    parts.push(`[风格偏好: ${body.style}]`);
  }
  if (body.refinement) {
    parts.push(`请对「${body.refinement.label}」进行局部继续优化。`);
    parts.push(`目标类型：${body.refinement.targetType}`);
    parts.push('原始片段如下，这是唯一创意来源，必须保留其中的主体、场景、人物关系、核心动作和情绪：');
    parts.push(body.refinement.content.trim());
    parts.push('用户希望这次局部优化做到：');
    parts.push(body.message.trim());
    if (body.refinement.instruction) {
      parts.push(`额外要求：${body.refinement.instruction}`);
    }
    parts.push(
      '禁止把原始片段改写成无关故事；禁止替换主体或场景；如果原始片段没有明确出现打斗、攻击、对手、血迹、武器，不允许新增这些元素。',
    );
    parts.push('请仍然返回完整 JSON，但 analysis 必须说明本次局部优化保留了哪些原始片段元素。');
    return parts.join('\n');
  }
  parts.push(body.message.trim());
  return parts.join('\n');
}
