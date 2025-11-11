# 🎯 AI 提示词优化 Agent

基于 Mastra 框架开发的智能提示词优化助手，部署在 Cloudflare Workers + D1，支持对话记忆。

## ✨ 功能

- 📊 分析原始提示词的问题
- ✨ 生成优化后的多个版本
- 💡 提供详细的改进建议
- 🧠 支持对话记忆（D1 持久化存储）
- 🌍 全球 CDN 部署（Cloudflare Workers）

## 🚀 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/zuojipeng/zuo-mastra.git
cd zuo-mastra
npm install
```

### 2. 初始化数据库

```bash
# 数据库已创建，直接初始化表结构
wrangler d1 execute prompt-optimizer-db --file=schema.sql
```

### 3. 配置 API Key

```bash
wrangler secret put OPENAI_API_KEY
# 输入你的 OpenAI API Key
```

### 4. 部署

```bash
wrangler deploy
```

完成！🎉

## 📡 API 使用

### 端点 1：优化提示词

```bash
POST https://prompt-optimizer.hahazuo460.workers.dev/api/optimize
```

**请求示例：**

```javascript
const response = await fetch('https://prompt-optimizer.hahazuo460.workers.dev/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': 'user123',      // 可选：用户ID，启用记忆功能
    'X-Session-Id': 'session456' // 可选：会话ID，隔离不同对话
  },
  body: JSON.stringify({
    message: '帮我翻译这段话'
  })
});

const data = await response.json();
console.log(data.data.optimizedPrompt);
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "originalPrompt": "帮我翻译这段话",
    "optimizedPrompt": "📊 原始提示词分析\n...",
    "sessionId": "session456",
    "hasHistory": true
  },
  "metadata": {
    "model": "gpt-4o-mini",
    "timestamp": "2025-11-11T14:56:13.420Z",
    "historyCount": 3
  }
}
```

### 端点 2：查看历史记录

```bash
GET https://prompt-optimizer.hahazuo460.workers.dev/api/history
```

**请求示例：**

```javascript
const response = await fetch('https://prompt-optimizer.hahazuo460.workers.dev/api/history', {
  headers: {
    'X-User-Id': 'user123',
    'X-Session-Id': 'session456'
  }
});

const data = await response.json();
console.log(data.data.history);
```

### 端点 3：健康检查

```bash
GET https://prompt-optimizer.hahazuo460.workers.dev/api/health
```

## 💻 前端集成示例

### React 示例

```tsx
import { useState } from 'react';

const API_URL = 'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize';

export default function PromptOptimizer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // 生成或获取用户ID
  const userId = localStorage.getItem('userId') || `user-${Date.now()}`;
  const sessionId = sessionStorage.getItem('sessionId') || `session-${Date.now()}`;

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
          'X-Session-Id': sessionId,
        },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      setResult(data.data.optimizedPrompt);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入要优化的提示词"
      />
      <button onClick={handleOptimize} disabled={loading}>
        {loading ? '优化中...' : '优化提示词'}
      </button>
      {result && <pre>{result}</pre>}
    </div>
  );
}
```

### 原生 JavaScript 示例

```javascript
async function optimizePrompt(message) {
  // 生成或获取用户ID和会话ID
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = `user-${Date.now()}`;
    localStorage.setItem('userId', userId);
  }

  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session-${Date.now()}`;
    sessionStorage.setItem('sessionId', sessionId);
  }

  // 调用API
  const response = await fetch('https://prompt-optimizer.hahazuo460.workers.dev/api/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-Session-Id': sessionId,
    },
    body: JSON.stringify({ message })
  });

  const data = await response.json();
  return data.data.optimizedPrompt;
}

// 使用
optimizePrompt('帮我翻译这段话').then(result => {
  console.log(result);
});
```

## 🏗️ 项目结构

```
zuo-mastra/
├── src/mastra/
│   ├── agents/
│   │   └── prompt-optimizer-agent.ts  # Agent 定义（含详细注释）
│   └── index.ts                        # Mastra 配置
├── workers-entry-d1.ts                 # Cloudflare Workers 入口（D1版本）
├── schema.sql                          # D1 数据库结构
├── wrangler.toml                       # Cloudflare Workers 配置
└── README.md                           # 本文件
```

## 🛠️ 技术栈

- **框架**: Mastra
- **运行环境**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **LLM**: OpenAI GPT-4o-mini
- **语言**: TypeScript

## 🔧 本地开发

```bash
# 本地运行（使用本地D1数据库）
wrangler dev

# 查看数据库内容
wrangler d1 execute prompt-optimizer-db --command="SELECT * FROM conversations LIMIT 10"
```

## 💰 成本

### Cloudflare Workers 免费额度
- 每天 10 万次请求
- 全球 CDN 分发

### Cloudflare D1 免费额度
- 每天 500 万次读取
- 每天 10 万次写入
- 5 GB 存储空间

### OpenAI API
- GPT-4o-mini: 约 $0.0003-$0.0008 / 次
- 1000 次优化约 $0.30-$0.80

**对于个人项目完全免费！**

## 📝 配置说明

### 请求头（可选）

| 请求头 | 说明 | 默认值 |
|--------|------|--------|
| `X-User-Id` | 用户唯一标识，用于隔离不同用户的数据 | `anonymous` |
| `X-Session-Id` | 会话ID，用于隔离不同对话 | 自动生成 |

### 对话记忆
- Agent 会自动读取最近 5 条对话作为上下文
- 支持多用户、多会话并发
- 自动清理 30 天前的旧数据

## 🐛 故障排查

### 问题 1：部署后 API 返回 500
**解决：** 检查 OPENAI_API_KEY 是否正确设置
```bash
wrangler secret list
```

### 问题 2：数据库错误
**解决：** 确认数据库已初始化
```bash
wrangler d1 execute prompt-optimizer-db --file=schema.sql
```

### 问题 3：无法记住对话
**解决：** 确保请求中包含 `X-User-Id` 和 `X-Session-Id` 请求头

## 📄 许可

MIT

---

**在线体验：** https://prompt-optimizer.hahazuo460.workers.dev/api/health
