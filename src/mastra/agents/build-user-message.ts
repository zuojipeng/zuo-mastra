import type { OptimizationScenario } from './build-prompt-instructions';

export type OptimizeRequestBody = {
  message: string;
  scenario?: OptimizationScenario;
  style?: string;
  projectBible?: {
    protagonist?: string;
    mission?: string;
    world?: string;
    visualSymbols?: string[];
    lookAndFeel?: string;
    continuityRules?: string[];
    shotIntent?: string;
  };
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
  if (body.projectBible) {
    parts.push('高级导演模式：请把下面的作品设定作为画面描述的审美和内容约束。');
    if (body.projectBible.protagonist) {
      parts.push(`主角设定：${body.projectBible.protagonist}`);
    }
    if (body.projectBible.mission) {
      parts.push(`角色任务：${body.projectBible.mission}`);
    }
    if (body.projectBible.world) {
      parts.push(`世界观：${body.projectBible.world}`);
    }
    if (body.projectBible.visualSymbols?.length) {
      parts.push(`固定视觉符号：${body.projectBible.visualSymbols.join('、')}`);
      parts.push(
        '硬性要求：这些固定视觉符号必须在 prompt 画面描述中明确出现，形成视觉记忆点。',
      );
    }
    if (body.projectBible.lookAndFeel) {
      parts.push(`统一视觉风格：${body.projectBible.lookAndFeel}`);
    }
    if (body.projectBible.continuityRules?.length) {
      parts.push(`连续性规则：${body.projectBible.continuityRules.join('；')}`);
    }
    if (body.projectBible.shotIntent) {
      parts.push(`镜头目的：${body.projectBible.shotIntent}`);
    }
    parts.push(
      '输出时必须在 prompt 中反复体现这些作品设定，不要把画面描述写成互不相关的元素堆砌。',
    );
  }
  if (body.refinement) {
    parts.push(`请对「${body.refinement.label}」进行画面描述的局部优化。`);
    parts.push('原始画面描述如下，这是唯一创意来源，必须保留其中的主体、场景、核心动作和情绪：');
    parts.push(body.refinement.content.trim());
    parts.push('用户希望这次优化做到：');
    parts.push(body.message.trim());
    if (body.refinement.instruction) {
      parts.push(`额外要求：${body.refinement.instruction}`);
    }
    parts.push(
      '禁止把原始画面描述改写成无关故事；禁止替换主体或场景；如果原始描述没有明确出现打斗、攻击、对手、血迹、武器，不允许新增这些元素。',
    );
    parts.push('请仍然返回 {"prompt": "..."} 格式。');
    return parts.join('\n');
  }
  parts.push(body.message.trim());
  return parts.join('\n');
}
