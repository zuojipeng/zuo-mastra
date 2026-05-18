# AI 视频分镜 Prompt 服务

这是 AI 视频分镜 Prompt 工作台的服务端。它把一句视频创意扩写成结构化的 15 秒分镜、完整 positive prompt、negative prompt、平台适配版本和后续优化建议。

## 功能

- 分析原始视频创意的问题和改进方向
- 生成 15 秒分镜时间轴
- 生成完整英文 positive prompt
- 生成视频负向提示词
- 输出 Kling、Runway、Pika、Sora、Seedance 平台适配版本
- 支持基于用户和会话的历史上下文

## 本地开发

```bash
npm install
npm run check
```

本地服务运行和部署命令依赖当前环境配置。运行前需要配置模型 API key 和数据库绑定。

## API

### `POST /api/optimize`

请求：

```json
{
  "message": "雨夜街头，一个女孩停在霓虹招牌下，听见身后脚步声后缓慢回头",
  "scenario": "video",
  "style": "wong-kar-wai"
}
```

局部继续优化请求：

```json
{
  "message": "让这个镜头更有压迫感，动作更清楚",
  "scenario": "video",
  "refinement": {
    "targetType": "timeline_segment",
    "label": "3-6s 分镜",
    "content": "时间：3-6s\n镜头：Medium close-up...\n动作：女孩停下脚步...",
    "instruction": "保留原始创意，增强镜头清晰度和可生成性"
  }
}
```

高级导演模式请求：

```json
{
  "message": "一个清洁机器人在废土小镇执行最后一次清扫任务",
  "scenario": "video",
  "projectBible": {
    "protagonist": "复古清洁机器人，牛仔帽，旧金属外壳，动作迟缓但执着",
    "mission": "每天清理废弃小镇，并保护一个红裙人偶",
    "world": "原子朋克废土小镇，慢速丧尸游荡，旧广告牌闪烁",
    "visualSymbols": ["机械鸵鸟", "红裙人偶", "破旧清扫车"],
    "lookAndFeel": "atompunk, retro-futurism, dusty orange light, handcrafted miniature feel",
    "continuityRules": ["主角外观不漂移", "视觉符号重复出现", "每镜头只做一件事"],
    "shotIntent": "建立世界、展示职业、制造反差萌、推进关系、留下悬念"
  }
}
```

开启高级导演模式时，结构化结果会额外返回 `continuity_plan`，用于锁定主角、固定视觉符号、世界规则和每段镜头目的。

`refinement.targetType` 可选值：

- `full_prompt`
- `negative_prompt`
- `timeline_segment`
- `platform_variant`
- `version`

请求头：

| Header | Required | Notes |
| --- | --- | --- |
| `Content-Type: application/json` | Yes | JSON request body |
| `X-User-Id` | No | 用于隔离用户历史 |
| `X-Session-Id` | No | 用于隔离会话历史 |
| `X-Api-Key` | No | 仅在服务端启用 API key 时需要 |

响应：

```json
{
  "success": true,
  "data": {
    "originalPrompt": "雨夜街头，一个女孩停在霓虹招牌下，听见身后脚步声后缓慢回头",
    "scenario": "video",
    "style": "wong-kar-wai",
    "result": {
      "analysis": "原始创意的分析...",
      "timeline": [
        {
          "time": "0-3s",
          "shot": "Wide shot...",
          "action": "角色动作...",
          "expression": "表情变化...",
          "audio": "声音设计..."
        }
      ],
      "full_prompt": "15-second cinematic video...",
      "negative_prompt": "bad anatomy, flickering, watermark...",
      "versions": [
        {
          "style": "15秒分镜版",
          "positive_prompt": "15-second cinematic video...",
          "negative_prompt": "bad anatomy, flickering, watermark...",
          "reasoning": "版本设计理由..."
        }
      ],
      "platform_variants": [
        {
          "platform": "Kling",
          "prompt": "Kling-optimized English prompt...",
          "usage_notes": "使用建议...",
          "constraint_notes": "限制提醒..."
        }
      ],
      "suggestions": ["可进一步尝试的优化建议"]
    },
    "sessionId": "session-id",
    "hasHistory": false
  },
  "metadata": {
    "model": "deepseek-chat",
    "timestamp": "2026-05-18T00:00:00.000Z",
    "historyCount": 0
  }
}
```

### `GET /api/history`

按 `X-User-Id` 和可选 `X-Session-Id` 返回最近历史记录。

### `GET /api/health`

返回服务健康状态、记忆能力和当前功能开关。

## 项目结构

```text
.
├── docs/
│   └── product-delivery-ddo-2026.md
├── src/mastra/
│   ├── agents/
│   │   ├── build-prompt-instructions.ts
│   │   ├── build-user-message.ts
│   │   └── video-prompt-knowledge.ts
│   ├── llm/
│   │   └── model-config.ts
│   └── schemas/
│       └── optimization-output.ts
├── workers-entry-d1.ts
├── schema.sql
├── wrangler.toml
└── package.json
```

## 质量门槛

```bash
npm run check
```

每次上线前至少确认：

- TypeScript check 通过
- `/api/health` 返回成功
- `/api/optimize` 能返回 `result.platform_variants`
- 前端可以渲染时间轴、主 prompt、负向词和平台版本

## 配置项

| Name | Notes |
| --- | --- |
| `DEEPSEEK_API_KEY` | 模型调用 key |
| `DB` | 历史记录数据库绑定 |
| `ALLOWED_ORIGINS` | 允许访问 API 的前端 origin，逗号分隔 |
| `API_KEY` | 可选的服务访问 key |
| `DEBUG_ERRORS` | 设为 `true` 时返回更多调试信息 |
