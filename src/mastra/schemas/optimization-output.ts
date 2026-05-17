import { z } from 'zod';

export const promptVersionSchema = z.object({
  style: z.string().describe('风格名称，如「电影纪实」「赛博朋克」'),
  positive_prompt: z.string().describe('正向提示词，可直接用于 AI 视频/绘图工具'),
  negative_prompt: z.string().describe('负向提示词，用于排除常见 AI 生成缺陷'),
  reasoning: z.string().describe('本版本采用的镜头/光影/运动等设计理由'),
});

export const timelineSegmentSchema = z.object({
  time: z.string().describe('时间段，如 0-3s'),
  shot: z.string().describe('景别、机位、镜头运动与转场设计'),
  action: z.string().describe('人物动作、调度、环境互动和关键事件'),
  expression: z.string().describe('人物表情、情绪变化和眼神细节'),
  audio: z.string().describe('环境声、音乐、台词或拟音提示'),
});

export const optimizationOutputSchema = z.object({
  analysis: z.string().describe('原始提示词的问题与改进方向分析'),
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
  suggestions: z.array(z.string()).min(1).describe('可进一步尝试的优化建议'),
});

export type OptimizationOutput = z.infer<typeof optimizationOutputSchema>;

export const OPTIMIZATION_OUTPUT_JSON_EXAMPLE = `{
  "analysis": "原始提示词的问题分析",
  "timeline": [
    {
      "time": "0-3s",
      "shot": "Wide shot, rain-soaked alley, slow dolly-in from behind the protagonist, hard cut into action.",
      "action": "两名角色在狭窄巷口对峙，雨水从屋檐落下，地面积水反射霓虹。",
      "expression": "主角压低眉眼，呼吸急促但克制，对手露出挑衅的冷笑。",
      "audio": "Heavy rain, distant thunder, low cinematic drone, footsteps splashing."
    },
    {
      "time": "3-6s",
      "shot": "Medium handheld tracking shot, camera circles left, quick whip pan on first punch.",
      "action": "第一拳擦过脸颊，角色侧身闪避，肘击反制，雨水随动作飞溅。",
      "expression": "主角咬紧牙关，眼神从迟疑变得坚定。",
      "audio": "Punch whoosh, wet fabric friction, short breath, bass hit."
    },
    {
      "time": "6-9s",
      "shot": "Low-angle close-up, 35mm lens, shallow depth of field, slow motion for impact.",
      "action": "双方近身缠斗，膝撞、格挡、推向墙面，墙上霓虹灯闪烁。",
      "expression": "对手愤怒失控，主角脸上混合疼痛与决绝。",
      "audio": "Muffled impact, neon buzz, rain intensifies."
    },
    {
      "time": "9-12s",
      "shot": "Overhead shot transitions into tight close-up, match cut on falling water.",
      "action": "两人同时发起最后一击，拳头命中对方，身体失去平衡。",
      "expression": "两人眼神短暂交汇，表情从狠厉转为震惊。",
      "audio": "Music drops out, single heartbeat, sharp impact."
    },
    {
      "time": "12-15s",
      "shot": "Static wide shot, slow push-in, final fade to black.",
      "action": "两人同时倒入水洼，雨水打在脸上，霓虹倒影被涟漪撕碎。",
      "expression": "主角闭眼前露出疲惫的释然，对手停止挣扎。",
      "audio": "Rain only, distant siren, final low boom."
    }
  ],
  "full_prompt": "15-second cinematic video, ...",
  "negative_prompt": "plastic texture, bad anatomy, extra limbs, flickering, inconsistent lighting, watermark, text overlay...",
  "versions": [
    {
      "style": "15秒分镜版",
      "positive_prompt": "与 full_prompt 内容一致或更紧凑的可复制提示词",
      "negative_prompt": "与 negative_prompt 内容一致",
      "reasoning": "说明如何通过时间轴、镜头、动作和声音增强可生成性"
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
