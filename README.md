# 灵犀智能体 · 客户支持平台

基于 PRD 的前端产品演示 Demo，按真实项目方式使用 React、TypeScript、Vite、Arco Design 和 Tiptap 构建。不接真实后端，仅使用本地 mock 数据和 `localStorage` 持久化模拟业务操作。

## 启动

```bash
npm install
npm run dev
```

打开终端输出的本地地址即可体验。

## 已覆盖模块

- 智能体：新增、编辑、复制、删除、保存、发布、测试。
- 流程：新增、复制、删除、保存，支持 Tiptap 富文本编辑。
- 知识库：添加 URL、上传文件、查看详情、编辑、删除、绑定和分离。
- 技能：上传、启用／关闭、删除及绑定关系模拟。
- 渠道：新增、配置、启用／关闭、删除。
- 监控：渠道、状态、命中类型和日期筛选，查看会话详情。

## 设计基线

视觉与交互遵循项目内的 [DESIGN.md](./DESIGN.md)，基于 `C:\Users\luxuan\Desktop\Lx_agent_demo\Volcengine Copy` 中的源力设计系统转译为 React + Arco Design 实现。页面文案遵循真实 B 端产品原则，不添加与当前任务无关的实现说明或演示提示。

## 验证

```bash
npm run build
npm run lint
```

`lint` 当前仅保留 `src/store.tsx` 与 `src/components/ui.tsx` 的 Fast Refresh 提示，不影响构建和运行。
