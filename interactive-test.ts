/**
 * ========================================
 * 提示词优化 Agent 交互式测试
 * ========================================
 * 
 * 这个文件提供交互式的测试方式，你可以输入自己的提示词并实时看到优化结果
 * 
 * 运行方式：
 * npx tsx interactive-test.ts
 */

import * as readline from 'readline';
import { mastra } from './src/mastra/index';

/**
 * 创建命令行交互界面
 * readline 是 Node.js 内置模块，用于从命令行读取用户输入
 */
const rl = readline.createInterface({
  input: process.stdin,   // 标准输入（键盘输入）
  output: process.stdout, // 标准输出（终端显示）
});

/**
 * 封装一个 Promise 版本的问题询问函数
 * 因为 readline 原生是回调形式，这里转换为 async/await 形式
 */
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * 主交互函数
 */
async function interactiveTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 欢迎使用 AI 智能超级提示词优化 Agent！');
  console.log('='.repeat(80));
  console.log('\n💡 使用说明：');
  console.log('   - 输入你想优化的提示词');
  console.log('   - Agent 会分析并给出优化建议');
  console.log('   - 输入 "exit" 或 "quit" 退出程序\n');

  // 获取 Agent 实例
  const agent = mastra.agents.promptOptimizerAgent;

  // 主循环：持续接受用户输入
  while (true) {
    try {
      // 询问用户输入
      const userInput = await askQuestion('👤 请输入你的提示词：');

      // 检查退出命令
      if (
        userInput.trim().toLowerCase() === 'exit' ||
        userInput.trim().toLowerCase() === 'quit'
      ) {
        console.log('\n👋 感谢使用！再见！\n');
        rl.close(); // 关闭 readline 接口
        process.exit(0); // 退出程序
      }

      // 检查空输入
      if (!userInput.trim()) {
        console.log('⚠️  请输入有效的提示词\n');
        continue; // 跳过本次循环，继续下一次
      }

      // 显示处理提示
      console.log('\n⏳ 正在分析和优化你的提示词，请稍候...\n');

      // 调用 Agent 处理
      const response = await agent.generate({
        messages: [
          {
            role: 'user',
            content: userInput,
          },
        ],
      });

      // 输出 Agent 的回复
      console.log('='.repeat(80));
      console.log('🤖 Agent 回复：');
      console.log('='.repeat(80));
      console.log(response.text);
      console.log('='.repeat(80) + '\n');
    } catch (error) {
      // 错误处理
      console.error('\n❌ 发生错误：', error);

      // 针对常见错误给出友好提示
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          console.log('\n💡 提示：请检查 .env 文件中的 OPENAI_API_KEY 是否正确');
          console.log(
            '   你可以从 https://platform.openai.com/api-keys 获取 API Key\n'
          );
          rl.close();
          process.exit(1);
        } else if (error.message.includes('rate limit')) {
          console.log('\n💡 提示：API 调用频率超限，请稍后再试\n');
        } else if (error.message.includes('network')) {
          console.log('\n💡 提示：网络连接失败，请检查网络设置\n');
        }
      }

      console.log('请重新输入或输入 "exit" 退出\n');
    }
  }
}

/**
 * 启动交互式测试
 * 使用 IIFE 处理异步函数
 */
(async () => {
  try {
    await interactiveTest();
  } catch (error) {
    console.error('程序异常退出：', error);
    rl.close();
    process.exit(1);
  }
})();

