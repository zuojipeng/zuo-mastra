/**
 * ========================================
 * 提示词优化 Agent 测试文件
 * ========================================
 * 
 * 这个文件用于快速测试 promptOptimizerAgent 的功能
 * 
 * 运行方式：
 * npx tsx test-prompt-optimizer.ts
 * 
 * 或者如果安装了 ts-node：
 * ts-node test-prompt-optimizer.ts
 */

import { mastra } from './src/mastra/index';

/**
 * 主测试函数
 * 演示如何使用 promptOptimizerAgent 优化用户的提示词
 */
async function testPromptOptimizer() {
  console.log('🚀 开始测试提示词优化 Agent...\n');

  // 获取 promptOptimizerAgent 实例
  const agent = mastra.agents.promptOptimizerAgent;

  // 测试案例 1：一个非常简单、模糊的提示词
  const testCase1 = '帮我写个文章';

  console.log('📝 测试案例 1：模糊的提示词');
  console.log('用户输入：', testCase1);
  console.log('\n等待 Agent 分析和优化...\n');

  try {
    // 调用 Agent 的 generate 方法
    // messages: 用户输入的消息数组
    const response1 = await agent.generate({
      messages: [
        {
          role: 'user',
          content: testCase1,
        },
      ],
    });

    // 输出 Agent 的回复
    console.log('🤖 Agent 回复：\n');
    console.log(response1.text);
    console.log('\n' + '='.repeat(80) + '\n');

    // 测试案例 2：一个稍微具体但仍需优化的提示词
    const testCase2 = '我想做一个网站，能不能给我一些建议？';

    console.log('📝 测试案例 2：需要更多细节的提示词');
    console.log('用户输入：', testCase2);
    console.log('\n等待 Agent 分析和优化...\n');

    const response2 = await agent.generate({
      messages: [
        {
          role: 'user',
          content: testCase2,
        },
      ],
    });

    console.log('🤖 Agent 回复：\n');
    console.log(response2.text);
    console.log('\n' + '='.repeat(80) + '\n');

    console.log('✅ 测试完成！');
  } catch (error) {
    // 错误处理
    console.error('❌ 测试过程中出现错误：');
    console.error(error);
    
    // 如果是 API Key 错误，给出提示
    if (error instanceof Error && error.message.includes('API key')) {
      console.log('\n💡 提示：请确保在 .env 文件中设置了正确的 OPENAI_API_KEY');
      console.log('你可以从 https://platform.openai.com/api-keys 获取 API Key');
    }
  }
}

/**
 * 执行测试
 * 使用 IIFE (Immediately Invoked Function Expression) 来处理异步函数
 */
(async () => {
  await testPromptOptimizer();
})();

