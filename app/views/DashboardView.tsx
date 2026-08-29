"use client";

// 视图：总览（年级驾驶舱）。
// 数据口径与旧版 renderDashboard 完全一致（同样的分析函数、同样的参数），仅按「深空观测站」主题重构呈现。
import { useMemo, type ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { DistributionChart, RateBarsChart, TrackPieChart } from "../components/charts";
import { Hoverable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { DataTable, EmptyState, GlowButton, Panel, SegmentBar, StatBlock } from "../components/ui";
import {
  average,
  buildExecutiveInsights,
  classSummaries,
  criticalStudents,
  descriptiveStats,
  distributionBins,
  filterScores,
  getThreshold,
  segmentSummary,
  subjectSummaries,
} from "../lib/analytics";
import type { ExecutiveInsight, ScoreSegment } from "../lib/analytics";
import { getClassProfile, relevantSubjects } from "../lib/class-config";
import type { ViewContext } from "../lib/hooks";

// 与旧版 SEGMENT_COLORS 语义一致（任务约定：分段色沿用旧版语义内联样式）
const SEGMENT_COLORS: Record<ScoreSegment["id"], string> = {
  high: "#5B5BD6",
  top: "#7C73E6",
  "top-critical": "#F59E0B",
  undergraduate: "#10B981",
  "undergraduate-critical": "#34D399",
  foundation: "#94A3B8",
  unclassified: "#CBD5E1",
};

const format1 = (value: number) => value.toFixed(1);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const TONE_STYLES: Record<ExecutiveInsight["tone"], { dot: string; text: string; label: string }> = {
  good: { dot: "bg-tier-under shadow-[0_0_10px_rgba(52,211,153,0.55)]", text: "text-tier-under", label: "状态良好" },
  warn: { dot: "bg-warn shadow-[0_0_10px_rgba(251,146,60,0.55)]", text: "text-warn", label: "需要关注" },
  attention: { dot: "bg-danger shadow-[0_0_10px_rgba(248,113,113,0.55)]", text: "text-danger", label: "重点预警" },
  neutral: { dot: "bg-accent2 shadow-[0_0_10px_rgba(167,139,250,0.55)]", text: "text-accent2", label: "中性观察" },
};

/** 一本/本科颜色说明（与旧版 TierLegend 语义一致） */
function TierLegend() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-top shadow-[0_0_8px_rgba(251,191,36,0.7)]" />一本/特控</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-under shadow-[0_0_8px_rgba(52,211,153,0.7)]" />本科</span>
    </div>
  );
}

/** 证据链洞察卡 */
function InsightCard({ tone, title, finding, action }: ExecutiveInsight) {
  const style = TONE_STYLES[tone];
  return (
    <article className="glass glow-hover flex gap-3 rounded-2xl p-4">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[13px] font-semibold text-ink">{title}</b>
          <span className={`text-[10px] tracking-wider ${style.text}`}>{style.label}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{finding}</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-faint">{action}</p>
      </div>
    </article>
  );
}

/** 迷你洞察行（上线转化空间 / 班级亮点 / 数据可信度） */
function MiniInsight({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white/[0.03] p-3.5 transition-colors duration-300 hover:border-line-strong">
      <span className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-accent">{icon}</span>
      <p className="text-xs leading-relaxed text-muted">
        <b className="text-ink">{title}</b>
        <span className="mt-0.5 block">{text}</span>
      </p>
    </div>
  );
}

