"use client";

// 视图：历次考试。
// 数据口径与旧版 renderHistory 完全一致：对 dataset.exams 逐次按当前类别/班级过滤重算平均分与一本/本科上线，
// 增值对比（平均分/上线人数较上次变化）与「切换班级查看单班变化」建议均保留。仅按「深空观测站」主题重构呈现。
import { useMemo, type ReactNode } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Filter, Lightbulb, Medal, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { GradeTrendChart } from "../components/charts";
import { Hoverable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { DataTable, EmptyState, Panel, StatBlock } from "../components/ui";
import { average, filterScores, getThreshold } from "../lib/analytics";
import type { ViewContext } from "../lib/hooks";

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

/** 数据齐全度提示行 */
function HintRow({ icon, label, text }: { icon: ReactNode; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white/[0.03] p-3.5 transition-colors duration-300 hover:border-line-strong">
      <span className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-accent">{icon}</span>
      <p className="text-xs leading-relaxed text-muted">
        <b className="text-ink">{label}</b>
        <span className="mt-0.5 block">{text}</span>
      </p>
    </div>
  );
}

/** 较上次变化的单元格（首次考试显示「基准」） */
function DeltaCell({ current, previous, digits = 0 }: { current: number; previous?: number; digits?: number }) {
  if (previous === undefined) return <td className="num text-right text-faint">基准</td>;
  const delta = current - previous;
  const positive = delta >= 0;
  const text = digits ? `${positive ? "+" : ""}${format1(delta)}` : `${positive ? "+" : ""}${delta}`;
  return <td className={`num text-right ${positive ? "text-tier-under" : "text-danger"}`}>{text}</td>;
}

export default function HistoryView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;

  // ---- 与旧版完全相同的数据链：逐次考试按当前筛选重算 ----
  const historyData = useMemo(
    () =>
      dataset.exams.map((examName) => {
        const rows = filterScores(dataset, examName, track, classNo);
        return {
          exam: examName,
          average: Number(average(rows.map((row) => row.total)).toFixed(1)),
          top: rows.filter((row) => {
            const line = getThreshold(dataset, examName, row.track)?.topTotal;
            return typeof line === "number" && row.total >= line;
          }).length,
          undergraduate: rows.filter((row) => {
            const line = getThreshold(dataset, examName, row.track)?.undergraduateTotal;
            return typeof line === "number" && row.total >= line;
          }).length,
        };
      }),
    [dataset, track, classNo],
  );

  const latest = historyData.at(-1);
  const previous = historyData.length > 1 ? historyData[historyData.length - 2] : undefined;
  const scopeLabel = `${track} · ${classNo === "全部" ? "全部班级" : `${classNo}班`}`;
  // 增值观察（与旧版文案语义一致）
  const averageDeltaNote = latest && previous
    ? `较${previous.exam}${latest.average >= previous.average ? "提高" : "下降"}${format1(Math.abs(latest.average - previous.average))}分`
    : "暂无对比考试";
  const topDeltaNote = latest && previous
    ? `较上次${latest.top - previous.top >= 0 ? "增加" : "减少"}${Math.abs(latest.top - previous.top)}人`
    : "暂无对比考试";
  const undergraduateDeltaNote = latest && previous
    ? `较上次${latest.undergraduate - previous.undergraduate >= 0 ? "增加" : "减少"}${Math.abs(latest.undergraduate - previous.undergraduate)}人`
    : "暂无对比考试";

  const headers: ReactNode[] = [
    "考试",
    <span key="h-avg" className="block text-right">平均分</span>,
    <span key="h-avg-delta" className="block text-right">较上次</span>,
    <span key="h-top" className="block text-right">一本上线</span>,
    <span key="h-top-delta" className="block text-right">较上次</span>,
    <span key="h-under" className="block text-right">本科上线</span>,
    <span key="h-under-delta" className="block text-right">较上次</span>,
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏 KPI：错拍进场 */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock icon={<CalendarRange size={16} />} label="覆盖考试" value={historyData.length} suffix="次" note={`统计口径：${scopeLabel}`} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock tone="violet" icon={<Medal size={16} />} label="最新平均分" value={latest?.average ?? 0} digits={1} note={averageDeltaNote} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock tone="amber" icon={<Target size={16} />} label="一本上线" value={latest?.top ?? 0} suffix="人" note={topDeltaNote} />
          </Hoverable>
        </StaggerItem>
        <StaggerItem>
          <Hoverable className="h-full">
            <StatBlock tone="green" icon={<CheckCircle2 size={16} />} label="本科上线" value={latest?.undergraduate ?? 0} suffix="人" note={undergraduateDeltaNote} />
          </Hoverable>
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 年级趋势双轴图 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="历次考试年级趋势" subtitle="平均分与上线人数变化" action={<TierLegend />} className="h-full">
            {historyData.length ? (
              <div className="h-[340px]">
                <GradeTrendChart data={historyData} />
              </div>
            ) : (
              <EmptyState icon={<TrendingUp size={30} />} title="暂无考试趋势数据" hint="导入包含多次考试的工作簿后，这里会自动生成趋势。" />
            )}
          </Panel>
        </Reveal>

        {/* 数据齐全度提示 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="数据齐全度提示" subtitle="读懂趋势前先确认口径与缺失处理" className="h-full">
            <div className="flex flex-col gap-2.5">
              <HintRow
                icon={<CalendarRange size={16} />}
                label="趋势覆盖"
                text={`${historyData.length} 次考试${historyData.length ? `（${historyData[0].exam} 至 ${latest?.exam}）` : ""}，按导入顺序排列。`}
              />
              <HintRow icon={<Filter size={16} />} label="统计口径" text={`当前范围为「${scopeLabel}」；${exam ? `趋势图高亮最新考试「${exam}」数据。` : "请在顶部选择考试。"}`} />
              <HintRow
                icon={<ShieldCheck size={16} />}
                label="缺失处理"
                text="分数线缺失的考试，上线人数按0统计；缺失单科不按0分计。"
              />
              <HintRow icon={<Lightbulb size={16} />} label="使用建议" text="切换班级后，可查看单班历次考试变化。" />
            </div>
          </Panel>
        </Reveal>

        {/* 历次考试对照表 */}
        <Reveal className="lg:col-span-2 xl:col-span-4">
          <Panel title="历次考试对照" subtitle="当前筛选范围下各考试的平均分与上线人数，较上次为增量对比" className="h-full">
            <DataTable headers={headers} maxHeight="420px" empty={historyData.length === 0}>
              {historyData.map((item, index) => {
                const prev = index > 0 ? historyData[index - 1] : undefined;
                return (
                  <tr key={item.exam} className={item.exam === exam ? "bg-accent/[0.06]" : undefined}>
                    <td className="font-medium text-ink">{item.exam}</td>
                    <td className="num text-right font-semibold text-ink">{format1(item.average)}</td>
                    <DeltaCell current={item.average} previous={prev?.average} digits={1} />
                    <td className="num text-right">{item.top}</td>
                    <DeltaCell current={item.top} previous={prev?.top} />
                    <td className="num text-right">{item.undergraduate}</td>
                    <DeltaCell current={item.undergraduate} previous={prev?.undergraduate} />
                  </tr>
                );
              })}
            </DataTable>
            {historyData.length > 1 && latest && previous && (
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" />
                增值观察：平均分较{previous.exam}{latest.average >= previous.average ? "提高" : "下降"}
                {format1(Math.abs(latest.average - previous.average))}分，一本上线{latest.top - previous.top >= 0 ? "增加" : "减少"}
                {Math.abs(latest.top - previous.top)}人，本科上线{latest.undergraduate - previous.undergraduate >= 0 ? "增加" : "减少"}
                {Math.abs(latest.undergraduate - previous.undergraduate)}人。
              </p>
            )}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
