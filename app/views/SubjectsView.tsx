"use client";

// 视图：学科分析。
// 数据口径与旧版 renderSubjects 完全一致（subjectSummaries / classSummaries 同参数同过滤），
// 知识点优先级按新信息架构移至「小题知识点」视图，此处不再重复展示。仅按「深空观测站」主题重构呈现。
import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, CheckCircle2, Medal, Target } from "lucide-react";
import { SubjectClassChart } from "../components/charts";
import { Hoverable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { Chip, DataTable, EmptyState, Panel, StatBlock } from "../components/ui";
import { classSummaries, subjectSummaries } from "../lib/analytics";
import type { ViewContext } from "../lib/hooks";
import type { SubjectName } from "../lib/types";

const format1 = (value: number) => value.toFixed(1);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** 无数据时的占位卡（旧版该位置显示「—」，样式与 StatBlock 对齐） */
function PlaceholderStat({ label }: { label: string }) {
  return (
    <div className="glass glow-hover relative h-full overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 opacity-20 blur-2xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wider text-muted">{label}</p>
      </div>
      <p className="kpi-num mt-2 text-[clamp(26px,3.2vw,40px)] font-semibold leading-none text-faint">—</p>
      <p className="mt-2 text-[11px] text-faint">当前筛选范围没有该学科数据</p>
    </div>
  );
}

export default function SubjectsView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;
  const [subject, setSubject] = useState<SubjectName>("语文");

  // ---- 与旧版完全相同的数据链 ----
  const subjects = useMemo(() => subjectSummaries(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  // 学科选择的兜底逻辑与旧版一致：当前选择不在列表时回落到第一个学科
  const activeSubject = subjects.some((item) => item.subject === subject) ? subject : subjects[0]?.subject ?? subject;
  const selected = subjects.find((item) => item.subject === activeSubject) ?? subjects[0];
  const currentClassSummaries = useMemo(
    () => classSummaries(dataset, exam, track).filter((item) => classNo === "全部" || item.classNo === classNo),
    [dataset, exam, track, classNo],
  );
  // 班级对比数据：只保留实际参加该学科（均分 > 0）的班级，与旧版一致
  const classData = useMemo(
    () =>
      currentClassSummaries
        .map((item) => ({ name: `${item.classNo}班`, average: Number((item.subjectAverages[activeSubject] ?? 0).toFixed(1)) }))
        .filter((item) => item.average > 0),
    [currentClassSummaries, activeSubject],
  );

  const headers: ReactNode[] = [
    "学科",
    <span key="h-count" className="block text-right">参考人数</span>,
    <span key="h-avg" className="block text-right">平均分</span>,
    <span key="h-max" className="block text-right">最高分</span>,
    <span key="h-topline" className="block text-right">一本有效分</span>,
    <span key="h-top" className="block text-right">一本人数/率</span>,
    <span key="h-underline" className="block text-right">本科有效分</span>,
    <span key="h-under" className="block text-right">本科人数/率</span>,
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 首屏：学科选择 + 统计卡，错拍进场 */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem className="sm:col-span-2 xl:col-span-1">
          <Panel title="学科选择" subtitle="切换学科查看班级横向差异" className="h-full">
            {subjects.length ? (
              <div className="flex flex-wrap gap-2">
                {subjects.map((item) => (
                  <Chip key={item.subject} active={activeSubject === item.subject} onClick={() => setSubject(item.subject)}>
                    {item.subject}
                    <span className="num ml-1.5 text-[10px] opacity-75">{format1(item.average)}</span>
                  </Chip>
                ))}
              </div>
            ) : (
              <EmptyState icon={<BarChart3 size={26} />} title="当前筛选范围没有学科数据" hint="调整顶部的考试、类别或班级筛选后再试。" />
            )}
          </Panel>
        </StaggerItem>

        {selected ? (
          <>
            <StaggerItem>
              <Hoverable className="h-full">
                <StatBlock
                  icon={<Medal size={16} />}
                  label={`${selected.subject}平均分`}
                  value={selected.average}
                  digits={1}
                  note={`最高分${format1(selected.max)}`}
                />
              </Hoverable>
            </StaggerItem>
            <StaggerItem>
              <Hoverable className="h-full">
                <StatBlock
                  tone="amber"
                  icon={<Target size={16} />}
                  label="一本学科有效"
                  value={selected.topEffectiveCount}
                  suffix="人"
                  note={`有效线${selected.topEffectiveLine ? format1(selected.topEffectiveLine) : "未设置"} · ${percent(selected.topEffectiveRate)}`}
                />
              </Hoverable>
            </StaggerItem>
            <StaggerItem>
              <Hoverable className="h-full">
                <StatBlock
                  tone="green"
                  icon={<CheckCircle2 size={16} />}
                  label="本科学科有效"
                  value={selected.undergraduateEffectiveCount}
                  suffix="人"
                  note={`有效线${selected.undergraduateEffectiveLine ? format1(selected.undergraduateEffectiveLine) : "未设置"} · ${percent(selected.undergraduateEffectiveRate)}`}
                />
              </Hoverable>
            </StaggerItem>
          </>
        ) : (
          <>
            <StaggerItem><PlaceholderStat label={`${activeSubject}平均分`} /></StaggerItem>
            <StaggerItem><PlaceholderStat label="一本学科有效" /></StaggerItem>
            <StaggerItem><PlaceholderStat label="本科学科有效" /></StaggerItem>
          </>
        )}
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 该学科班级横向对比 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title={`${activeSubject}班级横向对比`} subtitle="只比较实际参加该学科的班级" className="h-full">
            {classData.length ? (
              <div className="h-[340px]">
                <SubjectClassChart data={classData} />
              </div>
            ) : (
              <EmptyState icon={<BarChart3 size={30} />} title="当前筛选范围没有该学科的班级数据" hint="调整顶部的考试、类别或班级筛选后再试。" />
            )}
          </Panel>
        </Reveal>

        {/* 学科明细表 */}
        <Reveal className="lg:col-span-2 xl:col-span-2">
          <Panel title="各学科概览" subtitle="一本与本科有效上线双口径" className="h-full">
            <DataTable headers={headers} maxHeight="400px" empty={subjects.length === 0}>
              {subjects.map((item) => (
                <tr key={item.subject} className={item.subject === activeSubject ? "bg-accent/[0.06]" : undefined}>
                  <td className="font-medium text-ink">{item.subject}</td>
                  <td className="num text-right">{item.count}</td>
                  <td className="num text-right">{format1(item.average)}</td>
                  <td className="num text-right">{format1(item.max)}</td>
                  <td className="num text-right">{item.topEffectiveLine ? format1(item.topEffectiveLine) : "未设置"}</td>
                  <td className="num text-right">{item.topEffectiveCount} / {percent(item.topEffectiveRate)}</td>
                  <td className="num text-right">{item.undergraduateEffectiveLine ? format1(item.undergraduateEffectiveLine) : "未设置"}</td>
                  <td className="num text-right">{item.undergraduateEffectiveCount} / {percent(item.undergraduateEffectiveRate)}</td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
