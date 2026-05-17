/** AI 视频/视觉创作提示词专业知识库（嵌入 system prompt） */

export const CAMERA_LANGUAGE_TERMS = [
  'cinematic',
  'close-up',
  'wide shot',
  'dolly zoom',
  'tracking shot',
  'shallow depth of field',
  'deep focus',
  '35mm lens',
  'anamorphic',
  'handheld',
  'steadicam',
  'bird\'s eye view',
  'low angle',
  'over-the-shoulder',
] as const;

export const LIGHTING_ATMOSPHERE_TERMS = [
  'Rembrandt lighting',
  'neon noir',
  'volumetric fog',
  'golden hour',
  'moody atmosphere',
  'rim light',
  'high contrast',
  'soft diffused light',
  'backlit silhouette',
  'chiaroscuro',
] as const;

export const STYLE_TEXTURE_TERMS = [
  'Wes Anderson style',
  'inspired by Wong Kar-wai',
  'film grain',
  '8k resolution',
  'raw footage',
  'documentary realism',
  'epic cinematic',
  'cyberpunk aesthetic',
  'vintage 16mm',
  'color graded teal and orange',
] as const;

export const MOTION_TIMING_TERMS = [
  'slow-motion',
  'time-lapse',
  'whip pan transition',
  'dynamic motion',
  'static shot',
  'smooth camera glide',
  'parallax',
  'match cut',
  'freeze frame',
] as const;

export const DEFAULT_NEGATIVE_PROMPT_TERMS = [
  'plastic texture',
  'bad anatomy',
  'extra limbs',
  'jpeg artifacts',
  'oversmooth skin',
  '3D render look',
  'watermark',
  'text overlay',
  'blurry',
  'distorted face',
  'flickering',
  'inconsistent lighting',
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
