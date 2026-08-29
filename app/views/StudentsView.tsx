"use client";

// 视图：学生画像。
// 数据口径与旧版 renderStudents 完全一致：搜索过滤 + 前80条截断保护、默认选中总分最高学生、
// 历次走势（全量考试）、学科诊断（relevantSubjects + 有效线）、学科明细线差。仅按「深空观测站」主题重构呈现。
import { useMemo, useState, type ReactNode } from "react";
import { Search, TrendingUp, UserRoundSearch, X } from "lucide-react";
import { HistoryLineChart, SubjectDiagnosisChart } from "../components/charts";
import { Hoverable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { DataTable, EmptyState, Panel } from "../components/ui";
import { filterScores, getThreshold } from "../lib/analytics";
import { getClassProfile, relevantSubjects } from "../lib/class-config";
import type { ViewContext } from "../lib/hooks";
import type { StudentScore, SubjectName } from "../lib/types";

const format1 = (value: number) => value.toFixed(1);

/** 一本/本科颜色说明（与旧版 TierLegend 语义一致） */
function TierLegend() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-top shadow-[0_0_8px_rgba(251,191,36,0.7)]" />一本/特控</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-under shadow-[0_0_8px_rgba(52,211,153,0.7)]" />本科</span>
    </div>
  );
}

