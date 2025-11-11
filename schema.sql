-- Cloudflare D1 数据库结构
-- 用于存储对话历史

-- 对话表
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  messages TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 索引：按用户查询
CREATE INDEX IF NOT EXISTS idx_user_id ON conversations(user_id);

-- 索引：按会话查询
CREATE INDEX IF NOT EXISTS idx_session_id ON conversations(session_id);

-- 索引：按时间排序
CREATE INDEX IF NOT EXISTS idx_created_at ON conversations(created_at DESC);

