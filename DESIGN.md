# 质量慧析 NEXT · 设计系统规范

> 本文档是全部 UI 代码的唯一事实来源。所有视图必须严格遵守这里的设计语言、动效词汇与组件契约。
> 铁律：**只改设计、UI、动画；功能、数据、口径、文案语义一律不变。**

## 0. 设计方向：「简约高级」（v2，替换原深色方案）

用户定调：**简约、高级、动效流畅、交互完美；拒绝任何"AI 生成感"的堆砌元素。**

明确禁止：深色太空背景、极光/星空/玻璃拟态、霓虹发光、渐变文字、大阴影、科技风英文口号
（如 EXAM INTELLIGENCE / LIVE SNAPSHOT / 驾驶舱）。

采用：纸感浅色画布 + 白色卡片 + 发丝描边 + 墨色文字 + 单一克制的蓝。
参考气质：Linear / Stripe / Apple 的产品页——版式与留白承担设计，装饰近乎为零。

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| --bg-0 | #f7f7f4 | 画布（暖纸灰） |
| 卡片 | #ffffff + 1px #e8e6e1 | Panel/表格/输入框 |
| --line / --line-strong | #e8e6e1 / #d8d5ce | 发丝描边两级 |
| --text / muted / faint | #1c1b18 / #75736c / #a3a199 | 墨三级 |
| --accent | #2b5bd7 | 唯一强调色：激活态、主数据系列、焦点环 |
| --tier-top / --tier-under | #b45309 / #0f766e | 一本 / 本科语义色（降饱和） |
| --warn / --danger | #c2410c / #b91c1c | 提醒 / 错误 |

## 1. 铁律

1. `app/lib/**` 一律不许修改（parser/analytics/report-model/exporters/storage/types/class-config/demo 是功能核心）。
2. 每个视图展示的数据必须与旧版（`/tmp/repo-eval/zhiliang-huixi-new-/app/page.tsx` 对应视图）完全一致。
3. 中文文案保持业务语义不变。
4. 所有动效必须尊重 `prefers-reduced-motion`（motion.tsx 原语已内置）。
5. TypeScript strict 全绿；样式用 Tailwind 4 工具类 + tokens 变量；**禁止**内联十六进制色（语义色通过 theme 类）、**禁止** box-shadow 彩色发光、**禁止**渐变背景/文字。

## 2. 动效词汇表（全部用 motion/react 原语，见 components/motion.tsx）

| 场景 | 动效 | 参数 |
| --- | --- | --- |
| 视图切换 | 淡入 + 6px 上浮 | duration 0.2 |
| 内容进场 | 轻错拍（y 6→0，无缩放） | 0.3s，错拍 0.03s |
| KPI 数字 | CountUp 滚动 | spring 160/30，进入视口触发一次 |
| 卡片悬停 | 边框加深（CSS），无位移 | 0.25s |
| 按钮 | active:scale-0.98 | 0.12s |
| 面板展开 | 高度 + 透明度 | 0.22s |
| 导航激活 | layoutId 滑块（灰底） | spring 380/32 |
| **禁止** | 弹跳过冲、模糊过渡、旋转入场、>500ms 装饰动效、彩色发光阴影 | — |

## 3. 布局骨架（AppShell 已实现）

- 左侧 76px 白底导航栏（发丝右边框）：图标 + title 提示，激活项灰底墨字，layoutId 滑块。
- 顶部：品牌行（QUALITY INSPECT / 质量慧析）+ 数据源徽章 + 导入/设置按钮；下接全局筛选条（考试/类别/班级）。
- 内容区 max-w-[1400px]，视图切换 PageTransition。
- 移动端（<900px）：底部导航栏。

## 4. 文件契约

```
app/
├── page.tsx                # AppShell（勿改结构）
├── styles/globals.css      # 设计令牌（勿改数值，见本文档第 0 节）
├── lib/                    # 功能核心（禁改）；hooks.tsx 提供数据 Context
├── components/
│   ├── ui.tsx              # Panel/StatBlock/DataTable/Chip/Select/Segmented/SegmentBar/EmptyState/TierBadge/GlowButton
│   ├── motion.tsx          # PageTransition/Reveal/Stagger/StaggerItem/CountUp/Hoverable/Pressable/Collapse
│   └── charts.tsx          # 懒加载图表（浅色主题）
└── views/                  # 10 个视图
```

## 5. 视图公共契约

每个视图默认导出 `({ ctx }: { ctx: ViewContext })`；`ViewContext = { dataset, exam, track, classNo, setExam, setTrack, setClassNo, go }`。
分析计算一律调用 `lib/analytics.ts`（同参数），不重复实现。数据操作（导入/演示/清除）通过 `useDataset()`（全局 Context，导入后全站即时同步）。

## 6. 报告中心特别要求

- 报告正文结构完整保留（品牌行、六段、质量与方法）；导出 Word/PDF/Excel 沿用 lib/exporters。
- PDF 按需挂载 `id="export-report-content"` 浅色打印宿主（挂载 → 双 rAF → html2canvas → 卸载）。

## 7. 设置视图特别要求

- 导入流程：拖拽/选择 → 解析 → issues 三级提醒 → IndexedDB 持久化；演示数据与清除（内联二次确认）。
- 班型配置（CLASS_PROFILES）与能力矩阵/字段映射展示照搬功能。

## 8. 高级感工艺清单（逐条落实）

- 8pt 间距节奏（4/8/12/16/24/32）；面板 p-5/p-6；区块 gap-4/gap-6
- 层次靠留白与发丝线，不靠阴影和颜色堆砌；全站最多一个强调色
- 字体层次：页面标题 18px semibold tracking-tight；区块标题 14px；正文 13px；辅助 11-12px muted/faint
- 数字永远 tabular-nums；KPI clamp(26px,3vw,34px)
- 所有可交互元素有 hover/active/focus-visible 三态
- 空态设计过（图标+标题+建议）；异步操作有 loading → 结果提示 → 状态恢复
- 长列表（>30 项）不做逐项动画
