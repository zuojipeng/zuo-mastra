# 🚀 部署和前后端架构说明

## 📌 重要：Mastra 已经包含前端！

**你不需要创建新项目！** Mastra 自带完整的前端界面和 API。

### Mastra 的架构

```
你的项目（当前这个）
├── src/mastra/
│   ├── agents/              ← 你的 Agent 逻辑
│   └── index.ts             ← 注册 Agent
│
运行 npm run dev 或 npm run build 后：
│
├── .mastra/output/          ← Mastra 自动生成
│   ├── 前端页面（HTML/JS）   ← 自动生成的 UI
│   ├── API 路由             ← 自动生成的接口
│   └── 服务器代码            ← 自动生成的后端
```

## 🎯 前后端交互流程

### 1. Mastra 自动生成的 API

当你运行 `npm run dev` 或 `npm run build` 时，Mastra 会自动创建：

```
GET  /api/agents                          # 获取所有 Agent 列表
POST /api/agents/promptOptimizerAgent/generate  # 调用 Agent
GET  /api/agents/promptOptimizerAgent/threads   # 获取对话历史
```

### 2. 前端调用示例

Mastra 内置的前端会这样调用你的 Agent：

```javascript
// 用户在界面输入提示词后
const response = await fetch('/api/agents/promptOptimizerAgent/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '用户输入的提示词' }
    ]
  })
});

const data = await response.json();
// data.text 就是 Agent 的回复
```

## 🌐 部署到 Cloudflare Pages

### 步骤 1：准备代码

```bash
# 1. 构建项目
npm run build

# 这会生成 .mastra/output/ 目录，包含所有前端和后端代码
```

### 步骤 2：推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 步骤 3：在 Cloudflare 部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 选择你的 GitHub 仓库
4. 配置构建设置：
   ```
   Build command: npm run build
   Build output directory: .mastra/output
   Root directory: /
   ```
5. 添加环境变量：
   - `OPENAI_API_KEY`: 你的 OpenAI 密钥
6. 点击 **Save and Deploy**

### 步骤 4：访问你的应用

部署完成后，Cloudflare 会给你一个 URL，例如：
```
https://your-project.pages.dev
```

访问这个 URL，你就能看到 Mastra 的界面，选择 "Prompt Optimizer Agent" 开始使用！

## 🎨 如果你想自定义前端

### 方案 1：修改 Mastra 内置 UI（简单）

Mastra 的 UI 配置在构建时生成，你可以通过环境变量或配置文件调整样式。

### 方案 2：创建独立前端（复杂但灵活）

如果你想完全自定义前端：

#### 1. 创建前端项目（Next.js/React/Vue 等）

```bash
# 在另一个目录
npx create-next-app my-frontend
cd my-frontend
```

#### 2. 调用 Mastra API

```typescript
// 在你的前端代码中
async function optimizePrompt(userInput: string) {
  const response = await fetch('https://your-mastra-api.pages.dev/api/agents/promptOptimizerAgent/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: userInput }
      ]
    })
  });
  
  const data = await response.json();
  return data.text;
}
```

#### 3. 分别部署

- **后端（Mastra）**: 部署到 Cloudflare Pages（如上）
- **前端**: 部署到 Vercel/Netlify/Cloudflare Pages

#### 4. 配置 CORS（如果需要）

在 `src/mastra/index.ts` 中添加：

```typescript
export const mastra = new Mastra({
  // ... 其他配置
  cors: {
    origin: 'https://your-frontend.vercel.app', // 你的前端域名
    credentials: true,
  },
});
```

## 🔧 推荐方案

### 对于初体验（推荐）

**直接使用 Mastra 内置 UI**
- ✅ 零配置
- ✅ 开箱即用
- ✅ 部署简单
- ✅ 适合快速分享给朋友

### 对于长期产品

**创建独立前端**
- ✅ 完全自定义界面
- ✅ 更好的用户体验
- ✅ 可以添加用户系统、支付等
- ❌ 需要额外开发时间

## 📝 环境变量配置

### 本地开发（.env）

```bash
OPENAI_API_KEY=sk-proj-...
```

### Cloudflare Pages 环境变量

在 Cloudflare Dashboard 中设置：
1. 进入你的 Pages 项目
2. **Settings** → **Environment variables**
3. 添加：
   - Variable name: `OPENAI_API_KEY`
   - Value: `sk-proj-...`
4. 选择 **Production** 和 **Preview** 环境
5. 保存并重新部署

## 🎯 总结

### 当前项目就够用了！

```bash
# 开发
npm run dev          # 本地运行，访问 localhost:3000

# 部署
npm run build        # 构建
# 然后推送到 GitHub，在 Cloudflare 连接仓库即可
```

### 前后端交互

```
用户浏览器
    ↓
Mastra 前端（自动生成）
    ↓
Mastra API（自动生成）
    ↓
你的 Agent（src/mastra/agents/prompt-optimizer-agent.ts）
    ↓
OpenAI API
    ↓
返回优化结果
```

**一切都在一个项目里，不需要分离！**

