/** AI 视频/视觉创作提示词专业知识库（嵌入 system prompt） */

export const CAMERA_LANGUAGE_TERMS = [
  'establishing wide shot',
  'medium close-up',
  'tight close-up',
  'locked-off tripod shot',
  'slow dolly-in',
  'side tracking shot',
  'over-the-shoulder composition',
  'low-angle hero shot',
  'eye-level documentary framing',
  'foreground occlusion',
  'motivated camera movement',
  'shallow depth of field',
  'deep focus',
  '35mm lens',
  '50mm lens',
  '85mm portrait lens',
  'anamorphic',
  'subtle handheld micro-shake',
  'steadicam walk-and-talk',
] as const;

export const LIGHTING_ATMOSPHERE_TERMS = [
  'natural practical lighting',
  'motivated light source',
  'Rembrandt lighting',
  'soft window light',
  'overcast daylight',
  'sodium streetlight',
  'volumetric fog',
  'golden hour',
  'rim light',
  'high contrast',
  'soft diffused light',
  'chiaroscuro',
  'realistic shadow falloff',
] as const;

export const STYLE_TEXTURE_TERMS = [
  'photorealistic live-action footage',
  'documentary realism',
  'cinematic realism',
  'high-detail skin texture',
  'natural fabric texture',
  'real glass and metal reflections',
  'production design realism',
  'film grain',
  '8k resolution',
  'raw footage',
  'vintage 16mm',
  'subtle professional color grade',
] as const;

export const MOTION_TIMING_TERMS = [
  'slow-motion',
  'time-lapse',
  'motivated subject movement',
  'static shot',
  'smooth camera glide',
  'parallax',
  'match cut',
  'hold on reaction',
  'one action beat per shot',
] as const;

export const DEFAULT_NEGATIVE_PROMPT_TERMS = [
  'plastic texture',
  'waxy skin',
  'bad anatomy',
  'extra limbs',
  'deformed hands',
  'distorted fingers',
  'face morphing',
  'identity drift',
  'duplicate person',
  'jpeg artifacts',
  'oversmooth skin',
  '3D render look',
  'CGI look',
  'watermark',
  'text overlay',
  'blurry',
  'soft focus unless intended',
  'low-detail background',
  'mushy texture',
  'distorted face',
  'flickering',
  'inconsistent lighting',
  'inconsistent scale',
  'warped architecture',
  'low resolution',
  'cartoonish unless intended',
] as const;

/** 导演模式：风格预设关键词（前端可传 style 字段） */
export const DIRECTOR_STYLE_PRESETS: Record<string, string> = {
  'wong-kar-wai': 'inspired by Wong Kar-wai, neon-soaked streets, step-printing motion blur, melancholic romance, saturated reds and greens',
  'wes-anderson': 'Wes Anderson style, symmetrical framing, pastel palette, whimsical deadpan, flat staging',
  epic: 'epic cinematic scale, sweeping wide shots, dramatic orchestral mood, golden hour, heroic composition',
  cyberpunk: 'cyberpunk aesthetic, neon noir, rain-slick streets, holographic ads, high contrast magenta and cyan',
  documentary: 'documentary realism, handheld subtle shake, natural light, observational framing, authentic texture',
};

export function formatTermList(terms: readonly string[]): string {
  return terms.join(', ');
}