/** 学生上线状态徽章（文案与旧版 StatusTag 一致：一本上线 / 本科上线 / 重点关注） */
function StatusBadge({ tier }: { tier: "top" | "under" | "below" }) {
  const map = {
    top: { label: "一本上线", cls: "border-tier-top/50 bg-tier-top/10 text-tier-top" },
    under: { label: "本科上线", cls: "border-tier-under/50 bg-tier-under/10 text-tier-under" },
    below: { label: "重点关注", cls: "border-danger/50 bg-danger/10 text-danger" },
  }[tier];
  return <span className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] ${map.cls}`}>{map.label}</span>;
}

export default function StudentsView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;
  const [query, setQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentScore | null>(null);

  // ---- 与旧版完全相同的数据链 ----
  const activeScores = useMemo(() => filterScores(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  // 选中学生的有效性校验与兜底（回落到总分最高者）与旧版一致
  const selected = useMemo(() => {
    if (selectedStudent && activeScores.some((row) => row.classNo === selectedStudent.classNo && row.name === selectedStudent.name)) {
      return selectedStudent;
    }
    return [...activeScores].sort((a, b) => b.total - a.total)[0] ?? null;
  }, [selectedStudent, activeScores]);

  // 搜索 + 截断保护：与旧版一致（按姓名包含过滤，先截取前 80 条，再按总分降序展示）
  const matched = useMemo(() => activeScores.filter((row) => !query || row.name.includes(query)), [activeScores, query]);
  const visibleStudents = useMemo(() => [...matched.slice(0, 80)].sort((a, b) => b.total - a.total), [matched]);

  if (!selected) {
    return (
      <EmptyState
        icon={<UserRoundSearch size={30} />}
        title="当前范围没有学生数据"
        hint="调整顶部的考试、类别或班级筛选后再试。"
      />
    );
  }

  // 选中学生的历次考试（跨全部考试，与旧版一致）与学科诊断数据
  const history = dataset.scores
    .filter((row) => row.classNo === selected.classNo && row.name === selected.name)
    .map((row) => ({ exam: row.exam, total: row.total, 市排名: row.cityRank }));
  const threshold = getThreshold(dataset, exam, selected.track);
  const subjectData = relevantSubjects(getClassProfile(selected.classNo)).map((item) => ({
    subject: item,
    score: selected.subjects[item] ?? null,
    topLine: threshold?.topSubjects[item] ?? null,
    undergraduateLine: threshold?.undergraduateSubjects[item] ?? null,
  }));
  const status: "top" | "under" | "below" =
    typeof threshold?.topTotal === "number" && selected.total >= threshold.topTotal
      ? "top"
      : typeof threshold?.undergraduateTotal === "number" && selected.total >= threshold.undergraduateTotal
        ? "under"
        : "below";
  // 薄弱学科提示：按距一本有效线的差值升序，列出低于有效线的学科
  const weakTopSubjects = subjectData
    .map((item) => {
      const diff = item.topLine !== null && item.score !== null ? item.score - item.topLine : null;
      return { subject: item.subject, diff };
    })
    .filter((item): item is { subject: SubjectName; diff: number } => item.diff !== null && item.diff < 0)
    .sort((a, b) => a.diff - b.diff);

  const listHeaders: ReactNode[] = [
    "姓名",
    "班级",
    "班型",
    <span key="h-total" className="block text-right">总分</span>,
    <span key="h-city" className="block text-right">市排名</span>,
    <span key="h-school" className="block text-right">校排名</span>,
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏：学生档案 + 检索列表，错拍进场 */}
      <Stagger className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem className="lg:col-span-2 xl:col-span-2">
          <Hoverable className="h-full">
            <div className="glass relative flex h-full flex-col justify-between gap-5 overflow-hidden p-6">
              <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grad-text flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-white/[0.04] text-3xl font-semibold">
                    {selected.name.slice(-1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-wide text-muted">{selected.classNo}班 · {selected.combination} · {selected.classType}</p>
                    <h2 className="mt-1 text-[clamp(20px,2vw,26px)] font-semibold leading-tight text-ink">{selected.name}</h2>
                  </div>
                </div>
                <StatusBadge tier={status} />
              </div>
              <div className="glass grid grid-cols-3 gap-4 rounded-2xl p-4">
                <div>
                  <p className="text-[11px] text-muted">{exam}总分</p>
                  <p className="kpi-num mt-1 text-2xl font-semibold text-ink">{format1(selected.total)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">市排名</p>
                  <p className="kpi-num mt-1 text-2xl font-semibold text-accent">{selected.cityRank ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">校排名</p>
                  <p className="kpi-num mt-1 text-2xl font-semibold text-accent2">{selected.schoolRank ?? "—"}</p>
                </div>
              </div>
            </div>
          </Hoverable>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2 xl:col-span-2">
          <Panel title="学生检索" subtitle="点击学生行查看完整画像" className="h-full">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted">
                <Search size={15} className="shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && setQuery("")}
                  placeholder="输入学生姓名"
                  className="glass-input w-44"
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
              <DataTable headers={listHeaders} maxHeight="264px">
                {visibleStudents.map((row) => {
                  const isSelected = selected.classNo === row.classNo && selected.name === row.name;
                  return (
                    <tr
                      key={`${row.classNo}-${row.name}`}
                      onClick={() => setSelectedStudent(row)}
                      className={`cursor-pointer ${isSelected ? "bg-accent/[0.08]" : undefined}`}
                    >
                      <td className={isSelected ? "font-semibold text-accent" : "font-medium text-ink"}>{row.name}</td>
                      <td>{row.classNo}班</td>
                      <td className="text-muted">{row.classType}</td>
                      <td className="num text-right font-semibold text-ink">{format1(row.total)}</td>
                      <td className="num text-right">{row.cityRank ?? "—"}</td>
                      <td className="num text-right">{row.schoolRank ?? "—"}</td>
                    </tr>
                  );
                })}
              </DataTable>
            ) : (
              <EmptyState
                icon={<Search size={26} />}
                title={`没有找到姓名包含「${query}」的学生`}
                hint="试试更短的关键词，或清除搜索后重试。"
              />
            )}
          </Panel>
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 历次考试走势 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="历次考试走势" subtitle="总分变化" className="h-full">
            {history.length ? (
              <div className="h-[280px]">
                <HistoryLineChart data={history} />
              </div>
            ) : (
              <EmptyState icon={<TrendingUp size={30} />} title="当前学生没有历次考试记录" />
            )}
          </Panel>
        </Reveal>

        {/* 学科上线诊断 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel
            title="学科上线诊断"
            subtitle="个人分数与一本、本科有效分对照；缺失学科不会伪造为0分"
            action={<TierLegend />}
            className="h-full"
          >
            <div className="h-[280px]">
              <SubjectDiagnosisChart data={subjectData} />
            </div>
          </Panel>
        </Reveal>

        {/* 学科明细 + 薄弱学科提示 */}
        <Reveal className="lg:col-span-2 xl:col-span-4">
          <Panel title="学科明细" subtitle="分别显示距离一本、本科有效分的差值；缺失字段显示为—" className="h-full">
            <p className="mb-3 text-xs text-muted">
              薄弱学科提示：
              {weakTopSubjects.length ? (
                <b className="text-warn">
                  {weakTopSubjects.map((item) => `${item.subject}（距一本线 ${format1(item.diff)}）`).join("、")}
                </b>
              ) : (
                <b className="text-tier-under">各科均在一本有效线以上</b>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {subjectData.map((item) => {
                const topDiff = item.topLine !== null && item.score !== null ? item.score - item.topLine : null;
                const undergraduateDiff = item.undergraduateLine !== null && item.score !== null ? item.score - item.undergraduateLine : null;
                return (
                  <div key={item.subject} className={`glass rounded-2xl p-3.5 ${topDiff !== null && topDiff < 0 ? "border-warn/40" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">{item.subject}</span>
                      {topDiff !== null && topDiff < 0 && <span className="text-[10px] text-warn">低于一本线</span>}
                    </div>
                    <b className="kpi-num mt-1 block text-xl font-semibold text-ink">{item.score === null ? "—" : format1(item.score)}</b>
                    <p className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-muted">一本</span>
                      <span className={`num ${topDiff !== null && topDiff < 0 ? "text-danger" : "text-tier-under"}`}>
                        {topDiff === null ? "—" : `${topDiff >= 0 ? "+" : ""}${format1(topDiff)}`}
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center justify-between text-[11px]">
                      <span className="text-muted">本科</span>
                      <span className={`num ${undergraduateDiff !== null && undergraduateDiff < 0 ? "text-danger" : "text-tier-under"}`}>
                        {undergraduateDiff === null ? "—" : `${undergraduateDiff >= 0 ? "+" : ""}${format1(undergraduateDiff)}`}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
