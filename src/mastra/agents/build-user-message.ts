import type { OptimizationScenario } from './build-prompt-instructions';

export type OptimizeRequestBody = {
  message: string;
  scenario?: OptimizationScenario;
  style?: string;
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
  parts.push(body.message.trim());
  return parts.join('\n');
}
