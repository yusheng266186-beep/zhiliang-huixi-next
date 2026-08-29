"use client";

// 视图：上线与临界。
// 数据口径与旧版 renderOnline 完全一致：上线人数按逐生有效线统计、临界名单来自 criticalStudentsByTier
//（一本/本科分开标识、线差、薄弱学科）、分层来自 segmentSummary。仅按「深空观测站」主题重构呈现。
import { useMemo, type ReactNode } from "react";
import { CheckCircle2, ClipboardList, Flame, Target, UsersRound } from "lucide-react";
import { Hoverable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { DataTable, EmptyState, Panel, SegmentBar, StatBlock, TierBadge } from "../components/ui";
import { classSummaries, criticalStudentsByTier, filterScores, getThreshold, segmentSummary } from "../lib/analytics";
import type { ScoreSegment } from "../lib/analytics";
import type { ViewContext } from "../lib/hooks";

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

const format1 = (value: number) => value.toFixed(1);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

type CriticalStudent = ReturnType<typeof criticalStudentsByTier>[number];

/** 一本/本科颜色说明（与旧版 TierLegend 语义一致） */
function TierLegend() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-top" />一本/特控</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-under" />本科</span>
    </div>
  );
}

/** 临界生名单（一本 / 本科共用，列与旧版「临界生与薄弱学科」一致） */
function CriticalTable({ rows, emptyTitle }: { rows: CriticalStudent[]; emptyTitle: string }) {
  const headers: ReactNode[] = [
    "班级",
    "姓名",
    <span key="h-total" className="block text-right">总分</span>,
    <span key="h-top" className="block text-right">一本差</span>,
    <span key="h-under" className="block text-right">本科差</span>,
    "薄弱学科",
    "状态",
  ];
  if (!rows.length) {
    return <EmptyState icon={<ClipboardList size={30} />} title={emptyTitle} hint="总分距一本/本科线20分以内的学生会出现在这里。" />;
  }
  return (
    <DataTable headers={headers} maxHeight="360px">
      {rows.map((item) => (
        <tr key={`${item.classNo}-${item.name}`}>
          <td>{item.classNo}班</td>
          <td className="font-medium text-ink">{item.name}</td>
          <td className="num text-right font-semibold text-ink">{format1(item.total)}</td>
          <td className={`num text-right ${(item.topDiff ?? 0) < 0 ? "text-danger" : "text-tier-under"}`}>
            {item.topDiff === null ? "—" : format1(item.topDiff)}
          </td>
          <td className={`num text-right ${(item.undergraduateDiff ?? 0) < 0 ? "text-danger" : "text-tier-under"}`}>
            {item.undergraduateDiff === null ? "—" : format1(item.undergraduateDiff)}
          </td>
          <td className="text-muted">
            {item.weakSubjects.slice(0, 2).map((weak) => `${weak.subject} ${format1(weak.diff)}`).join("、") || "—"}
          </td>
          <td><TierBadge tier="close" /></td>
        </tr>
      ))}
    </DataTable>
  );
}

