import { z } from 'zod';

export const directorKitTargetDurations = ['15s', '30s', '60s', '90s'] as const;

export const directorKitTargetTypes = [
  'wasteland',
  'ancient',
  'cyberpunk',
  'wuxia',
  'thriller',
  'romance',
  'scifi',
  'comedy',
  'black-humor',
  'custom',
] as const;

export const directorKitPlatforms = ['seedance', 'kling', 'runway', 'general'] as const;

export const creativeDiagnosisSchema = z.object({
  feasibilityScore: z.number().min(0).max(100),
  keyRisks: z.array(z.string()),
  riskLevel: z.enum(['low', 'medium', 'high']),
  suggestedAdjustments: z.array(z.string()),
  recommendedDirection: z.string(),
});

export const reconstructVersionSchema = z.object({
  versionType: z.enum(['safest', 'stylish', 'cinematic']),
  label: z.string(),
  summary: z.string(),
  rewrittenIdea: z.string(),
  whyThisWorks: z.string(),
  reducedRisks: z.array(z.string()),
  bestFor: z.string(),
});

export const shotCardSchema = z.object({
  shotId: z.number().int().positive(),
  duration: z.string(),
  purpose: z.string(),
  framing: z.string(),
  description: z.string(),
  action: z.string(),
  mood: z.string(),
  motion: z.string(),
  generationMode: z.enum(['text-to-video', 'image-to-video', 'reference-image']),
  consistencyNeed: z.enum(['low', 'medium', 'high']),
  riskLevel: z.enum(['low', 'medium', 'high']),
  riskTags: z.array(z.string()),
  fixSuggestion: z.string(),
});

export const directorKitSchema = z.object({
  diagnosis: creativeDiagnosisSchema,
  versions: z.tuple([reconstructVersionSchema, reconstructVersionSchema, reconstructVersionSchema]),
  selectedVersion: reconstructVersionSchema.nullable(),
  storySetting: z.object({
    logline: z.string(),
    directorIntent: z.string(),
    protagonist: z.string(),
    worldSetting: z.string(),
    visualMotif: z.string(),
  }),
  shotCards: z.array(shotCardSchema).min(1),
  masterPrompt: z.string(),
  negativePrompt: z.string(),
  platformAdvice: z.array(
    z.object({
      platform: z.string(),
      note: z.string(),
      recommended: z.boolean(),
    }),
  ),
  postProductionAdvice: z.object({
    editingRhythm: z.string(),
    soundEffects: z.array(z.string()),
    music: z.string(),
    subtitles: z.string(),
  }),
  riskRemediation: z.object({
    topRisks: z.array(z.string()),
    alternativeShots: z.array(z.string()),
    backupStrategies: z.array(z.string()),
  }),
});

export type DirectorKit = z.infer<typeof directorKitSchema>;
export type DirectorKitTargetDuration = (typeof directorKitTargetDurations)[number];
export type DirectorKitTargetType = (typeof directorKitTargetTypes)[number];
export type DirectorKitPlatform = (typeof directorKitPlatforms)[number];

export function parseDirectorKitOutput(text: string): DirectorKit {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, trimmed];
  const jsonStr = (jsonMatch[1] ?? trimmed).trim();
  const parsed = JSON.parse(jsonStr) as unknown;
  return directorKitSchema.parse(parsed);
}
