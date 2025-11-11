# Cloudflare Workers + 持久化存储方案

## 🎯 方案对比

| 方案 | 适合场景 | 复杂度 | 成本 |
|------|---------|--------|------|
| **D1 (SQLite)** | 完整对话历史 | ⭐⭐ | 免费额度大 |
| **KV** | 简单键值存储 | ⭐ | 免费额度中 |
| **Durable Objects** | 实时协作 | ⭐⭐⭐⭐ | 按使用付费 |
| **外部数据库** | 已有数据库 | ⭐⭐⭐ | 依赖服务商 |

---

## 方案 1：Cloudflare D1（推荐）

### 什么是 D1？
- Cloudflare 的 SQLite 数据库服务
- 完全兼容 SQL
- 可以直接替代 LibSQLStore
- 免费额度：每天 500 万次读取，10 万次写入

### 实现步骤

#### 1. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create prompt-optimizer-db

# 输出会显示数据库 ID，复制它
# Database created: prompt-optimizer-db
# database_id = "xxxx-xxxx-xxxx-xxxx"
```

#### 2. 更新 wrangler.toml

```toml
name = "prompt-optimizer"
main = "workers-entry.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# 绑定 D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "prompt-optimizer-db"
database_id = "你的数据库ID"
```

#### 3. 初始化数据库表

```bash
# 创建 SQL 文件
cat > schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  messages TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON conversations(user_id);
EOF

# 执行 SQL
wrangler d1 execute prompt-optimizer-db --file=schema.sql
```

#### 4. 修改 Workers 代码使用 D1

```typescript
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // env.DB 就是你的 D1 数据库
    
    // 保存对话
    await env.DB.prepare(
      'INSERT INTO conversations (id, user_id, messages) VALUES (?, ?, ?)'
    ).bind(conversationId, userId, JSON.stringify(messages)).run();
    
    // 读取对话历史
    const { results } = await env.DB.prepare(
      'SELECT messages FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(userId).all();
    
    return response;
  }
};
```

---

## 方案 2：Cloudflare KV（简单但功能有限）

### 什么是 KV？
- 键值对存储
- 非常快，但不支持复杂查询
- 适合简单的会话存储

### 实现步骤

#### 1. 创建 KV namespace

```bash
wrangler kv:namespace create "CONVERSATIONS"
```

#### 2. 更新 wrangler.toml

```toml
[[kv_namespaces]]
binding = "CONVERSATIONS"
id = "你的KV_ID"
```

#### 3. 使用 KV

```typescript
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const userId = 'user123';
    
    // 保存对话
    await env.CONVERSATIONS.put(
      `user:${userId}`,
      JSON.stringify(messages),
      { expirationTtl: 86400 * 30 } // 30天过期
    );
    
    // 读取对话
    const history = await env.CONVERSATIONS.get(`user:${userId}`, 'json');
    
    return response;
  }
};
```

---

## 方案 3：使用外部数据库（最灵活）

### 支持的数据库
- **Turso**（推荐）：SQLite as a Service，完美配合 Mastra
- **Supabase**：PostgreSQL + REST API
- **PlanetScale**：MySQL + HTTP API

### Turso 示例（最接近原版）

#### 1. 创建 Turso 数据库

```bash
# 安装 Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 登录
turso auth login

# 创建数据库
turso db create prompt-optimizer

# 获取连接 URL
turso db show prompt-optimizer --url
# 获取认证 token
turso db tokens create prompt-optimizer
```

#### 2. 在 Workers 中使用

```typescript
import { createClient } from '@libsql/client/web';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const db = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_TOKEN,
    });
    
    // 使用 SQL 查询
    const result = await db.execute({
      sql: 'SELECT * FROM conversations WHERE user_id = ?',
      args: [userId]
    });
    
    return response;
  }
};
```

#### 3. 配置环境变量

```bash
wrangler secret put TURSO_URL
wrangler secret put TURSO_TOKEN
```

---

## 🎯 推荐方案：D1（最简单）

### 完整实现代码

我可以帮你创建一个完整的 D1 版本，包括：
1. 自动创建数据库
2. 保存和读取对话历史
3. 按用户 ID 隔离数据
4. 自动清理过期数据

### 优势
- ✅ 免费额度大
- ✅ 无需外部服务
- ✅ 与 LibSQLStore 兼容
- ✅ 部署简单

### 限制
- ⚠️ 每次查询有延迟（~50-100ms）
- ⚠️ 不适合超高频写入

---

## 💡 我的建议

对于你的提示词优化 Agent：

1. **如果需要完整对话历史** → 用 **D1**
2. **如果只需要记住最近几次对话** → 用 **KV**
3. **如果需要跨多个服务共享数据** → 用 **Turso**

---

## 🚀 下一步

想让我帮你实现哪个方案？

1. **D1 版本**（推荐）- 我会创建完整的代码和配置
2. **KV 版本**（最简单）- 适合快速上线
3. **Turso 版本**（最灵活）- 可以在多个平台共享数据

告诉我你的选择，我立即帮你实现！

