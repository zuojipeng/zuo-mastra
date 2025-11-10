# ✅ 部署前检查清单

## 📋 GitHub 上传前

- [ ] 确认 `.env` 文件在 `.gitignore` 中（已包含）
- [ ] 删除敏感信息（API Key 等）
- [ ] 测试本地运行：`npm run dev`
- [ ] 测试构建：`npm run build`

## 🚀 推送到 GitHub

```bash
# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: AI Prompt Optimizer Agent"

# 创建主分支
git branch -M main

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送
git push -u origin main
```

## ☁️ Cloudflare Pages 部署

### 步骤 1：连接 GitHub

1. 登录 https://dash.cloudflare.com/
2. 左侧菜单：**Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**
6. 授权 Cloudflare 访问你的 GitHub
7. 选择你的仓库

### 步骤 2：配置构建

```
Project name: prompt-optimizer（或你喜欢的名字）
Production branch: main
Build command: npm run build
Build output directory: .mastra/output
Root directory: /（保持默认）
```

### 步骤 3：环境变量

在 **Environment variables** 部分添加：

```
Variable name: OPENAI_API_KEY
Value: sk-proj-你的实际密钥
```

**重要**：同时勾选 **Production** 和 **Preview** 环境。

### 步骤 4：部署

点击 **Save and Deploy**，等待构建完成（通常 2-5 分钟）。

### 步骤 5：访问

构建成功后，Cloudflare 会提供一个 URL：
```
https://prompt-optimizer.pages.dev
```

访问这个地址，你应该能看到 Mastra 的界面！

## 🧪 部署后测试

- [ ] 访问部署的 URL
- [ ] 选择 "Prompt Optimizer Agent"
- [ ] 输入测试提示词：`帮我写个文章`
- [ ] 确认 Agent 正常回复
- [ ] 测试多轮对话（记忆功能）

## 🔧 常见问题

### 问题 1：构建失败

**检查：**
- Node.js 版本是否 >= 20（在 Cloudflare 设置中可以指定）
- 环境变量是否正确配置

### 问题 2：部署成功但无法访问

**检查：**
- 构建输出目录是否正确：`.mastra/output`
- 查看 Cloudflare 的构建日志

### 问题 3：API Key 错误

**检查：**
- 环境变量名称是否正确：`OPENAI_API_KEY`
- 密钥是否有效且有余额
- 是否同时勾选了 Production 和 Preview 环境

### 问题 4：Agent 不显示

**检查：**
- `src/mastra/index.ts` 中是否正确注册了 Agent
- 重新部署（Cloudflare Dashboard → Deployments → Retry deployment）

## 📱 分享给朋友

部署成功后，直接把 URL 发给朋友：

```
嘿，试试我做的 AI 提示词优化工具：
https://your-project.pages.dev

选择 "Prompt Optimizer Agent"，输入你想优化的提示词就行！
```

## 🎯 后续优化

部署成功后，你可以：

- [ ] 自定义域名（在 Cloudflare Pages 设置中）
- [ ] 添加使用统计（Google Analytics 等）
- [ ] 优化 Agent 的 instructions
- [ ] 添加更多 Agent
- [ ] 创建自定义前端界面

## 📊 监控

在 Cloudflare Dashboard 中可以查看：
- 访问量统计
- 构建历史
- 错误日志
- 性能指标

路径：**Workers & Pages** → 选择你的项目 → **Analytics**

---

完成以上步骤，你的 AI Agent 就上线了！🎉

