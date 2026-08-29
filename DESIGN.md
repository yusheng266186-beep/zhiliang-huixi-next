# 质量慧析 NEXT · 设计系统规范

> 本文档是全部 UI 代码的唯一事实来源。所有视图必须严格遵守这里的设计语言、动效词汇与组件契约。
> 铁律：**只改设计、UI、动画；功能、数据、口径、文案语义一律不变。**

## 0. 铁律

1. `app/lib/**` 一律不许修改（parser/analytics/report-model/exporters/storage/types/class-config/demo 是功能核心）。
2. 每个视图展示的数据必须与旧版（`/tmp/repo-eval/zhiliang-huixi-new-/app/page.tsx` 中对应视图）完全一致：同样的分析函数、同样的参数、同样的表格列、同样的空态文案语义。
3. 中文文案保持业务语义不变（可以因布局调整措辞顺序，不得改变含义或删除信息）。
4. 所有动效必须尊重 `prefers-reduced-motion`（ui.tsx 的 Reveal/Stagger 已内置，勿绕过）。
5. TypeScript strict 全绿；不使用 `any`；样式用 Tailwind 4 工具类 + `tokens.css` 变量，禁止内联十六进制颜色。
6. 只创建/修改分配给你的文件。

## 1. 设计方向：「深空观测站」

旧版是浅色纸感、圆角卡片、靛紫点缀。新版必须与之形成全方位反差：

- **深空底**：近黑的深蓝画布（--bg-0 → --bg-1），全局固定的极光渐变层与星点噪点，营造"观测站"氛围。
- **玻璃面板**：半透明白 4% 面板 + 1px 冷灰描边 + backdrop-blur，圆角 16px（--radius）。悬停时边框泛青光。
- **数据即主角**：大号等宽数字（tabular-nums、clamp 字号）、细颗粒的标签、强烈的大小对比。
- **双色主线**：青（--accent #22d3ee）为主导航与焦点色，紫（--accent-2 #a78bfa）为次要强调；语义色保持可读：一本=琥珀 --tier-top、本科=翠绿 --tier-under（与旧版语义一致，但质感换为发光描边）。
- **层次靠光不靠影**：发光边框、渐变描边、聚焦光环，代替旧版的大阴影。

## 2. 动效词汇表（全部用 motion/react，禁止 CSS transition 代替）

| 场景 | 动效 | 参数 |
| --- | --- | --- |
| 视图切换 | AnimatePresence 交叉淡入 + 8px 上浮 | duration .28, ease [0.22, 1, 0.36, 1] |
| 内容进场 | Stagger 逐项弹入（y 12→0, opacity 0→1） | spring stiffness 260 damping 26，子项 0.05s 错拍 |
| KPI 数字 | CountUp 数字滚动 | 0.9s，easeOut，进入视口触发一次 |
| 卡片悬停 | 上浮 3px + 边框青光 | spring stiffness 300 damping 24 |
| 面板展开 | 高度 + 透明度 spring | stiffness 240 damping 28 |
| 图表 | recharts 自带动画保留 | ≥700ms |
| 导航激活 | layoutId 滑动指示条 | spring stiffness 380 damping 32 |
| 导入中 | 边框流光（beam）+ 进度条 | 线性循环 |
| **禁止** | 弹跳过冲、旋转入场、>500ms 的装饰动效 | — |

## 3. 布局骨架（AppShell 已实现，勿重做）

- 左侧 76px 图标导航栏（玻璃质感，分组标签 hover 展开），激活项有 layoutId 滑块。
- 顶部全局筛选条：考试 / 类别 / 班级 三个下拉（玻璃胶囊），右侧数据源徽章 + 导入按钮。
- 内容区 max-w-[1400px] 居中，视图切换带 PageTransition。
- 移动端（<900px）：导航栏折叠为底部栏。

## 4. 文件契约

```
app/
├── page.tsx                # AppShell（已实现，勿改）
├── styles/globals.css      # 设计令牌 + 极光背景 + 通用样式（已实现，勿改）
├── lib/                    # 功能核心（禁改）
│   ├── hooks.ts            # useDataset / ViewContext 类型（已实现，勿改）
│   └── chart-theme.ts      # 图表主题（勿改）
├── components/
│   ├── ui.tsx              # 共享 UI 原语（已实现，勿改）：Panel/StatBlock/DataTable/SegmentBar/EmptyState/Chip/Select…
│   ├── motion.tsx          # 动效原语（已实现，勿改）：Reveal/Stagger/CountUp/PageTransition/Hoverable
│   └── charts.tsx          # 懒加载图表（已实现，勿改）
└── views/                  # ★ 子代理只写这里 ★
    ├── DashboardView.tsx   # 视图：总览
    ├── GradeView.tsx       # 视图：年级成绩
    ├── ClassesView.tsx     # 视图：班级对比
    ├── SubjectsView.tsx    # 视图：学科分析
    ├── StudentsView.tsx    # 视图：学生画像
    ├── OnlineView.tsx      # 视图：上线与临界
    ├── ItemsView.tsx       # 视图：小题知识点
    ├── HistoryView.tsx     # 视图：历次考试
    ├── ReportsView.tsx     # 视图：报告中心（含导出与按需导出宿主）
    └── SettingsView.tsx    # 视图：规则与班型（含导入流程）
```

## 5. 视图公共契约

每个视图默认导出一个组件，签名：

```tsx
export default function XxxView({ ctx }: { ctx: ViewContext }) { ... }
```

`ViewContext`（来自 `lib/hooks.ts`）：`{ dataset, exam, track, classNo, setExam, setTrack, setClassNo, go(view) }`。
视图内部自己 `useMemo` 调用 `lib/analytics.ts` 的函数（与旧版同参数），绝不重复实现计算。

顶部不需要再放全局筛选（AppShell 已有）；视图私有的二级筛选（如学科选择、学生搜索）放在视图内部，用 `Chip`/`Select` 原语。

## 6. 报告中心特别要求（ReportsView）

- 报告正文是**功能内容**：报告结构（品牌行、六段、质量与方法）必须完整保留，只是重新设计呈现。
- 导出三按钮（Word/PDF/Excel）沿用 `lib/exporters.ts`；PDF 需要按需挂载 `id="export-report-content"` 的隐藏宿主（挂载 → 双 rAF → html2canvas → 卸载），模式参考旧版 page.tsx 的 exportPdf。
- 导出中按钮要有 loading 态（LoaderCircle 旋转 + 禁用）。

## 7. 设置视图特别要求（SettingsView）

- 导入流程是核心功能：拖拽/选择工作簿 → 解析 → 校验提醒（issues 列表渲染）→ IndexedDB 持久化 → 演示数据按钮。
- 班型配置展示（CLASS_PROFILES）与字段识别置信度展示照搬功能，重新设计呈现。
