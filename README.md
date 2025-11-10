# 🎯 AI 智能提示词优化 Agent

帮助用户优化 AI 提示词的智能助手，让普通人也能写出专业级的提示词。

## ✨ 功能

- 📊 分析原始提示词的问题
- ✨ 生成优化后的多个版本  
- 💡 提供详细的改进建议
- 🎯 支持各类 AI 工具场景

## 🚀 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/你的用户名/你的仓库名.git
cd 你的仓库名
npm install
```

### 2. 配置 API Key

创建 `.env` 文件：

```bash
OPENAI_API_KEY=sk-proj-你的OpenAI密钥
```

> 获取密钥：https://platform.openai.com/api-keys

### 3. 启动

```bash
npm run dev
```

访问 `http://localhost:3000`，选择 **Prompt Optimizer Agent** 开始使用。

## 🌐 在线体验

部署后的地址：`https://your-project.pages.dev`

## 📖 使用示例

**输入：**
```
帮我写个文章
```

**输出：**
```
📊 原始提示词分析
- 用户意图：需要生成文章
- 当前问题：缺少主题、受众、风格等信息
- 适用场景：文本生成类 AI 工具

✨ 优化后的提示词
版本 1：通用优化版
请帮我写一篇关于 [具体主题] 的文章...

版本 2：详细增强版
我需要一篇关于 [具体主题] 的 [文章类型] 文章...

💡 优化要点说明
1. 明确主题：让 AI 有明确方向
2. 定义受众：AI 能调整语言风格
...

🎯 使用建议
- 推荐场景：任何需要 AI 生成长文本的场景
- 注意事项：根据实际需求填写 [...] 中的内容
```

## 🚀 部署到 Cloudflare Pages

### 方式 1：通过 Dashboard（推荐）

1. 推送代码到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
4. 选择仓库并配置：
   ```
   Build command: npm run build
   Build output directory: .mastra/output
   ```
5. 添加环境变量：
   - `OPENAI_API_KEY`: 你的密钥
6. 部署完成！

### 方式 2：使用 Wrangler CLI

```bash
# 安装并登录
npm install -g wrangler
wrangler login

# 构建并部署
npm run build
wrangler pages deploy .mastra/output --project-name=prompt-optimizer
```

详细部署说明：查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🧪 本地测试

```bash
# 自动测试（预设案例）
npx tsx test-prompt-optimizer.ts

# 交互式测试（输入你自己的提示词）
npx tsx interactive-test.ts
```

## 🏗️ 项目结构

```
src/mastra/
├── agents/
│   └── prompt-optimizer-agent.ts  # Agent 核心逻辑（含详细注释）
└── index.ts                        # Mastra 配置

test-prompt-optimizer.ts            # 测试脚本
interactive-test.ts                 # 交互式测试
```

## 🛠️ 技术栈

- **框架**: Mastra（内置前端 + API）
- **LLM**: OpenAI GPT-4o-mini
- **语言**: TypeScript
- **数据库**: LibSQL

## 💡 架构说明

Mastra 自动生成前端和 API，你不需要单独创建前端项目：

```
你的代码（src/mastra/）
    ↓
npm run build
    ↓
.mastra/output/（自动生成前端 + 后端 + API）
    ↓
部署到 Cloudflare
```

API 端点：
- `POST /api/agents/promptOptimizerAgent/generate` - 调用 Agent
- `GET /api/agents` - 获取 Agent 列表

详细说明：[DEPLOYMENT.md](./DEPLOYMENT.md)

## 📝 许可

MIT

