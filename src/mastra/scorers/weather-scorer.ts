// 该文件定义了用于评估天气 Agent 表现的一组“评分器（scorers）”
// - toolCallAppropriatenessScorer：判断是否在合适的场景下调用了指定工具（weatherTool）
// - completenessScorer：判断回答在信息维度上是否完整
// - translationScorer：自定义基于 LLM 的评估，判断用户使用的非英文地名是否被正确翻译并在回答中使用
import { z } from 'zod';
import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/code';
import { createCompletenessScorer } from '@mastra/evals/scorers/code';
import { createScorer } from '@mastra/core/scores';

// 判断“是否应该调用”以及“是否正确调用了”预期工具（weatherTool）
// - expectedTool: 目标工具名
// - strictMode: 为 true 时更严格；此处为 false，允许一定宽松判断
export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: 'weatherTool',
  strictMode: false,
});

// 用于检查回答是否包含所需信息要点的通用“完整性”评分器
export const completenessScorer = createCompletenessScorer();

// 自定义的 LLM 评测器：评估非英文地名是否被正确翻译并在回答中合理使用
export const translationScorer = createScorer({
  name: 'Translation Quality',
  description:
    'Checks that non-English location names are translated and used correctly',
  type: 'agent',
  judge: {
    // 作为裁判的模型与评测指令
    model: 'openai/gpt-4o-mini',
    instructions:
      'You are an expert evaluator of translation quality for geographic locations. ' +
      'Determine whether the user text mentions a non-English location and whether the assistant correctly uses an English translation of that location. ' +
      'Be lenient with transliteration differences and diacritics. ' +
      'Return only the structured JSON matching the provided schema.',
  },
})
  // 预处理：抽取用户与助理文本，作为后续分析输入
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    return { userText, assistantText };
  })
  .analyze({
    // 使用 LLM 进行结构化分析，产出 JSON
    description:
      'Extract location names and detect language/translation adequacy',
    outputSchema: z.object({
      // nonEnglish: 是否出现了非英文地名
      nonEnglish: z.boolean(),
      // translated: 助理是否使用了正确的英文翻译
      translated: z.boolean(),
      // confidence: 评判置信度（0-1）
      confidence: z.number().min(0).max(1).default(1),
      // explanation: 可选的评判说明
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
            You are evaluating if a weather assistant correctly handled translation of a non-English location.
            User text:
            """
            ${results.preprocessStepResult.userText}
            """
            Assistant response:
            """
            ${results.preprocessStepResult.assistantText}
            """
            Tasks:
            1) Identify if the user mentioned a location that appears non-English.
            2) If non-English, check whether the assistant used a correct English translation of that location in its response.
            3) Be lenient with transliteration differences (e.g., accents/diacritics).
            Return JSON with fields:
            {
            "nonEnglish": boolean,
            "translated": boolean,
            "confidence": number, // 0-1
            "explanation": string
            }
        `,
  })
  // 依据分析结果生成数值分：不涉及翻译场景则满分；翻译正确则 0.7-1 之间；翻译错误则 0 分
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    if (!r.nonEnglish) return 1; // If not applicable, full credit
    if (r.translated)
      return Math.max(0, Math.min(1, 0.7 + 0.3 * (r.confidence ?? 1)));
    return 0; // Non-English but not translated
  })
  // 生成可读的评分理由，便于审计与 Debug
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Translation scoring: nonEnglish=${r.nonEnglish ?? false}, translated=${r.translated ?? false}, confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ''}`;
  });

// 统一导出，便于在评测流程中批量引用
export const scorers = {
  toolCallAppropriatenessScorer,
  completenessScorer,
  translationScorer,
};
