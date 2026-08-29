"use client";

// 视图：年级成绩。
// 数据口径与旧版 renderGrade 完全一致（同样的筛选/统计/截断逻辑），仅按「深空观测站」主题重构呈现。
import { useMemo, useState, type ReactNode } from "react";
import { Medal, Search, ShieldCheck, Target, UsersRound, X } from "lucide-react";
import { Hoverable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { DataTable, EmptyState, Panel, StatBlock } from "../components/ui";
import { criticalStudents, descriptiveStats, filterScores, getThreshold, segmentSummary } from "../lib/analytics";
import type { ScoreSegment } from "../lib/analytics";
import type { ViewContext } from "../lib/hooks";
import type { SubjectName } from "../lib/types";

// 与旧版 SEGMENT_COLORS 语义一致（任务约定：分段色沿用旧版语义内联样式）
const SEGMENT_COLORS: Record<ScoreSegment["id"], string> = {
  high: "#1c1b18",
  top: "#55524b",
  "top-critical": "#b45309",
  undergraduate: "#0f766e",
  "undergraduate-critical": "#0d9488",
  foundation: "#a8a49b",
  unclassified: "#dedbd4",
};

// 与旧版一致的学科列顺序
const SUBJECT_ORDER: SubjectName[] = ["语文", "数学", "英语", "日语", "物理", "历史", "化学", "生物", "政治", "地理"];

const format1 = (value: number) => value.toFixed(1);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** 四分位区间卡（值为区间文本，无法用 StatBlock，样式与 StatBlock 对齐） */
function QuartileCard({ low, high, deviation }: { low: number; high: number; deviation: number }) {
  return (
    <div className="glass glow-hover relative h-full overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 opacity-20 blur-2xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wider text-muted">四分位区间</p>
      </div>
      <p className="kpi-num mt-2 whitespace-nowrap text-[clamp(20px,2.2vw,28px)] font-semibold leading-none text-ink">
        {format1(low)}<span className="mx-1 text-muted">—</span>{format1(high)}
      </p>
      <p className="mt-2 text-[11px] text-muted">标准差 {format1(deviation)}</p>
    </div>
  );
}

export default function GradeView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;
  const [query, setQuery] = useState("");

  // ---- 与旧版完全相同的数据链 ----
  const activeScores = useMemo(() => filterScores(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const scoreStats = useMemo(() => descriptiveStats(activeScores.map((row) => row.total)), [activeScores]);
  const scoreSegments = useMemo(() => segmentSummary(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const critical = useMemo(() => criticalStudents(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const topCritical = useMemo(() => critical.filter((item) => item.criticalTiers.includes("一本")), [critical]);
  const undergraduateCritical = useMemo(() => critical.filter((item) => item.criticalTiers.includes("本科")), [critical]);

  // 搜索 + 截断保护：与旧版一致，先按数据顺序截取前 80 条，再按总分降序展示
  const matched = useMemo(() => activeScores.filter((row) => !query || row.name.includes(query)), [activeScores, query]);
  const visibleStudents = useMemo(() => [...matched.slice(0, 80)].sort((a, b) => b.total - a.total), [matched]);

  const headers: ReactNode[] = [
    "校名",
    "班级",
    "姓名",
    "班型",
    "组合",
    <span key="h-total" className="block text-right">总分</span>,
    <span key="h-top" className="block text-right">一本差</span>,
    <span key="h-under" className="block text-right">本科差</span>,
    <span key="h-city" className="block text-right">市排名</span>,
    <span key="h-school" className="block text-right">校排名</span>,
    ...SUBJECT_ORDER.map((item) => <span key={`h-${item}`} className="block text-right">{item}</span>),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏统计：错拍进场 */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem>
          <Hoverable>
            <StatBlock icon={<Medal size={16} />} label="平均分" value={scoreStats.average} digits={1} note={`中位数 ${format1(scoreStats.median)}`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable>
            <QuartileCard low={scoreStats.p25} high={scoreStats.p75} deviation={scoreStats.standardDeviation} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable>
            <StatBlock tone="amber" icon={<Target size={16} />} label="一本临界" value={topCritical.length} suffix="人" note={`本科临界 ${undergraduateCritical.length}人`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable>
            <StatBlock
              tone="violet"
              icon={<ShieldCheck size={16} />}
              label="数据置信度"
              value={(dataset.profile?.overallConfidence ?? 0) * 100}
              digits={1}
              suffix="%"
              note="缺失学科不按0分"
            />
          </Hoverable>
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Panel
          title="年级总成绩表"
          subtitle={`共${activeScores.length}名学生，可按总分、市排名、校排名查看`}
          action={
            <span className="shrink-0 rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-xs text-ink">{track}</span>
          }
        >
          {/* 分层概览（语义色沿用旧版） */}
          {scoreSegments.length > 0 && (
            <div className="glass mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-4 py-3">
              {scoreSegments.map((segment) => (
                <span key={segment.id} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                  <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEGMENT_COLORS[segment.id] }} />
                  <span>{segment.label}</span>
                  <b className="num text-ink">{segment.count}</b>
                  <span className="text-faint">{percent(segment.rate)}</span>
                </span>
              ))}
            </div>
          )}

          {/* 工具栏：搜索 + 截断说明 */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <Search size={15} className="shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Escape" && setQuery("")}
                placeholder="搜索学生姓名"
                className="glass-input w-48"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-faint transition-colors duration-300 hover:text-ink" aria-label="清除搜索">
                  <X size={14} />
                </button>
              )}
            </label>
            <span className="text-[11px] text-faint">
              {query ? `${matched.length} 人匹配 · ` : ""}当前显示前80条，可通过班级筛选缩小范围
            </span>
          </div>

          {matched.length ? (
            <DataTable headers={headers} maxHeight="560px">
              {visibleStudents.map((row) => {
                const line = getThreshold(dataset, exam, row.track);
                return (
                  <tr key={`${row.classNo}-${row.name}`}>
                    <td className="text-muted">{dataset.school}</td>
                    <td>{row.classNo}班</td>
                    <td className="font-medium text-ink">{row.name}</td>
                    <td>{row.classType}</td>
                    <td>{row.combination}</td>
                    <td className="num text-right font-semibold text-ink">{format1(row.total)}</td>
                    <td className="num text-right">{typeof line?.topTotal === "number" ? format1(row.total - line.topTotal) : "—"}</td>
                    <td className="num text-right">{typeof line?.undergraduateTotal === "number" ? format1(row.total - line.undergraduateTotal) : "—"}</td>
                    <td className="num text-right">{row.cityRank ?? "—"}</td>
                    <td className="num text-right">{row.schoolRank ?? "—"}</td>
                    {SUBJECT_ORDER.map((item) => {
                      const value = row.subjects[item];
                      return <td key={item} className="num text-right">{value === undefined ? "—" : format1(value)}</td>;
                    })}
                  </tr>
                );
              })}
            </DataTable>
          ) : query ? (
            <EmptyState
              icon={<Search size={30} />}
              title={`没有找到姓名包含「${query}」的学生`}
              hint="试试更短的关键词，或清除搜索后重试。"
            />
          ) : (
            <EmptyState
              icon={<UsersRound size={30} />}
              title="当前筛选范围没有数据"
              hint="调整顶部的考试、类别或班级筛选后再试。"
            />
          )}
        </Panel>
      </Reveal>
    </div>
  );
}
