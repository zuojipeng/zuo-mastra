import { z } from 'zod';

export const promptVersionSchema = z.object({
  style: z.string().describe('风格名称，如「电影纪实」「赛博朋克」'),
  positive_prompt: z.string().describe('正向提示词，可直接用于 AI 视频/绘图工具'),
  negative_prompt: z.string().describe('负向提示词，用于排除常见 AI 生成缺陷'),
  reasoning: z.string().describe('本版本采用的镜头/光影/运动等设计理由'),
});

export const platformVariantSchema = z.object({
  platform: z.enum(['Kling', 'Runway', 'Pika', 'Sora', 'Seedance']).describe('目标视频生成平台'),
  prompt: z.string().describe('针对该平台可直接复制的英文 prompt'),
  usage_notes: z.string().describe('该平台使用建议，如时长、运动强度、镜头描述重点'),
  constraint_notes: z.string().describe('该平台常见限制或需要避免的问题'),
});

export const timelineSegmentSchema = z.object({
  time: z.string().describe('时间段，如 0-3s'),
  shot: z.string().describe('景别、机位、镜头运动与转场设计'),
  action: z.string().describe('人物动作、调度、环境互动和关键事件'),
  expression: z.string().describe('人物表情、情绪变化和眼神细节'),
  audio: z.string().describe('环境声、音乐、台词或拟音提示'),
});

export const continuityPlanSchema = z.object({
  protagonist_lock: z.string().describe('主角外观、身份和行为方式的连续性锁定'),
  recurring_visual_symbols: z.array(z.string()).min(1).describe('需要跨镜头重复出现的固定视觉符号'),
  world_rules: z.array(z.string()).min(1).describe('世界观、材质、光线、时代感等统一规则'),
  shot_intents: z.array(z.string()).min(5).describe('每个时间段的单一镜头目的'),
});

export const optimizationOutputSchema = z.object({
  analysis: z.string().describe('原始提示词的问题与改进方向分析'),
  continuity_plan: continuityPlanSchema.describe('短片统一审美和连续性管理方案'),
  timeline: z
    .array(timelineSegmentSchema)
    .min(5)
    .describe('15 秒视频的分镜时间轴，默认按 0-3s、3-6s、6-9s、9-12s、12-15s 拆分'),
  full_prompt: z.string().describe('可直接复制到 AI 视频工具的完整 15 秒英文提示词'),
  negative_prompt: z.string().describe('完整负向提示词，用于排除视频生成缺陷'),
  versions: z
    .array(promptVersionSchema)
    .min(1)
    .max(3)
    .describe('兼容旧前端的版本列表；默认至少 1 项，positive_prompt 应与 full_prompt 一致'),
  platform_variants: z
    .array(platformVariantSchema)
    .min(5)
    .describe('针对主流 AI 视频平台的可复制版本，必须包含 Kling、Runway、Pika、Sora、Seedance'),
  suggestions: z.array(z.string()).min(1).describe('可进一步尝试的优化建议'),
});

export type OptimizationOutput = z.infer<typeof optimizationOutputSchema>;

