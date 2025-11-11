# 🚀 部署到 Vercel（推荐方案）

由于 Mastra 使用了 Node.js 内置模块，Cloudflare Workers 不支持。**Vercel 是更好的选择**。

## ✅ 为什么选择 Vercel？

- ✅ 完整的 Node.js 环境支持
- ✅ Mastra 可以直接运行
- ✅ 部署超级简单（3 步完成）
- ✅ 自动 HTTPS
- ✅ 免费额度充足

---

## 🚀 部署步骤

### 方式 1：通过 GitHub（最简单）

#### 步骤 1：推送代码到 GitHub

```bash
# 如果还没推送
git add .
git commit -m "Add Vercel deployment config"
git push origin main
```

#### 步骤 2：连接 Vercel

1. 访问 https://vercel.com/
2. 点击 **Import Project**
3. 选择你的 GitHub 仓库 `zuo-mastra`
4. Vercel 会自动检测配置

#### 步骤 3：配置环境变量

在 Vercel 部署页面：
1. 找到 **Environment Variables** 部分
2. 添加：
   - Name: `OPENAI_API_KEY`
   - Value: `sk-proj-你的密钥`
3. 选择 **Production**、**Preview**、**Development** 三个环境

#### 步骤 4：部署

点击 **Deploy**，等待 2-3 分钟。

完成后你会得到一个 URL：
```
https://zuo-mastra.vercel.app
```

---

### 方式 2：使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 按提示操作：
# - Set up and deploy? Yes
# - Which scope? 选择你的账号
# - Link to existing project? No
# - Project name? zuo-mastra
# - Directory? ./ (默认)
# - Override settings? No

# 4. 设置环境变量
vercel env add OPENAI_API_KEY
# 输入你的 API Key

# 5. 重新部署（使环境变量生效）
vercel --prod
```

---

## 🌐 访问你的 API

部署成功后，你的 API 地址：

```
https://zuo-mastra.vercel.app
```

### 测试端点

```bash
# 测试健康检查（如果 Mastra 提供）
curl https://zuo-mastra.vercel.app/api/health

# 测试 Agent（使用 Mastra 的标准端点）
curl -X POST https://zuo-mastra.vercel.app/api/agents/promptOptimizerAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "帮我翻译这段话"
      }
    ]
  }'
```

---

## 💻 在前端调用

### 更新 API 地址

在前端代码中，将 API 地址改为你的 Vercel URL：

```javascript
// React 示例
const API_URL = 'https://zuo-mastra.vercel.app/api/agents/promptOptimizerAgent/generate';

const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '帮我翻译这段话' }
    ]
  })
});

const data = await response.json();
console.log(data.text); // Agent 的回复
```

---

## 🔄 更新部署

### 通过 GitHub（自动部署）

```bash
# 修改代码后
git add .
git commit -m "Update agent"
git push origin main

# Vercel 会自动检测并重新部署
```

### 通过 CLI

```bash
vercel --prod
```

---

## 💰 成本

### Vercel 免费额度

- 100 GB 带宽/月
- 100 小时函数执行时间/月
- 无限部署次数

对于个人项目和小型应用完全够用！

### OpenAI API 成本

- 每次优化约 $0.0003 - $0.0008
- 1000 次优化约 $0.30 - $0.80

---

## 🎯 与 Cloudflare Workers 的对比

| 特性 | Vercel | Cloudflare Workers |
|------|--------|-------------------|
| Node.js 支持 | ✅ 完整支持 | ❌ 部分支持 |
| Mastra 兼容性 | ✅ 完美 | ❌ 不兼容 |
| 部署难度 | ⭐ 超简单 | ⭐⭐⭐ 需要改造 |
| 免费额度 | 100GB/月 | 10万请求/天 |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## 🐛 常见问题

### Q1: 部署后 API 返回 500 错误

**A:** 检查环境变量是否正确设置：
1. 进入 Vercel Dashboard
2. 选择项目 → Settings → Environment Variables
3. 确认 `OPENAI_API_KEY` 存在且正确
4. 重新部署

### Q2: 如何查看日志？

**A:** 
```bash
# 使用 CLI
vercel logs

# 或在 Vercel Dashboard
# 项目 → Deployments → 选择部署 → Function Logs
```

### Q3: 如何绑定自定义域名？

**A:**
1. Vercel Dashboard → 项目 → Settings → Domains
2. 添加你的域名
3. 按提示配置 DNS

---

## 🎉 总结

使用 Vercel 部署的优势：

1. ✅ **零配置**：Mastra 直接运行
2. ✅ **自动部署**：推送代码自动更新
3. ✅ **全球 CDN**：速度快
4. ✅ **免费额度大**：个人项目够用

**下一步：**

```bash
# 1. 推送代码到 GitHub
git push origin main

# 2. 访问 Vercel
https://vercel.com/

# 3. Import 你的仓库

# 4. 添加环境变量 OPENAI_API_KEY

# 5. Deploy！
```

部署完成后，在前端项目中使用你的 Vercel URL 即可！🚀

