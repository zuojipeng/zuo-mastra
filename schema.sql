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

-- 反馈表：用于 V1/V2 提示词反馈、DirectorKit 反馈和反馈洞察
CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  input TEXT,
  prompt TEXT,
  shot_index INTEGER,
  rating TEXT NOT NULL CHECK (rating IN ('like', 'dislike')),
  comment TEXT,
  event_type TEXT DEFAULT 'legacy_prompt',
  source TEXT DEFAULT 'v1',
  director_kit_id TEXT,
  target_duration TEXT,
  target_type TEXT,
  selected_version_type TEXT,
  platform TEXT,
  generation_mode TEXT,
  risk_level TEXT,
  risk_tags TEXT,
  failure_reasons TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_event_type ON feedbacks(event_type);
CREATE INDEX IF NOT EXISTS idx_feedback_platform ON feedbacks(platform);
CREATE INDEX IF NOT EXISTS idx_feedback_target_type ON feedbacks(target_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedbacks(created_at DESC);

-- 项目表：用于保存镜词项目工作区，支持项目仪表盘和后续云端同步
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  creative_input TEXT,
  target_duration TEXT,
  target_type TEXT,
  stage TEXT NOT NULL,
  payload TEXT NOT NULL,
  shot_count INTEGER DEFAULT 0,
  completed_shot_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_stage ON projects(user_id, stage);
