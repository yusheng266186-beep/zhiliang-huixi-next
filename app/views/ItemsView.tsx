"use client";

// 视图：小题知识点。
// 数据口径与旧版 renderItems 完全一致（学科映射、题库/答题记录过滤、小题得分率、空态文案语义），
// 并按新信息架构把旧版「知识点优先级」（knowledgeSummaries）并入本视图。仅按「深空观测站」主题重构呈现。
import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, BookOpenCheck, ListChecks, Sparkles, Target } from "lucide-react";
import { ItemRateChart } from "../components/charts";
import { Hoverable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { Chip, DataTable, EmptyState, Panel, StatBlock } from "../components/ui";
import { average, knowledgeSummaries, subjectSummaries } from "../lib/analytics";
import type { KnowledgeSummary } from "../lib/analytics";
import type { ViewContext } from "../lib/hooks";
import type { ItemResponse, SubjectName } from "../lib/types";

const format1 = (value: number) => value.toFixed(1);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** 知识点优先级彩色徽章：优势保持=绿 / 巩固提升=青 / 优先补弱=橙 */
const PRIORITY_STYLES: Record<KnowledgeSummary["priority"], string> = {
  "优势保持": "border-tier-under/50 bg-tier-under/10 text-tier-under",
  "巩固提升": "border-accent/50 bg-accent/10 text-accent",
  "优先补弱": "border-warn/50 bg-warn/10 text-warn",
};

function PriorityChip({ priority }: { priority: KnowledgeSummary["priority"] }) {
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] ${PRIORITY_STYLES[priority]}`}>{priority}</span>;
}

/** 小题诊断徽章（口径与旧版一致：≥75% 掌握较好 / ≥60% 基本掌握 / <60% 重点补弱） */
function DiagnosisChip({ rate }: { rate: number }) {
  const label = rate >= 0.75 ? "掌握较好" : rate >= 0.6 ? "基本掌握" : "重点补弱";
  const cls = rate >= 0.75
    ? "border-tier-under/50 bg-tier-under/10 text-tier-under"
    : rate >= 0.6
      ? "border-line bg-white/5 text-muted"
      : "border-warn/50 bg-warn/10 text-warn";
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] ${cls}`}>{label}</span>;
}

/** 无数据时的占位卡（旧版该位置显示「—」，样式与 StatBlock 对齐） */
function PlaceholderStat({ label }: { label: string }) {
  return (
    <div className="glass glow-hover relative h-full overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 opacity-20 blur-2xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wider text-muted">{label}</p>
      </div>
      <p className="kpi-num mt-2 text-[clamp(26px,3.2vw,40px)] font-semibold leading-none text-faint">—</p>
      <p className="mt-2 text-[11px] text-faint">暂无小题数据</p>
    </div>
  );
}