export default function OnlineView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;

  // ---- 与旧版完全相同的数据链 ----
  const activeScores = useMemo(() => filterScores(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const topCount = useMemo(
    () =>
      activeScores.filter((row) => {
        const line = getThreshold(dataset, exam, row.track)?.topTotal;
        return typeof line === "number" && row.total >= line;
      }).length,
    [activeScores, dataset, exam],
  );
  const undergraduateCount = useMemo(
    () =>
      activeScores.filter((row) => {
        const line = getThreshold(dataset, exam, row.track)?.undergraduateTotal;
        return typeof line === "number" && row.total >= line;
      }).length,
    [activeScores, dataset, exam],
  );
  const topRate = activeScores.length ? topCount / activeScores.length : 0;
  const undergraduateRate = activeScores.length ? undergraduateCount / activeScores.length : 0;
  const topCritical = useMemo(() => criticalStudentsByTier(dataset, exam, track, classNo, "一本"), [dataset, exam, track, classNo]);
  const undergraduateCritical = useMemo(() => criticalStudentsByTier(dataset, exam, track, classNo, "本科"), [dataset, exam, track, classNo]);
  // 线下10分内的优先转化人群（与旧版「一本线下10分 / 本科线下10分」一致）
  const topCriticalWithin10 = topCritical.filter((row) => (row.topDiff ?? -999) >= -10).length;
  const undergraduateCriticalWithin10 = undergraduateCritical.filter((row) => (row.undergraduateDiff ?? -999) >= -10).length;
  const scoreSegments = useMemo(() => segmentSummary(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const currentClassSummaries = useMemo(
    () => classSummaries(dataset, exam, track).filter((item) => classNo === "全部" || item.classNo === classNo),
    [dataset, exam, track, classNo],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏 KPI：错拍进场 */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock tone="amber" icon={<Target size={16} />} label="特控/一本上线" value={topCount} suffix="人" note={`上线率${percent(topRate)}`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock tone="green" icon={<CheckCircle2 size={16} />} label="本科上线" value={undergraduateCount} suffix="人" note={`上线率${percent(undergraduateRate)}`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock
              icon={<Flame size={16} />}
              label="一本临界"
              value={topCritical.length}
              suffix="人"
              note={`一本线下10分内 ${topCriticalWithin10}人 · 优先冲一本`}
            />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock
              tone="violet"
              icon={<UsersRound size={16} />}
              label="本科临界"
              value={undergraduateCritical.length}
              suffix="人"
              note={`本科线下10分内 ${undergraduateCriticalWithin10}人 · 优先保本科`}
            />
          </Hoverable>
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 分层总览 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="分层总览" subtitle="先看人数，再决定教学资源投放" className="h-full">
            {scoreSegments.length ? (
              <div className="flex flex-col gap-4">
                {scoreSegments.map((segment) => (
                  <SegmentBar key={segment.id} label={segment.label} count={segment.count} rate={segment.rate} intent={segment.intent} color={SEGMENT_COLORS[segment.id]} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<Target size={30} />} title="当前筛选范围没有可分层的学生" hint="调整顶部的考试、类别或班级筛选后再试。" />
            )}
          </Panel>
        </Reveal>

        {/* 班级上线完成情况 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="班级上线完成情况" subtitle="双轨进度条：橙色一本，绿色本科" action={<TierLegend />} className="h-full">
            {currentClassSummaries.length ? (
              <div className="flex flex-col gap-1">
                {currentClassSummaries.map((item) => (
                  <div key={item.classNo} className="rounded-xl border border-transparent px-2 py-2 transition-colors duration-300 hover:border-line hover:bg-white/[0.03]">
                    <div className="flex items-center justify-between text-xs">
                      <b className="text-ink">{item.classNo}班 · {item.type}</b>
                      <span className="num text-[11px] text-muted">{item.count}人</span>
                    </div>
                    <div className="mt-1.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 shrink-0 text-[10px] text-tier-top">一本</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-tier-top transition-[width] duration-700" style={{ width: `${Math.min(100, item.topRate * 100)}%` }} />
                        </div>
                        <span className="num w-28 shrink-0 text-right text-[10px] text-muted">{item.topCount}人 · {percent(item.topRate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 shrink-0 text-[10px] text-tier-under">本科</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-tier-under transition-[width] duration-700" style={{ width: `${Math.min(100, item.undergraduateRate * 100)}%` }} />
                        </div>
                        <span className="num w-28 shrink-0 text-right text-[10px] text-muted">{item.undergraduateCount}人 · {percent(item.undergraduateRate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<UsersRound size={30} />} title="当前筛选范围没有班级数据" hint="调整顶部的考试、类别或班级筛选后再试。" />
            )}
          </Panel>
        </Reveal>

        {/* 一本临界名单 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="一本临界名单" subtitle="总分距一本线20分以内，按线差从高到低排序" className="h-full">
            <CriticalTable rows={topCritical} emptyTitle="当前筛选范围没有一本临界学生" />
          </Panel>
        </Reveal>

        {/* 本科临界名单 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="本科临界名单" subtitle="总分距本科线20分以内，按线差从高到低排序" className="h-full">
            <CriticalTable rows={undergraduateCritical} emptyTitle="当前筛选范围没有本科临界学生" />
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
