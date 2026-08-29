# 质量慧析 NEXT · 深空观测站

质量慧析的**全新 UI 重构版**（备用库）：设计、交互、动效全方位重做，
功能、数据管线、分析口径与正式库 [`zhiliang-huixi-new-`](https://github.com/yusheng266186-beep/zhiliang-huixi-new-) **完全一致**。

> 验收通过后合并回正式库；在合并之前，本仓库不影响正式库的任何线上行为。

## 设计语言：「深空观测站」

- 近黑深蓝画布 + 三层极光渐变 + 星点漂移背景
- 玻璃质感面板、青/紫双色主线、发光描边代替阴影
- 大号等宽数字、KPI 进入视口滚动计数
- 全站动效基于 [motion](https://motion.dev)：弹簧错拍进场、视图交叉过渡、滑动指示条，完整尊重 `prefers-reduced-motion`

设计规范见 [DESIGN.md](DESIGN.md)（设计令牌、动效词汇表、组件契约的唯一事实来源）。

## 功能完整性承诺

以下核心与正式库**逐字节一致**（本仓库不修改 `app/lib/**`）：

| 模块 | 说明 |
| --- | --- |
| parser | Excel 语义表头识别、三级列映射、缺失字段降级、总分重建 |
| analytics | 年级/班级/学科/学生/上线临界/小题知识点全部口径 |
| report-model | 四类报告的结构化模型 |
| exporters | Word / 分页 PDF / Excel 导出 |
| storage | IndexedDB 本地持久化 |
| class-config | 内置班型口径 |

验证方式与正式库相同：

```bash
npm install
npm run test:parser     # 工作簿解析与容错变体（可用真实工作簿或合成示例）
npm run test:analytics  # 统计口径验证
npm run test            # 构建 + 产物冒烟检查
npm run dev             # 本地开发（纯 Vite）
```

## 部署

推送到 main 后自动构建并发布到 GitHub Pages：
`https://yusheng266186-beep.github.io/zhiliang-huixi-next/`

工作流含质量门（tsc + eslint）与构建冒烟检查（入口 HTML 与本地资源引用必须可解析）。
