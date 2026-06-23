# 镜词 · AI 短片导演执行包后端

这是镜词的 Cloudflare Worker 后端。它负责把用户的一句 AI 视频创意生成结构化导演执行包，并提供历史、反馈、健康检查等 API 能力。

当前核心能力是 V2 DirectorKit：创意体检、三版重构、故事设定、分镜卡片、主 prompt、负向词、平台建议、后期建议和风险补救。

## 技术栈

- Runtime: Cloudflare Workers
- Database: Cloudflare D1
- Language: TypeScript
- Schema: Zod
- LLM: DeepSeek Chat Completions
- Fallback: OpenAI-compatible Chat Completions

## API

### `POST /api/v2/director-kit`

请求：

```json
{
  "message": "废土小镇里，一个旧清洁机器人守护红裙人偶",
  "targetDuration": "30s",
  "targetType": "wasteland",
  "platform": "seedance"
}
```

响应核心结构：

```json
{
  "success": true,
  "data": {
    "diagnosis": {},
    "versions": [],
    "selectedVersion": null,
    "storySetting": {},
    "shotCards": [],
    "masterPrompt": "",
    "negativePrompt": "",
    "platformAdvice": [],
    "postProductionAdvice": {},
    "riskRemediation": {}
  }
}
```

字段契约由 `src/mastra/schemas/director-kit.ts` 校验。LLM 返回不符合 schema 时会返回 502。

### `POST /api/optimize`

旧版 prompt 优化接口，保留给现有前端兼容路径使用。

### `GET /api/history`

按 `X-User-Id` 和可选 `X-Session-Id` 返回最近历史记录。

### Projects API

项目同步接口使用 `X-User-Id` 做用户隔离，payload 可直接保存前端当前的本地项目工作区结构。

#### `GET /api/projects`

查询当前用户项目列表。支持：

- `limit`: 1-100，默认 50
- `stage`: `input` / `diagnosis` / `reconstruct` / `result`
- `q`: 搜索标题、创意或目标类型

#### `POST /api/projects`

创建或更新项目。

```json
{
  "workspace": {
    "id": "local-project-id",
    "title": "废土小镇里，一个旧清洁机器人守护红裙人偶",
    "creativeInput": "废土小镇里，一个旧清洁机器人守护红裙人偶",
    "targetDuration": "30s",
    "targetType": "wasteland",
    "v2State": "result",
    "directorKit": {},
    "shotExecutionStatus": {},
    "shotResultNotes": {}
  }
}
```

#### `GET /api/projects/:id`

读取单个项目，返回 summary 字段和完整 `payload`。

#### `PUT /api/projects/:id`

按 id 更新项目。若该 id 不存在，会为当前用户创建；若 id 属于其他用户，返回 404。

#### `DELETE /api/projects/:id`

删除当前用户的项目。

### `GET /api/health`

返回服务健康状态和功能开关。

## 模型配置

优先级：

```text
DeepSeek -> OpenAI fallback
```

必选或至少配置一个：

```bash
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
```

可选 fallback 配置：

```bash
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL_NAME=gpt-4.1-mini
```

说明：
- 默认先调用 DeepSeek。
- DeepSeek 返回 401、402、403、429、5xx 时，如果 `OPENAI_API_KEY` 存在，会自动 fallback 到 OpenAI-compatible endpoint。
- 如果 OpenAI secret 实际来自第三方兼容服务，必须同步配置正确的 `OPENAI_BASE_URL` 和 `OPENAI_MODEL_NAME`。
- `DEBUG_ERRORS=true` 只用于短时诊断，不应长期在线上开启。

## 模型预检

本地预检不会打印密钥，只输出 provider 状态、HTTP status 和错误摘要：

```bash
npm run check:models
```

只检查某个 provider：

```bash
npm run check:models -- --provider=deepseek
npm run check:models -- --provider=openai
```

常见结果：
- DeepSeek `402 Insufficient Balance`：账号余额不足，充值后重试。
- OpenAI `404`：通常是 base URL、模型名或 key 所属平台不匹配。
- `missing api key`：环境变量未配置。

## Projects API Smoke

本地 Worker：

```bash
npx --yes wrangler dev --local --port 8787
PROJECTS_API_BASE_URL=http://127.0.0.1:8787 npm run test:projects
```

线上 Worker：

```bash
npm run test:projects
```

该脚本会验证 `/api/health`、项目列表、项目保存、单项目读取和删除。线上返回 `Not found` 表示 Worker 还没有部署包含 Projects API 的版本。

## 本地开发

```bash
npm install
npm run check
```

本地模型预检需要先加载环境变量，例如：

```bash
set -a
source .env
set +a
npm run check:models
```

## 部署

正常部署：

```bash
npx wrangler deploy
```

如果 Wrangler 本机 fetch 通道异常，可以先生成 dry-run bundle：

```bash
npx wrangler deploy --dry-run --outdir /private/tmp/prompt-optimizer-worker-dry-run
```

再按前端仓库 `DEPLOY.md` 中记录的 Workers REST API fallback 流程上传。

## 质量门槛

```bash
npm run check
npm run check:models
```

发布前至少确认：
- TypeScript check 通过。
- `/api/health` 返回成功。
- `/api/v2/director-kit` happy path 返回 `success: true`。
- 空输入 validation 返回 400。
- 模型 provider 至少一个可用。

## 项目结构

```text
.
├── src/mastra/
│   ├── agents/
│   ├── llm/
│   └── schemas/
├── scripts/
│   ├── check-model-providers.mjs
│   └── projects-api-smoke.mjs
├── workers-entry-d1.ts
├── schema.sql
├── wrangler.toml
└── package.json
```
