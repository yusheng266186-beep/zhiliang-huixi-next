"use client";

// 视图：班级对比。
// 数据口径与旧版 renderClasses 完全一致（classSummaries / classBenchmarks 同参数），仅按「深空观测站」主题重构呈现。
import { useMemo } from "react";
import { Info, UsersRound } from "lucide-react";
import { ClassCompareChart } from "../components/charts";
import { Reveal, Stagger, StaggerItem } from "../components/motion";
import { Chip, DataTable, EmptyState, Panel } from "../components/ui";
import { classBenchmarks, classSummaries, filterScores } from "../lib/analytics";
import type { ViewContext } from "../lib/hooks";

const format1 = (value: number) => value.toFixed(1);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const signed = (value: number, format: (input: number) => string) => `${value >= 0 ? "+" : ""}${format(value)}`;

/** 一本/本科颜色说明（与旧版 TierLegend 语义一致） */
function TierLegend() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-top" />一本/特控</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-tier-under" />本科</span>
    </div>
  );
}

/** 「只看该班」行内动作 */
function FocusButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border border-line px-3 py-1 text-[11px] text-muted transition-all duration-300 hover:border-accent/60 hover:text-accent active:scale-[0.97]"
    >
      只看该班
    </button>
  );
}

export default function ClassesView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;

  // ---- 与旧版完全相同的数据链 ----
  const activeScores = useMemo(() => filterScores(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  const allClassSummaries = useMemo(() => classSummaries(dataset, exam, track), [dataset, exam, track]);
  const currentClassSummaries = useMemo(
    () => allClassSummaries.filter((item) => classNo === "全部" || item.classNo === classNo),
    [allClassSummaries, classNo],
  );
  const benchmarkRows = useMemo(
    () => classBenchmarks(dataset, exam, track).filter((item) => classNo === "全部" || item.classNo === classNo),
    [dataset, exam, track, classNo],
  );

  // 图表数据（与旧版字段一致：name / 平均分 / 一本率 / 本科率）
  const chartData = currentClassSummaries.map((item) => ({
    name: `${item.classNo}班`,
    平均分: Number(item.average.toFixed(1)),
    一本率: Number((item.topRate * 100).toFixed(1)),
    本科率: Number((item.undergraduateRate * 100).toFixed(1)),
  }));
  const ranked = [...currentClassSummaries].sort((a, b) => b.average - a.average);

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏：错拍进场 */}
      <Stagger className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem className="lg:col-span-2 xl:col-span-2">
          <Panel
            title="班级横向对比"
            subtitle="平均分及一本/本科上线率，建议优先在同班型内比较"
            action={<TierLegend />}
            className="h-full"
          >
            {chartData.length ? (
              <div className="h-[340px]"><ClassCompareChart data={chartData} /></div>
            ) : (
              <EmptyState icon={<UsersRound size={30} />} title="当前筛选范围没有班级数据" />
            )}
          </Panel>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2 xl:col-span-2">
          <Panel
            title="班级指标排名"
            subtitle="按平均分排序，点击班级聚焦该班分析"
            action={classNo !== "全部" ? <Chip onClick={() => ctx.setClassNo("全部")}>查看全部班级</Chip> : undefined}
            className="h-full"
          >
            {ranked.length ? (
              <DataTable
                headers={[
                  "班级",
                  "类别",
                  "班型",
                  <span key="h-count" className="block text-right">人数</span>,
                  <span key="h-avg" className="block text-right">平均分</span>,
                  <span key="h-top" className="block text-right">一本人数/率</span>,
                  <span key="h-under" className="block text-right">本科人数/率</span>,
                  "操作",
                ]}
                maxHeight="400px"
              >
                {ranked.map((item, index) => (
                  <tr
                    key={item.classNo}
                    onClick={() => ctx.setClassNo(item.classNo)}
                    className="cursor-pointer"
                    title={`只看 ${item.classNo}班`}
                  >
                    <td><b className="text-ink">{index + 1}. {item.classNo}班</b></td>
                    <td>{item.track}</td>
                    <td>{item.type}</td>
                    <td className="num text-right">{item.count}</td>
                    <td className="num text-right">{format1(item.average)}</td>
                    <td className="num text-right">{item.topCount} / {percent(item.topRate)}</td>
                    <td className="num text-right">{item.undergraduateCount} / {percent(item.undergraduateRate)}</td>
                    <td><FocusButton onClick={() => ctx.setClassNo(item.classNo)} /></td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState icon={<UsersRound size={30} />} title="当前筛选范围没有班级数据" />
            )}
          </Panel>
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Panel title="同类班对标" subtitle="平均分差、一本率差和本科率差均相对同组基准">
          {benchmarkRows.length ? (
            <>
              <DataTable
                headers={[
                  "班级",
                  "类别",
                  "班型",
                  "对标组",
                  <span key="h-count" className="block text-right">人数</span>,
                  <span key="h-avg" className="block text-right">平均分</span>,
                  <span key="h-avg-delta" className="block text-right">同组均分差</span>,
                  <span key="h-top" className="block text-right">一本率（差值）</span>,
                  <span key="h-under" className="block text-right">本科率（差值）</span>,
                  <span key="h-rank" className="block text-right">同组位次</span>,
                ]}
                maxHeight="480px"
              >
                {benchmarkRows.map((item) => (
                  <tr key={`benchmark-${item.classNo}`}>
                    <td><b className="text-ink">{item.classNo}班</b></td>
                    <td>{item.track}</td>
                    <td>{item.type}</td>
                    <td>{item.peerGroup}</td>
                    <td className="num text-right">{item.count}</td>
                    <td className="num text-right">{format1(item.average)}</td>
                    <td className={`num text-right ${item.averageDelta >= 0 ? "text-tier-under" : "text-danger"}`}>
                      {signed(item.averageDelta, format1)}
                    </td>
                    <td className="num text-right">
                      {percent(item.topRate)}
                      <small className={`ml-1.5 ${item.topRateDelta >= 0 ? "text-tier-under" : "text-danger"}`}>
                        {signed(item.topRateDelta, percent)}
                      </small>
                    </td>
                    <td className="num text-right">
                      {percent(item.undergraduateRate)}
                      <small className={`ml-1.5 ${item.undergraduateRateDelta >= 0 ? "text-tier-under" : "text-danger"}`}>
                        {signed(item.undergraduateRateDelta, percent)}
                      </small>
                    </td>
                    <td className="num text-right">{item.peerRank} / {item.peerSize}</td>
                  </tr>
                ))}
              </DataTable>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
                <Info size={13} className="mt-0.5 shrink-0" />
                对标组优先取「同类别 · 同班型」；同组不足2个班时自动与同类别比较。位次为平均分在同组内的排名，建议在同班型内解读差值。
              </p>
            </>
          ) : (
            <EmptyState
              icon={<UsersRound size={30} />}
              title={activeScores.length ? "当前班级暂无同组对标数据" : "当前筛选范围没有班级数据"}
              hint={activeScores.length ? "该班在当前口径下没有可比较的同组班级。" : "调整顶部的考试、类别或班级筛选后再试。"}
            />
          )}
        </Panel>
      </Reveal>
    </div>
  );
}
