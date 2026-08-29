// 图表配色唯一来源：page.tsx（图例、统计卡）与 charts.tsx（懒加载图表）共用，
// 独立成模块是为了避免 page.tsx 静态引用 charts.tsx 时把 recharts 拖回首屏包。
export const CHART_COLORS = { primary: "#2b5bd7", secondary: "#8fa3e8", grid: "#eceae5", cursor: "rgba(43,91,215,0.05)" } as const;
export const TIER_COLORS = { top: "#b45309", undergraduate: "#0f766e", neutral: "#a3a199" } as const;