export default function DashboardView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;

  // ---- 与旧版完全相同的数据链 ----
  const activeScores = useMemo(() => filterScores(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const currentClassSummaries = useMemo(
    () => classSummaries(dataset, exam, track).filter((item) => classNo === "全部" || item.classNo === classNo),
    [dataset, exam, track, classNo],
  );
  const subjects = useMemo(() => subjectSummaries(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const critical = useMemo(() => criticalStudents(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const topCritical = useMemo(() => critical.filter((item) => item.criticalTiers.includes("一本")), [critical]);
  const undergraduateCritical = useMemo(() => critical.filter((item) => item.criticalTiers.includes("本科")), [critical]);
  const scoreStats = useMemo(() => descriptiveStats(activeScores.map((row) => row.total)), [activeScores]);
  const scoreDistribution = useMemo(() => distributionBins(activeScores.map((row) => row.total), 50), [activeScores]);
  const scoreSegments = useMemo(() => segmentSummary(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const executiveInsights = useMemo(() => buildExecutiveInsights(dataset, exam, track, classNo), [dataset, exam, track, classNo]);

  const gradeAverage = average(activeScores.map((row) => row.total));
  const topCount = activeScores.filter((row) => {
    const line = getThreshold(dataset, exam, row.track)?.topTotal;
    return typeof line === "number" && row.total >= line;
  }).length;
  const undergraduateCount = activeScores.filter((row) => {
    const line = getThreshold(dataset, exam, row.track)?.undergraduateTotal;
    return typeof line === "number" && row.total >= line;
  }).length;
  const topRate = activeScores.length ? topCount / activeScores.length : 0;
  const undergraduateRate = activeScores.length ? undergraduateCount / activeScores.length : 0;

  // 数据质量（与旧版同口径）
  const expectedSubjectCells = activeScores.reduce((sum, row) => sum + relevantSubjects(getClassProfile(row.classNo)).length, 0);
  const presentSubjectCells = activeScores.reduce(
    (sum, row) => sum + relevantSubjects(getClassProfile(row.classNo)).filter((item) => typeof row.subjects[item] === "number").length,
    0,
  );
  const subjectCompleteness = expectedSubjectCells ? presentSubjectCells / expectedSubjectCells : 0;
  const activeTracks = [...new Set(activeScores.map((row) => row.track))];
  const completeThresholdTracks = activeTracks.filter((item) => {
    const line = getThreshold(dataset, exam, item);
    return typeof line?.topTotal === "number" && typeof line?.undergraduateTotal === "number";
  }).length;
  const thresholdCompleteness = activeTracks.length ? completeThresholdTracks / activeTracks.length : 0;
  const dataQualityScore = activeScores.length ? Math.round(subjectCompleteness * 72 + thresholdCompleteness * 28) : 0;
  const warningCount = (dataset.issues ?? []).filter((item) => item.level === "warning" || item.level === "error").length;
  const qualityRing = dataQualityScore >= 95 ? "var(--color-tier-under)" : dataQualityScore >= 80 ? "var(--color-tier-top)" : "var(--color-danger)";

  // 图表数据（与旧版字段一致）
  const medianBinLabel = scoreDistribution.find((bin) => scoreStats.median >= bin.start && scoreStats.median < bin.end)?.label;
  const rankData = [...currentClassSummaries]
    .sort((a, b) => b.undergraduateRate - a.undergraduateRate)
    .map((item) => ({ name: `${item.classNo}班`, 平均分: Number(item.average.toFixed(1)), 一本率: Number((item.topRate * 100).toFixed(1)), 本科率: Number((item.undergraduateRate * 100).toFixed(1)) }));
  const pieData = [
    { name: "一本上线", value: topCount },
    { name: "本科上线（未一本）", value: Math.max(0, undergraduateCount - topCount) },
    { name: "本科线下", value: Math.max(0, activeScores.length - undergraduateCount) },
  ];
  const bestConversionClass = [...currentClassSummaries].sort((a, b) => b.undergraduateRate - a.undergraduateRate)[0];

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏：错拍进场 */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem className="sm:col-span-2 xl:col-span-2">
          <div className="glass glow-hover relative flex h-full flex-col justify-between gap-6 overflow-hidden p-6">
            <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
            <div>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-accent/80">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                Exam Intelligence
              </p>
              <h2 className="mt-3 text-[clamp(20px,2vw,26px)] font-semibold leading-snug text-ink">
                {exam}考试<br />
                <span className="grad-text">{track}质量驾驶舱</span>
              </h2>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-muted">
                把复杂成绩转化为清晰决策。从年级概况下钻到班级、学科、学生与小题，每个结论均由导入数据实时重算。
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-faint">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-tier-under" />本地隐私计算</span>
                <span className="inline-flex items-center gap-1.5"><Sparkles size={13} className="text-accent2" />智能洞察已启用</span>
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-faint">
                <span>Live Snapshot</span>
                <span className="inline-flex items-center gap-1.5 text-tier-under"><span className="h-1 w-1 animate-pulse rounded-full bg-tier-under" />实时</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted">特控 / 一本</p>
                  <p className="kpi-num mt-1 text-2xl font-semibold text-tier-top">
                    {topCount}
                    <span className="ml-2 text-xs font-normal text-muted">{percent(topRate)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">本科上线</p>
                  <p className="kpi-num mt-1 text-2xl font-semibold text-tier-under">
                    {undergraduateCount}
                    <span className="ml-2 text-xs font-normal text-muted">{percent(undergraduateRate)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Hoverable>
            <StatBlock icon={<UsersRound size={16} />} label="参考人数" value={activeScores.length} note={`${currentClassSummaries.length}个班级纳入分析`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable>
            <StatBlock
              tone="violet"
              icon={<Medal size={16} />}
              label="年级平均分"
              value={gradeAverage}
              digits={1}
              note={`最高分${activeScores.length ? format1(Math.max(...activeScores.map((row) => row.total))) : "—"}`}
            />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable>
            <StatBlock tone="amber" icon={<Target size={16} />} label="特控/一本上线" value={topCount} suffix="人" note={`上线率${percent(topRate)}`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable>
            <StatBlock
              tone="green"
              icon={<CheckCircle2 size={16} />}
              label="本科上线"
              value={undergraduateCount}
              suffix="人"
              note={`一本临界${topCritical.length}人 · 本科临界${undergraduateCritical.length}人`}
            />
          </Hoverable>
        </StaggerItem>

        <StaggerItem className="sm:col-span-2 xl:col-span-2">
          <div className="glass glow-hover flex h-full flex-wrap items-center gap-5 p-5">
            <div className="relative h-16 w-16 shrink-0 rounded-full" style={{ background: `conic-gradient(${qualityRing} ${dataQualityScore * 3.6}deg, var(--color-line) 0deg)` }}>
              <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-bg1">
                <span className="kpi-num text-lg font-semibold text-ink">{dataQualityScore}</span>
              </div>
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="text-xs text-muted">数据质量与容错状态</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {warningCount ? `${warningCount}项提醒，已自动降级处理` : "数据结构完整，可放心分析"}
              </p>
              <p className="mt-1 text-[11px] text-faint">
                学科完整度{percent(subjectCompleteness)} · 分数线完整度{percent(thresholdCompleteness)} · 缺失项不会按0分计算
              </p>
            </div>
            <GlowButton tone="ghost" onClick={() => ctx.go("settings")}>
              查看数据质检<ArrowUpRight size={14} />
            </GlowButton>
          </div>
        </StaggerItem>
      </Stagger>

      {/* 以下区块：进入视口逐块浮现 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel
            title="成绩分布光谱"
            subtitle={`中位数 ${format1(scoreStats.median)} · 四分位区间 ${format1(scoreStats.p25)}—${format1(scoreStats.p75)}`}
            className="h-full"
          >
            {scoreDistribution.length ? (
              <div className="h-[280px]">
                <DistributionChart bins={scoreDistribution} medianBinLabel={medianBinLabel} />
              </div>
            ) : (
              <EmptyState icon={<BarChart3 size={30} />} title="当前筛选范围没有可绘制的分数" />
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted">
              <span>标准差 <b className="kpi-num text-ink">{format1(scoreStats.standardDeviation)}</b></span>
              <span>最高分 <b className="kpi-num text-ink">{format1(scoreStats.max)}</b></span>
              <span>最低分 <b className="kpi-num text-ink">{format1(scoreStats.min)}</b></span>
            </div>
          </Panel>
        </Reveal>

        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="学生分层行动栈" subtitle="先看人数，再决定教学资源投放" className="h-full">
            {scoreSegments.length ? (
              <div className="flex flex-col gap-4">
                {scoreSegments.map((segment) => (
                  <SegmentBar key={segment.id} label={segment.label} count={segment.count} rate={segment.rate} intent={segment.intent} color={SEGMENT_COLORS[segment.id]} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<Target size={30} />} title="当前筛选范围没有可分层的学生" />
            )}
          </Panel>
        </Reveal>

        <Reveal className="lg:col-span-2 xl:col-span-4">
          <Panel title="证据驱动的智能洞察" subtitle="每条结论都能回到分布、分层、学科和班级数据">
            {executiveInsights.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {executiveInsights.map((insight) => <InsightCard key={insight.id} {...insight} />)}
              </div>
            ) : (
              <EmptyState icon={<Sparkles size={30} />} title="当前筛选范围暂无可生成的洞察" hint="导入成绩并选择考试后，洞察会自动生成。" />
            )}
          </Panel>
        </Reveal>

        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="班级一本 / 本科上线率" subtitle="橙色为一本，绿色为本科；同组柱可直接比较转化空间" action={<TierLegend />} className="h-full">
            {rankData.length ? (
              <div className="h-[300px]"><RateBarsChart data={rankData} /></div>
            ) : (
              <EmptyState icon={<UsersRound size={30} />} title="当前筛选范围没有班级数据" />
            )}
          </Panel>
        </Reveal>

        <Reveal>
          <Panel title="上线结构" subtitle="按当前分数线自动计算" className="h-full">
            {activeScores.length ? (
              <div className="pie-wrap relative h-[260px]">
                <TrackPieChart data={pieData} />
                <div className="pie-center pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <b className="kpi-num text-[clamp(22px,2.4vw,30px)] font-semibold text-ink">{activeScores.length}</b>
                  <span className="text-[11px] text-muted">总人数</span>
                </div>
              </div>
            ) : (
              <EmptyState icon={<Target size={30} />} title="当前筛选范围没有上线结构数据" />
            )}
          </Panel>
        </Reveal>

        <Reveal>
          <Panel title="学科有效上线" subtitle="一本 / 本科双口径，点击下钻学科分析" className="h-full">
            {subjects.length ? (
              <div className="flex flex-col gap-1">
                {subjects.slice(0, 8).map((item) => (
                  <button
                    key={item.subject}
                    type="button"
                    onClick={() => ctx.go("subjects")}
                    className="rounded-xl border border-transparent px-2 py-2 text-left transition-all duration-300 hover:border-line hover:bg-white/[0.03] active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">{item.subject}</span>
                      <span className="num text-[11px] text-muted">一本{percent(item.topEffectiveRate)} · 本科{percent(item.undergraduateEffectiveRate)}</span>
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <div className="h-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-tier-top shadow-[0_0_8px_rgba(251,191,36,0.45)] transition-[width] duration-700" style={{ width: `${Math.min(100, item.topEffectiveRate * 100)}%` }} />
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-tier-under shadow-[0_0_8px_rgba(52,211,153,0.45)] transition-[width] duration-700" style={{ width: `${Math.min(100, item.undergraduateEffectiveRate * 100)}%` }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={<BarChart3 size={30} />} title="当前筛选范围没有学科数据" />
            )}
          </Panel>
        </Reveal>

        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="本次考试智能洞察" subtitle="根据当前筛选范围实时生成" className="h-full">
            <div className="flex flex-col gap-2.5">
              <MiniInsight
                icon={<TrendingUp size={16} />}
                title="上线转化空间"
                text={`本科上线比一本上线多${Math.max(0, undergraduateCount - topCount)}人，可重点跟踪一本临界生。`}
              />
              <MiniInsight
                icon={<Sparkles size={16} />}
                title="班级亮点"
                text={bestConversionClass ? `${bestConversionClass.classNo}班本科上线率${percent(bestConversionClass.undergraduateRate)}，当前范围表现较优。` : "暂无班级数据"}
              />
              <MiniInsight
                icon={<ShieldCheck size={16} />}
                title="数据可信度"
                text={dataQualityScore >= 95 ? "核心字段完整，分析结果可信度较高。" : "部分字段缺失，系统已按模块降级并保留有效结论。"}
              />
            </div>
          </Panel>
        </Reveal>

        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel
            title="临界生预警"
            subtitle="总分线下20分以内"
            action={<GlowButton tone="ghost" onClick={() => ctx.go("online")}>查看全部<ArrowUpRight size={14} /></GlowButton>}
            className="h-full"
          >
            {critical.length ? (
              <DataTable
                headers={[
                  "类型",
                  "班级",
                  "姓名",
                  <span key="h-total" className="block text-right">总分</span>,
                  <span key="h-top" className="block text-right">一本差</span>,
                  <span key="h-under" className="block text-right">本科差</span>,
                  "优先补强",
                ]}
                maxHeight="300px"
              >
                {critical.slice(0, 8).map((item) => (
                  <tr key={`${item.classNo}-${item.name}`}>
                    <td>{item.criticalTiers.join("、")}</td>
                    <td>{item.classNo}班</td>
                    <td className="text-ink">{item.name}</td>
                    <td className="num text-right">{format1(item.total)}</td>
                    <td className={`num text-right ${(item.topDiff ?? 0) < 0 ? "text-danger" : "text-tier-under"}`}>{item.topDiff === null ? "—" : format1(item.topDiff)}</td>
                    <td className={`num text-right ${(item.undergraduateDiff ?? 0) < 0 ? "text-danger" : "text-tier-under"}`}>{item.undergraduateDiff === null ? "—" : format1(item.undergraduateDiff)}</td>
                    <td>{item.weakSubjects.slice(0, 2).map((weak) => weak.subject).join("、") || "待分析"}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState icon={<ClipboardList size={30} />} title="当前筛选范围没有临界学生" hint="总分距一本/本科线20分以内的学生会出现在这里。" />
            )}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