export default function ItemsView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;
  const [subject, setSubject] = useState<SubjectName>("语文");

  // ---- 与旧版完全相同的数据链 ----
  const subjects = useMemo(() => subjectSummaries(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const activeSubject = subjects.some((item) => item.subject === subject) ? subject : subjects[0]?.subject ?? subject;
  // 题库来源学科的特例映射（日语↔英语、9班/物理类地理→生物）与旧版一致
  const itemSourceSubject: SubjectName = activeSubject === "日语"
    ? "英语"
    : activeSubject === "地理" && (classNo === 9 || (classNo === "全部" && track === "物理类"))
      ? "生物"
      : activeSubject;
  const questionBank = useMemo(() => dataset.questionBanks[`${itemSourceSubject}::${exam}`] ?? [], [dataset, itemSourceSubject, exam]);
  const itemRows = useMemo<ItemResponse[]>(
    () => dataset.itemResponses.filter((row) => row.subject === activeSubject && row.exam === exam && (classNo === "全部" || row.classNo === classNo)),
    [dataset, activeSubject, exam, classNo],
  );
  const itemStats = useMemo(
    () =>
      itemRows.length
        ? questionBank.map((question, index) => {
            const values = itemRows.map((row) => row.scores[index]).filter((value): value is number => typeof value === "number");
            const avg = average(values);
            return {
              question: question.question,
              knowledge: question.knowledge || "未标注",
              maxScore: question.maxScore,
              maxScoreSource: question.maxScoreSource,
              average: avg,
              rate: question.maxScore ? avg / question.maxScore : 0,
            };
          })
        : [],
    [itemRows, questionBank],
  );
  const knowledgeData = useMemo(() => knowledgeSummaries(dataset, exam, activeSubject, track, classNo), [dataset, exam, activeSubject, track, classNo]);
  const chartData = itemStats.map((item) => ({ name: item.question, 得分率: Number((item.rate * 100).toFixed(1)) }));
  const weakItems = [...itemStats].sort((a, b) => a.rate - b.rate);
  const averageRate = itemStats.length ? average(itemStats.map((item) => item.rate)) : null;
  // 空态文案语义与旧版一致
  const emptyItemText = classNo === 7 && activeSubject === "日语"
    ? "源表的英语小题表未包含7班日语答题记录，系统不会将缺失数据按0分计算"
    : "这次考试尚未识别到该学科的小题数据";

  const knowledgeHeaders: ReactNode[] = [
    "知识点",
    <span key="h-q" className="block text-right">小题数</span>,
    <span key="h-r" className="block text-right">答题数</span>,
    <span key="h-rate" className="block text-right">得分率</span>,
    "优先级",
  ];
  const detailHeaders: ReactNode[] = [
    "题号",
    "知识点",
    <span key="h-max" className="block text-right">满分</span>,
    <span key="h-avg" className="block text-right">平均分</span>,
    <span key="h-rate" className="block text-right">得分率</span>,
    "诊断",
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏：学科选择 + 小题统计，错拍进场 */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem className="sm:col-span-2 xl:col-span-1">
          <Panel title="小题分析条件" subtitle="选择学科和班级后自动重算" className="h-full">
            {subjects.length ? (
              <div className="flex flex-wrap gap-2">
                {subjects.map((item) => (
                  <Chip key={item.subject} active={activeSubject === item.subject} onClick={() => setSubject(item.subject)}>
                    {item.subject}
                  </Chip>
                ))}
              </div>
            ) : (
              <EmptyState icon={<BarChart3 size={26} />} title="当前筛选范围没有学科数据" hint="调整顶部的考试、类别或班级筛选后再试。" />
            )}
          </Panel>
        </StaggerItem>

        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock icon={<ListChecks size={16} />} label="识别题目" value={questionBank.length} suffix="题" note={`${activeSubject} · ${exam}考试`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock tone="violet" icon={<BookOpenCheck size={16} />} label="答题记录" value={itemRows.length} suffix="条" note={classNo === "全部" ? "全部班级" : `${classNo}班`} />
          </Hoverable>
        </StaggerItem>
        {averageRate !== null ? (
          <StaggerItem>
            <Hoverable className="h-full">
              <StatBlock tone="green" icon={<Target size={16} />} label="平均得分率" value={averageRate * 100} digits={1} suffix="%" note={`共${itemStats.length}道小题纳入统计`} />
            </Hoverable>
          </StaggerItem>
        ) : (
          <StaggerItem><PlaceholderStat label="平均得分率" /></StaggerItem>
        )}
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 小题得分率 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title={`${activeSubject}小题得分率`} subtitle="低于60%的题目以橙色提示" className="h-full">
            {chartData.length ? (
              <div className="h-[340px]">
                <ItemRateChart data={chartData} />
              </div>
            ) : (
              <EmptyState icon={<BarChart3 size={30} />} title={emptyItemText} hint="导入包含小题得分的工作簿后，这里会自动生成得分率分析。" />
            )}
          </Panel>
        </Reveal>

        {/* 知识点掌握（knowledgeSummaries） */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="知识点掌握" subtitle="把小题得分率聚合为可执行的补弱顺序" className="h-full">
            {knowledgeData.length ? (
              <>
                <DataTable headers={knowledgeHeaders} maxHeight="300px">
                  {knowledgeData.map((item, index) => (
                    <tr key={`${item.knowledge}-${index}`}>
                      <td className="font-medium text-ink">{item.knowledge}</td>
                      <td className="num text-right">{item.questionCount}</td>
                      <td className="num text-right">{item.responseCount.toLocaleString()}</td>
                      <td className="num text-right font-semibold text-ink">{percent(item.rate)}</td>
                      <td><PriorityChip priority={item.priority} /></td>
                    </tr>
                  ))}
                </DataTable>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
                  <Sparkles size={13} className="mt-0.5 shrink-0 text-accent2" />
                  优先补弱 = 低得分率且已覆盖的共性问题；巩固提升 = 需要分层作业；优势保持 = 保持高阶题训练。
                </p>
              </>
            ) : (
              <EmptyState icon={<Sparkles size={30} />} title={emptyItemText} hint="知识点掌握度由小题得分聚合而成，需要先识别到小题数据。" />
            )}
          </Panel>
        </Reveal>

        {/* 薄弱知识点 Top6 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="薄弱知识点" subtitle="按小题得分率从低到高" className="h-full">
            {weakItems.length ? (
              <div className="flex flex-col gap-2">
                {weakItems.slice(0, 6).map((item, index) => (
                  <div key={`${item.question}-${index}`} className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors duration-300 hover:border-line hover:bg-white/[0.03]">
                    <span className={`num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${item.rate < 0.6 ? "border-warn/40 bg-warn/10 text-warn" : "border-line bg-white/5 text-muted"}`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[13px] text-ink">{item.knowledge}</b>
                      <small className="block truncate text-[11px] text-muted">
                        {item.question} · 均分{format1(item.average)}/{item.maxScore ?? "—"}{item.maxScoreSource === "inferred" ? " · 推断满分" : ""}
                      </small>
                    </div>
                    <strong className={`num shrink-0 text-sm font-semibold ${item.rate < 0.6 ? "text-warn" : "text-ink"}`}>{percent(item.rate)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Target size={30} />} title={emptyItemText} hint="导入包含小题得分的工作簿后，这里会按得分率列出薄弱题目。" />
            )}
          </Panel>
        </Reveal>

        {/* 小题明细 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="小题明细" subtitle="分值、知识点、平均得分和得分率；推断满分带有标记" className="h-full">
            <DataTable headers={detailHeaders} maxHeight="400px" empty={itemStats.length === 0}>
              {itemStats.map((item) => (
                <tr key={item.question}>
                  <td className="text-muted">{item.question}</td>
                  <td className="font-medium text-ink">{item.knowledge}</td>
                  <td className="num text-right">{item.maxScore ?? "—"}{item.maxScoreSource === "inferred" ? "*" : ""}</td>
                  <td className="num text-right">{format1(item.average)}</td>
                  <td className="num text-right font-semibold text-ink">{percent(item.rate)}</td>
                  <td><DiagnosisChip rate={item.rate} /></td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
