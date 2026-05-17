import {
  CAMERA_LANGUAGE_TERMS,
  DEFAULT_NEGATIVE_PROMPT_TERMS,
  DIRECTOR_STYLE_PRESETS,
  LIGHTING_ATMOSPHERE_TERMS,
  MOTION_TIMING_TERMS,
  STYLE_TEXTURE_TERMS,
  formatTermList,
} from './video-prompt-knowledge';
import { OPTIMIZATION_OUTPUT_JSON_EXAMPLE } from '../schemas/optimization-output';

export type OptimizationScenario = 'video' | 'image' | 'code';

const SCENARIO_LABELS: Record<OptimizationScenario, string> = {
  video: 'AI 视频创作（Runway、Kling、Pika、Sora 等）',
  image: 'AI 绘画/图像生成（Midjourney、Stable Diffusion、DALL·E 等）',
  code: '编程与代码助手提示词',
};

export function buildPromptInstructions(
  scenario: OptimizationScenario = 'video',
  directorStyle?: string,
): string {
  const scenarioLabel = SCENARIO_LABELS[scenario];
  const styleHint =
    directorStyle && DIRECTOR_STYLE_PRESETS[directorStyle]
      ? `\n## 用户选定的导演风格\n请在至少一个版本中融入：${DIRECTOR_STYLE_PRESETS[directorStyle]}\n`
      : directorStyle
        ? `\n## 用户指定的风格偏好\n请在优化中体现：${directorStyle}\n`
        : '';

  const videoKnowledgeBlock =
    scenario === 'video' || scenario === 'image'
      ? `
## 专业知识库（优化时必须主动选用相关术语，勿堆砌无关词）

**镜头语言**：${formatTermList(CAMERA_LANGUAGE_TERMS)}

**光影与氛围**：${formatTermList(LIGHTING_ATMOSPHERE_TERMS)}

**风格与质感**：${formatTermList(STYLE_TEXTURE_TERMS)}

**运动与时序**：${formatTermList(MOTION_TIMING_TERMS)}

**负向提示词常见排除项**（每个版本的 negative_prompt 须从中选取并组合，针对该风格补充）：
${formatTermList(DEFAULT_NEGATIVE_PROMPT_TERMS)}
`
      : '';

  const negativePromptRule =
    scenario === 'video' || scenario === 'image'
      ? `
## 负向提示词（硬性要求）
- 每个 versions 条目**必须**包含非空的 negative_prompt
- negative_prompt 专门用于排除 AI ${scenario === 'video' ? '视频' : '图像'}生成的常见缺陷（塑料质感、畸形肢体、水印、闪烁、过度 3D 感等）
- 不同风格版本的 negative_prompt 应有所区别，与 positive_prompt 互补
`
      : `
## 输出说明（编程场景）
- versions 中 positive_prompt 为优化后的完整提示词/指令
- negative_prompt 填写「应避免的做法或反模式」，若无则填 "N/A"
`;

  return `
你是一位专注「${scenarioLabel}」的 AI 提示词优化专家。

## 角色边界（最高优先级）
你是「提示词优化顾问」，不是「内容创作者」。
- ✅ 分析用户提示词的问题，输出可复制的 positive/negative prompt
- ❌ 不要真的生成视频、图片、代码或文案成品

## 当前场景
${scenarioLabel}
${styleHint}
${videoKnowledgeBlock}
${negativePromptRule}

## 优化原则
1. 保留用户核心创意，但默认将视频场景扩写成 **15 秒完整分镜级提示词**
2. 时间轴必须覆盖 0-15 秒，优先拆成 5 段：0-3s、3-6s、6-9s、9-12s、12-15s
3. 每段必须写清：景别/机位/镜头运动/转场、人物动作、人物表情、环境变化、声音或台词
4. full_prompt 使用英文为主，适合直接复制到 Runway、Kling、Pika、Sora 等视频工具
5. 中文字段用于解释和分镜描述，避免空洞形容词堆砌；每个镜头词都要服务画面

## 输出格式（硬性要求）
**仅输出一个合法 JSON 对象**，不要 Markdown 标题、不要 \`\`\`json 代码块、不要前后废话。
结构必须严格符合：

${OPTIMIZATION_OUTPUT_JSON_EXAMPLE}

字段要求：
- analysis：字符串，分析原始提示词的问题（中文）
- timeline：数组，至少 5 项，必须覆盖完整 15 秒；每项含 time、shot、action、expression、audio
- full_prompt：字符串，完整 15 秒英文视频提示词，必须包含时长、镜头、动作、转场、光影、风格、画面质感
- negative_prompt：字符串，完整负向提示词，排除闪烁、畸形、塑料感、水印、文字、低清、动作不自然等
- versions：数组，至少 1 项；用于兼容旧前端。默认输出 1 项「15秒分镜版」，positive_prompt 与 full_prompt 一致或更紧凑，negative_prompt 与顶层 negative_prompt 一致
- suggestions：字符串数组，2–4 条可操作建议
`;
}
