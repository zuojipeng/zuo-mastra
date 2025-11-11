/**
 * ========================================
 * React 前端调用示例
 * ========================================
 * 
 * 在你的 React 项目中使用这个组件
 */

import { useState } from 'react';

// API 地址（部署后替换为你的实际地址）
const API_URL = 'https://your-worker.workers.dev/api/optimize';

export default function PromptOptimizer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * 调用后端 API 优化提示词
   */
  const handleOptimize = async () => {
    // 清空之前的结果
    setResult('');
    setError('');
    
    // 验证输入
    if (!input.trim()) {
      setError('请输入要优化的提示词');
      return;
    }

    setLoading(true);

    try {
      // 调用后端 API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
        }),
      });

      const data = await response.json();

      // 处理响应
      if (data.success) {
        setResult(data.data.optimizedPrompt);
      } else {
        setError(data.error || '优化失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('API error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prompt-optimizer">
      <h2>AI 提示词优化器</h2>
      
      {/* 输入框 */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入你想优化的提示词，例如：帮我翻译这段话"
        rows={4}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />

      {/* 优化按钮 */}
      <button 
        onClick={handleOptimize}
        disabled={loading}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        {loading ? '优化中...' : '优化提示词'}
      </button>

      {/* 错误提示 */}
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          ❌ {error}
        </div>
      )}

      {/* 优化结果 */}
      {result && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>优化结果：</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