export const OPTIMIZATION_OUTPUT_JSON_EXAMPLE = `{
  "analysis": "原始提示词的问题分析",
  "continuity_plan": {
    "protagonist_lock": "女孩始终保持同一件深色雨衣、同一把透明伞和克制警觉的行为方式。",
    "recurring_visual_symbols": ["透明伞", "红绿霓虹倒影"],
    "world_rules": ["整支短片保持雨夜霓虹巷道", "湿地反光和低调悬疑光线贯穿每个镜头"],
    "shot_intents": ["建立地点与主角", "强化听觉线索", "制造回头悬念", "凝固情绪", "留下开放结尾"]
  },
  "timeline": [
    {
      "time": "0-3s",
      "shot": "Wide shot, rain-soaked alley, slow dolly-in from behind the girl, neon reflections on wet asphalt.",
      "action": "女孩独自走在雨夜巷口，听见身后脚步声后放慢脚步，雨水从屋檐落下。",
      "expression": "她的眼神从游离变得警觉，呼吸变浅但仍保持克制。",
      "audio": "Heavy rain, distant traffic hum, soft footsteps splashing behind her."
    },
    {
      "time": "3-6s",
      "shot": "Medium close-up, handheld micro-movement, shallow depth of field, neon rim light on her face.",
      "action": "女孩停下脚步，肩膀微微绷紧，手指攥住外套边缘，慢慢侧耳倾听。",
      "expression": "她的眉眼压低，嘴唇微张，警觉中带着克制的不安。",
      "audio": "Rain grows louder, footsteps become clearer, low suspense drone."
    },
    {
      "time": "6-9s",
      "shot": "Over-the-shoulder shot, slow push-in, background figure remains out of focus.",
      "action": "她缓慢回头，伞面边缘划过画面，身后的模糊影子停在远处。",
      "expression": "她的瞳孔微微放大，表情在害怕和好奇之间摇摆。",
      "audio": "Single piano note, rain on umbrella, footsteps stop."
    },
    {
      "time": "9-12s",
      "shot": "Tight close-up, 35mm lens, neon red and green reflections moving across her face.",
      "action": "她没有后退，只是轻轻屏住呼吸，雨水沿着发梢滴落到肩头。",
      "expression": "紧张逐渐变成一种复杂的释然，眼神仍保持警惕。",
      "audio": "Heartbeat-like bass, neon buzz, rain softens for a moment."
    },
    {
      "time": "12-15s",
      "shot": "Static wide shot, slow push-in, alley framed by neon signs and deep shadows.",
      "action": "女孩转身继续向前走，身后的脚步声没有再靠近，水洼中的霓虹被涟漪打散。",
      "expression": "她恢复平静，但眼神里还残留一丝不安。",
      "audio": "Rain only, distant traffic, final low ambient note."
    }
  ],
  "full_prompt": "15-second cinematic video, a girl in a rain-soaked neon alley hears footsteps behind her...",
  "negative_prompt": "plastic texture, bad anatomy, extra limbs, flickering, inconsistent lighting, watermark, text overlay...",
  "versions": [
    {
      "style": "15秒分镜版",
      "positive_prompt": "与 full_prompt 内容一致或更紧凑的可复制提示词",
      "negative_prompt": "与 negative_prompt 内容一致",
      "reasoning": "说明如何通过时间轴、镜头、动作和声音增强可生成性"
    }
  ],
  "platform_variants": [
    {
      "platform": "Kling",
      "prompt": "Kling-optimized English prompt with clear subject consistency, camera movement, action beats, lighting, and duration.",
      "usage_notes": "Use concise motion verbs, keep the subject consistent, and avoid overloading the scene with too many events.",
      "constraint_notes": "Avoid conflicting camera moves, excessive character count, and vague style-only descriptions."
    },
    {
      "platform": "Runway",
      "prompt": "Runway-optimized English prompt emphasizing cinematic camera language, scene continuity, lighting, and temporal progression.",
      "usage_notes": "Prioritize shot type, camera motion, visual mood, and a clean action arc.",
      "constraint_notes": "Avoid rapid scene changes, dense plot beats, and unclear subject references."
    },
    {
      "platform": "Pika",
      "prompt": "Pika-optimized English prompt with compact scene setup, visible action, expressive emotion, and stylized motion.",
      "usage_notes": "Keep the prompt punchy and visual; emphasize one primary motion and one emotional beat.",
      "constraint_notes": "Avoid long multi-character choreography and tiny background details."
    },
    {
      "platform": "Sora",
      "prompt": "Sora-optimized English prompt describing a coherent 15-second scene with rich spatial detail, physics, and continuity.",
      "usage_notes": "Use detailed temporal progression, environment interactions, and realistic physical cause and effect.",
      "constraint_notes": "Avoid impossible spatial transitions and contradictory lighting or lens instructions."
    },
    {
      "platform": "Seedance",
      "prompt": "Seedance-optimized English prompt with strong rhythm, stylized motion, character expression, and short-form video clarity.",
      "usage_notes": "Emphasize pacing, expressive movement, mood, and an instantly readable composition.",
      "constraint_notes": "Avoid slow ambiguous setups and overloaded narrative context."
    }
  ],
  "suggestions": ["尝试加入...", "可补充运动描述..."]
}`;

export function parseOptimizationOutput(text: string): OptimizationOutput {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, trimmed];
  const jsonStr = (jsonMatch[1] ?? trimmed).trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  return optimizationOutputSchema.parse(parsed);
}
