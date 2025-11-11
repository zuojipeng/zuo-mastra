/**
 * 测试 Vercel 部署的 API 是否正常工作
 * 
 * 运行方式：
 * node test-vercel-api.js
 */

const API_URL = 'https://zuo-mastra-athk4drp6-zuojipengs-projects.vercel.app/api/agents/promptOptimizerAgent/generate';

async function testAPI() {
  console.log('🧪 开始测试 Vercel API...\n');
  console.log('📡 API 地址:', API_URL);
  console.log('');

  try {
    console.log('⏳ 发送请求...');
    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: '帮我翻译这段话'
          }
        ]
      })
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ 请求完成 (耗时: ${duration}秒)`);
    console.log('📊 HTTP 状态码:', response.status);
    console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 请求失败:');
      console.error('状态码:', response.status);
      console.error('错误信息:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ API 返回成功！');
    console.log('');
    console.log('📦 返回数据结构:');
    console.log('- 是否有 text 字段:', !!data.text);
    console.log('- 是否有 usage 字段:', !!data.usage);
    console.log('- 是否有 finishReason 字段:', !!data.finishReason);
    console.log('');
    
    if (data.text) {
      console.log('📝 Agent 回复内容（前 500 字符）:');
      console.log('─'.repeat(80));
      console.log(data.text.substring(0, 500));
      if (data.text.length > 500) {
        console.log('...(内容过长，已截断)');
      }
      console.log('─'.repeat(80));
    }

    console.log('');
    console.log('📊 完整响应数据:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ 测试失败:');
    console.error(error);
    
    if (error.message.includes('fetch')) {
      console.log('');
      console.log('💡 提示：如果是网络错误，请检查：');
      console.log('1. 网络连接是否正常');
      console.log('2. Vercel 部署是否成功');
      console.log('3. API 地址是否正确');
    }
  }
}

// 运行测试
testAPI();

