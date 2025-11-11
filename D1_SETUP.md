# 🗄️ D1 持久化存储部署指南

## 📋 完整步骤

### 步骤 1：创建 D1 数据库

```bash
cd /Users/edy/Desktop/my-prompt-mastra-agent
wrangler d1 create prompt-optimizer-db
```

输出示例：
```
✅ Successfully created DB 'prompt-optimizer-db'!

[[d1_databases]]
binding = "DB"
database_name = "prompt-optimizer-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**复制 `database_id`，下一步需要用！**

### 步骤 2：更新 wrangler.toml

打开 `wrangler.toml`，添加数据库配置：

```toml
name = "prompt-optimizer"
main = "workers-entry-d1.ts"  # 注意：改用 D1 版本
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# D1 数据库配置
[[d1_databases]]
binding = "DB"
database_name = "prompt-optimizer-db"
database_id = "你的database_id"  # 替换为步骤1得到的ID
```

### 步骤 3：初始化数据库表

```bash
# 执行 SQL schema
wrangler d1 execute prompt-optimizer-db --file=schema.sql
```

输出示例：
```
🌀 Mapping SQL input into an array of statements
🌀 Executing on prompt-optimizer-db (xxxxxxxx):
🌀 To execute on your remote database, add a --remote flag to your wrangler command.
├ [0] CREATE TABLE IF NOT EXISTS conversations ...
│   ✔ Ok
```

### 步骤 4：部署到 Workers

```bash
wrangler deploy
```

完成！现在你的 Agent 支持持久化存储了！

---

## 🧪 测试

### 测试 1：发送消息（会自动保存）

```bash
curl -X POST https://prompt-optimizer.hahazuo460.workers.dev/api/optimize \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user123" \
  -H "X-Session-Id: session456" \
  -d '{"message":"帮我翻译这段话"}'
```

### 测试 2：查看历史记录

```bash
curl -X GET https://prompt-optimizer.hahazuo460.workers.dev/api/history \
  -H "X-User-Id: user123" \
  -H "X-Session-Id: session456"
```

### 测试 3：健康检查

```bash
curl https://prompt-optimizer.hahazuo460.workers.dev/api/health
```

---

## 💻 前端调用示例

### 基础调用（无记忆）

```javascript
const response = await fetch('https://prompt-optimizer.hahazuo460.workers.dev/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '帮我翻译这段话'
  })
});

const data = await response.json();
console.log(data.data.optimizedPrompt);
```

### 带用户 ID 和会话 ID（支持记忆）

```javascript
// 生成或获取用户 ID（可以是登录用户的 ID）
const userId = localStorage.getItem('userId') || `user-${Date.now()}`;
localStorage.setItem('userId', userId);

// 生成或获取会话 ID（每次对话一个新的 session）
const sessionId = sessionStorage.getItem('sessionId') || `session-${Date.now()}`;
sessionStorage.setItem('sessionId', sessionId);

// 发送请求
const response = await fetch('https://prompt-optimizer.hahazuo460.workers.dev/api/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    'X-Session-Id': sessionId,
  },
  body: JSON.stringify({
    message: '帮我翻译这段话'
  })
});

const data = await response.json();
console.log(data.data.optimizedPrompt);
console.log('Has history:', data.data.hasHistory);
```

### 查看历史记录

```javascript
const response = await fetch('https://prompt-optimizer.hahazuo460.workers.dev/api/history', {
  method: 'GET',
  headers: {
    'X-User-Id': userId,
    'X-Session-Id': sessionId,
  }
});

const data = await response.json();
console.log('History:', data.data.history);
```

---

## 🎯 功能说明

### 1. 自动保存对话
- 每次调用 API 都会自动保存到 D1
- 包含用户消息和 Agent 回复
- 按用户 ID 和会话 ID 隔离

### 2. 上下文记忆
- Agent 会读取最近 5 条对话作为上下文
- 支持连续对话，Agent 能记住之前的内容
- 按会话隔离，不同会话不会互相干扰

### 3. 数据管理
- 自动清理 30 天前的旧数据
- 按用户和会话查询历史
- 支持获取历史记录 API

### 4. 请求头说明

| 请求头 | 必需 | 说明 |
|--------|------|------|
| `X-User-Id` | 可选 | 用户唯一标识，不提供则为 `anonymous` |
| `X-Session-Id` | 可选 | 会话 ID，不提供则自动生成 |

---

## 💰 成本估算

### D1 免费额度
- **读取**：每天 500 万次
- **写入**：每天 10 万次
- **存储**：5 GB

### 使用量估算
- 每次对话：1 次写入 + 1 次读取
- 1000 个用户，每人每天 10 次对话
- = 10,000 次写入 + 10,000 次读取
- **完全在免费额度内！**

---

## 🔧 本地测试（可选）

D1 支持本地测试：

```bash
# 本地开发模式
wrangler dev

# 测试本地数据库
wrangler d1 execute prompt-optimizer-db --local --command="SELECT * FROM conversations"
```

---

## 📊 数据库管理

### 查看所有对话

```bash
wrangler d1 execute prompt-optimizer-db --command="SELECT * FROM conversations LIMIT 10"
```

### 清空数据

```bash
wrangler d1 execute prompt-optimizer-db --command="DELETE FROM conversations"
```

### 查看统计

```bash
wrangler d1 execute prompt-optimizer-db --command="
  SELECT 
    user_id,
    COUNT(*) as conversation_count,
    MAX(created_at) as last_interaction
  FROM conversations
  GROUP BY user_id
"
```

---

## ✅ 完成！

现在你的 Cloudflare Workers Agent 拥有：
- ✅ 全球 CDN 部署
- ✅ 持久化存储（D1）
- ✅ 对话记忆功能
- ✅ 用户和会话隔离
- ✅ 自动数据清理
- ✅ 免费额度充足

享受你的强大 AI Agent 吧！🚀

