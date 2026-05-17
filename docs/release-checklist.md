# Release Checklist

用途：每轮迭代上线前后使用，保证功能、测试、部署和用户验收信息完整。

## 1. Scope

- Release:
- Date:
- DDO Items:
- Owner:

## 2. Preflight

- [ ] DDO item 的验收标准已写清
- [ ] 前后端 API contract 已确认
- [ ] 环境变量和访问凭据已确认
- [ ] 没有把内部 DDO、密钥或敏感部署细节写到公开文案

## 3. Backend Verification

- [ ] `npm run check`
- [ ] `/api/health` 返回成功
- [ ] `/api/optimize` 返回 `success: true`
- [ ] `data.result.timeline` 至少 5 段
- [ ] `data.result.full_prompt` 非空
- [ ] `data.result.negative_prompt` 非空
- [ ] `data.result.platform_variants` 包含 Kling、Runway、Pika、Sora、Seedance
- [ ] `/api/history` 可按用户和会话返回历史

## 4. Frontend Verification

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] 首页定位为 AI 视频分镜 Prompt 工作台
- [ ] 输入视频创意后可以生成结果
- [ ] 时间轴渲染正常
- [ ] Positive prompt 和 negative prompt 渲染正常
- [ ] 平台适配版本渲染正常
- [ ] 复制按钮可用且有反馈
- [ ] 空状态、加载态、错误态可用
- [ ] 移动端和桌面端无明显文字重叠或溢出

## 5. Release Notes

```md
Release:
Date:
Version / Build:

Completed:
- 

Verification:
- Backend:
- Frontend:

Known Issues:
- 

User Acceptance:
- [ ] 视频创意输入
- [ ] 分镜时间轴
- [ ] 主 prompt
- [ ] negative prompt
- [ ] 平台适配版本
- [ ] 复制操作
```

## 6. Post-release

- [ ] 更新 `docs/product-delivery-ddo-2026.md` 状态表
- [ ] 记录本轮决策
- [ ] 记录已知问题
- [ ] 写入下一轮迭代建议
