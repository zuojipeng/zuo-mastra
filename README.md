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

每个摘要同时返回从 workspace payload 派生的交接与生产证据：

- `handoffReady`
- `handoffBlockingIssueCount`
- `handoffBlockingReasons`
- `iterationCount` / `latestIterationFocus`
- `calibrationCount` / `latestCalibrationPlatform` / `latestCalibrationOutcome`
- `selectedAttemptCount`
- `latestSelectedAttemptProvider` / `latestSelectedAttemptModel` / `latestSelectedAttemptStatus`

这些字段从完整 workspace payload 计算，不要求额外 D1 列。只有被项目显式选中的有效镜头尝试才会进入 `selectedAttemptCount` 和最近出片摘要；缺失或旧版 payload 返回 `0` / `null`，不会猜测最新尝试。

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

推荐通过 GitHub Actions 手动发布：

1. 在 GitHub 仓库 Secrets 配置 `CLOUDFLARE_API_TOKEN`。
2. 打开 Actions -> `Worker Release`。
3. 点击 `Run workflow`。
4. 选择 `deploy=true`。
5. 如有 D1 schema 变更，选择 `apply_schema=true`。
6. 等待 `Projects API production smoke` 通过。

也可以从本地终端安全发布。脚本只从环境变量读取 token，不会把 token 写入命令行：

```bash
npm run release:worker -- --dry-run
export CLOUDFLARE_API_TOKEN="<token from your shell/session manager>"
npm run release:worker -- --deploy --apply-schema
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
- Worker dry-run bundle 通过。
- `/api/health` 返回成功。
- `npm run test:projects` 通过。
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
│   ├── release-worker.mjs
│   └── projects-api-smoke.mjs
├── workers-entry-d1.ts
├── schema.sql
├── wrangler.toml
└── package.json
```
