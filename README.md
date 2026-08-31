# 质量慧析 NEXT · 简约高级版

> 先把版面做对，再谈数据洞察。

质量慧析的**全新界面重构版（备用库）**：设计、交互、动效三个层面从零重做，
功能、数据管线、分析口径与正式库 [`zhiliang-huixi-new-`](https://github.com/yusheng266186-beep/zhiliang-huixi-new-)**完全一致**。

> 在线预览：[打开质量慧析 NEXT](https://yusheng266186-beep.github.io/zhiliang-huixi-next/)  
> 源代码：[查看本仓库](https://github.com/yusheng266186-beep/zhiliang-huixi-next)  
> 正式库：[zhiliang-huixi-new-](https://github.com/yusheng266186-beep/zhiliang-huixi-new-)（线上地址不变）

## 项目定位

这是一个**界面替换提案**，而不是一个新产品：

- 旧版界面（浅色纸感、靛紫卡片、顶部导航）整体退役，换成一套「简约高级」的设计语言；
- 解析、统计、报告、导出、存储等功能核心与正式库**逐字节一致**（`app/lib/**` 不含任何改动）；
- 验收通过后，本仓库的设计层将合并回正式库；在合并之前，正式库的线上行为不受任何影响。

适合用来：评估新设计是否达到预期、对比新旧界面、在合并前提出修改意见。

## 与正式库的关系

| 层 | 状态 | 说明 |
| --- | --- | --- |
| `app/lib/`（解析/分析/报告模型/导出/存储/班型配置） | **与正式库逐字节一致** | 解析回归结果与正式库逐字相同（7255 成绩 / 11 考试 / 19 分数线 / 16047 小题，置信度 0.922） |
| `app/components/`、`app/views/`、`app/styles/`、`app/page.tsx` | **全部重写** | 设计系统、动效原语、组件库、10 个视图 |
| 配置与工作流 | 重写/继承 | Vite 8 单配置、GitHub Actions 质量门（tsc + eslint + 构建冒烟） |

唯一已知交互取舍：上线临界名单不再支持"点击跳转学生画像"（新架构尚无跨视图学生选中通道，宁缺毋滥）；该功能可在合并前按需补齐。

## 设计语言：简约高级

设计规范全文见 [DESIGN.md](DESIGN.md)（设计令牌、动效词汇表、工艺清单的唯一事实来源）。

- **纸感浅色画布**：暖纸灰 `#f7f7f4` 画布 + 纯白卡片 + 发丝描边 `#e8e6e1`；
- **单一强调色**：克制的蓝 `#2b5bd7`，仅用于激活态、主数据系列与焦点环；
- **墨三级文字**：`#1c1b18` / `#75736c` / `#a3a199`，数字一律等宽（tabular-nums）；
- **语义色降饱和**：一本 `#b45309`、本科 `#0f766e`，用于徽章、进度条与图表；
- **动效收敛**：全部 ≤350ms，仅两种曲线（交互 spring 400/40、场景 `[0.22,1,0.36,1]`），
  错拍 0.03s、位移 6px、无缩放弹跳、无模糊过渡，完整尊重 `prefers-reduced-motion`；
- **明确禁止**：深色太空背景、玻璃拟态、霓虹发光、渐变文字、彩色阴影、科技风英文口号。

## 功能全景

| 视图 | 内容 |
| --- | --- |
| 总览 | 考试主视觉、KPI 数字滚动（参考人数/平均分/一本/本科上线）、数据质量环、成绩分布光谱、学生分层行动栈、证据驱动洞察、班级上线率对比、上线结构 |
| 年级成绩 | 年级明细表（前 80 行截断保护）、搜索（Esc 清除）、分层概览、描述统计卡 |
| 班级对比 | 班级横向对比图、班级指标排名表（点击聚焦班级）、同类班对标表（同组差着色） |
| 学科分析 | 学科切换、学科统计卡、学科班级横向对比、各学科概览表 |
| 学生画像 | 学生档案卡、检索、历次考试走势、学科上线诊断、薄弱学科提示（缺失学科不伪造 0 分） |
| 上线与临界 | 上线 KPI、分层总览、班级完成进度、一本/本科临界分列名单（线差 + 薄弱学科 Top2） |
| 小题知识点 | 学科切换、小题得分率（<60% 橙色）、知识点优先级、薄弱知识点 Top6、小题明细 |
| 历次考试 | 年级双轴趋势（平均分/一本/本科上线）、历次对照表（较上次增量）、缺失处理口径说明 |
| 报告中心 | 四类报告（深色数字简报、01–06 章节）、Word / 分页 PDF / Excel 导出（PDF 按需挂载浅色打印宿主） |
| 规则与班型 | 拖拽导入（流光边框）、数据提醒三级列表、能力矩阵、字段识别映射、班型配置、演示数据与清除 |

## 技术栈

- React 19 + TypeScript 5.9（strict，全库无 `any`）
- Vite 8 + Tailwind 4（设计令牌经 `@theme` 注入工具类）
- [motion](https://motion.dev) 12（全站动效）
- recharts 3（懒加载分包，浅色主题）
- SheetJS 0.20.3（CDN 锁定版本）、docx 9、html2canvas + jsPDF 4
- 构建：Node.js ≥ 22.13，无需服务端；GitHub Pages 静态发布

## 快速开始

```bash
npm install
npm run dev            # 本地开发（纯 Vite，默认 http://localhost:5173）
```

## 常用命令

    npm run build:pages     # 构建 Pages 静态站点
    npm run test            # 构建 + 产物冒烟检查（入口 HTML 与本地资源引用必须可解析）
    npm run lint            # eslint（typescript-eslint + react-hooks）
    npx tsc --noEmit        # 类型检查
    npm run test:parser     # 工作簿解析与容错变体验证
    npm run test:analytics  # 统计口径验证

`test:parser` / `test:analytics` 不带参数时默认使用合成示例工作簿
（由 `scripts/make-fixture.ts` 从真实工作簿生成，本机生成、不入库，见 `examples/README.md`）；
分析真实数据时通过参数显式传入：

    npm run test:parser -- "C:/path/to/高2024级4册质量复盘.xlsx"

## 数据与隐私

与正式库相同的本地优先原则：

- 工作簿在**浏览器本地**解析，成绩数据仅存于当前设备的 IndexedDB（`grade-quality-analysis` 库）；
- 无账号、无服务器、无遥测；清除站点数据即彻底清除；
- 共用电脑使用后建议清除站点数据；
- 仓库不含任何真实学生数据：合成示例由脚本生成且被 `.gitignore` 排除。

## 目录结构

    zhiliang-huixi-next/
    ├── app/
    │   ├── components/       # 共享 UI 原语、动效原语、懒加载图表
    │   ├── lib/              # 功能核心（与正式库一致，禁改）
    │   ├── styles/           # 设计令牌与基础样式
    │   ├── views/            # 10 个视图组件
    │   └── page.tsx          # AppShell：导航、全局筛选、视图切换
    ├── examples/             # 合成示例的生成说明（工作簿本身不入库）
    ├── pages-static/         # Pages 静态入口
    ├── public/               # 公共资源
    ├── scripts/              # 解析/分析验证、fixture 生成、构建冒烟
    ├── .github/workflows/    # Pages 发布工作流（含质量门）
    ├── DESIGN.md             # 设计系统规范（唯一事实来源）
    └── vite.pages.config.ts  # 开发与构建配置

## GitHub Pages 部署

仓库内置 `.github/workflows/pages.yml`。推送到 main 后，工作流会：

1. 安装依赖；
2. 执行质量门：`npx tsc --noEmit` + `npm run lint`；
3. 执行 `npm run build:pages`；
4. 运行构建冒烟检查（`scripts/check-pages-build.mjs`）；
5. 发布到 GitHub Pages。

## 维护清单

修改本仓库时建议同步检查：

1. `app/lib/**` 是否保持与正式库一致（一致性是"功能不变"承诺的基础）；
2. 每个视图的数据口径是否仍与正式库对应视图一致（对照 `npm run test:analytics`）；
3. 新增颜色是否使用了 `globals.css` 令牌（禁止内联十六进制色与彩色阴影）；
4. 动效是否通过 `components/motion.tsx` 原语实现（≤350ms，尊重 reduced-motion）；
5. 移动端断点（<900px 底部导航、单列布局）是否正常；
6. 推送前运行 `npm run test`（构建 + 冒烟）与 `npx tsc --noEmit`。

## 合并回正式库

验收通过后，将本仓库的设计层合并回 [`zhiliang-huixi-new-`](https://github.com/yusheng266186-beep/zhiliang-huixi-new-)：

1. 在正式库开分支，替换 `app/`（`lib/` 保持正式库版本不动）、`pages-static/` 与相关配置；
2. 保留正式库的 `.github/workflows/pages.yml`（含 legacy/v2 双轨发布逻辑）；
3. 走正式库 PR + CI 质量门后合并；
4. 合并后用真实工作簿做一次导入回归，确认解析口径与导出链路不变。

## 版权与使用说明

本项目用于学校考试质量分析、数据可视化与教学研究。统计结果应结合教师经验与具体教学情境解读。
设计规范（DESIGN.md）与代码仅服务于本项目的验收与合并流程；字体、依赖与第三方资源分别遵守其各自条款。
