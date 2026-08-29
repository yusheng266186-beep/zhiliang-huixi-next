"use client";

import { Suspense, lazy, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Database,
  GraduationCap,
  LayoutDashboard,
  LineChart as LineChartIcon,
  LoaderCircle,
  Menu,
  Search,
  Settings,
  Sparkles,
  Upload,
  UsersRound,
} from "lucide-react";
import { motion } from "motion/react";
import { DatasetProvider, useDataset, useFilters, type ViewContext, type ViewId } from "./lib/hooks";
import type { GradeDataset, Track } from "./lib/types";
import { GlowButton, Select } from "./components/ui";
import { PageTransition, Stagger, StaggerItem } from "./components/motion";
import "./styles/globals.css";

const views = {
  dashboard: { label: "总览", icon: LayoutDashboard, group: "全局分析", load: () => import("./views/DashboardView") },
  grade: { label: "年级成绩", icon: Search, group: "全局分析", load: () => import("./views/GradeView") },
  classes: { label: "班级对比", icon: BarChart3, group: "全局分析", load: () => import("./views/ClassesView") },
  subjects: { label: "学科分析", icon: BookOpenCheck, group: "精细诊断", load: () => import("./views/SubjectsView") },
  students: { label: "学生画像", icon: UsersRound, group: "精细诊断", load: () => import("./views/StudentsView") },
  online: { label: "上线与临界", icon: GraduationCap, group: "精细诊断", load: () => import("./views/OnlineView") },
  items: { label: "小题知识点", icon: Sparkles, group: "精细诊断", load: () => import("./views/ItemsView") },
  history: { label: "历次考试", icon: LineChartIcon, group: "精细诊断", load: () => import("./views/HistoryView") },
  reports: { label: "报告中心", icon: ClipboardList, group: "输出与设置", load: () => import("./views/ReportsView") },
  settings: { label: "规则与班型", icon: Settings, group: "输出与设置", load: () => import("./views/SettingsView") },
} as const;

const viewComponents = Object.fromEntries(
  Object.entries(views).map(([id, meta]) => [id, lazy(meta.load)]),
) as Record<ViewId, React.LazyExoticComponent<(props: { ctx: ViewContext }) => React.JSX.Element>>;

const groups = ["全局分析", "精细诊断", "输出与设置"] as const;

export default function Home() {
  return (
    <DatasetProvider>
      <AppShell />
    </DatasetProvider>
  );
}

function AppShell() {
  const data = useDataset();
  const filters = useFilters(data.dataset);
  const [view, setView] = useState<ViewId>("dashboard");

  const ctx: ViewContext | null = useMemo(() => {
    if (!data.dataset) return null;
    return {
      dataset: data.dataset,
      exam: filters.exam,
      track: filters.track,
      classNo: filters.classNo,
      setExam: filters.setExam,
      setTrack: filters.setTrack,
      setClassNo: filters.setClassNo,
      go: (next: ViewId) => setView(next),
    };
  }, [data.dataset, filters]);

  const ActiveView = ctx ? viewComponents[view] : null;
  // 设置页的导入流程必须在"无数据"时也可达：用空数据集桩构造一个仅设置页使用的 ctx
  const emptyDataset: GradeDataset = {
    id: "empty", sourceName: "", importedAt: "", school: "", exams: [], scores: [],
    thresholds: [], questionBanks: {}, itemResponses: [], issues: [], sheets: [],
  };
  const shellCtx: ViewContext | null = ctx ?? (view === "settings"
    ? { dataset: emptyDataset, exam: "", track: "全部", classNo: "全部", setExam: () => {}, setTrack: () => {}, setClassNo: () => {}, go: (next: ViewId) => setView(next) }
    : null);
  const ShellView = shellCtx ? viewComponents[view] : null;

  return (
    <div className="min-h-screen">
      <div className="aurora" />
      <div className="mx-auto flex min-h-screen w-full max-w-[1560px]">
        <SideRail view={view} onView={setView} disabled={false} />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10">
          <TopBar data={data} filters={filters} view={view} onView={setView} />
          {!shellCtx ? (
            data.status === "restoring" ? <RestoringScreen /> : <WelcomeScreen data={data} onView={setView} />
          ) : (
            <PageTransition viewKey={view}>
              <Suspense fallback={<ViewSkeleton />}>
                {ShellView && <ShellView ctx={shellCtx} />}
              </Suspense>
            </PageTransition>
          )}
        </main>
      </div>
      <MobileNav view={view} onView={setView} disabled={false} />
    </div>
  );
}

/** 左侧玻璃导航栏（桌面） */
function SideRail({ view, onView, disabled }: { view: ViewId; onView: (view: ViewId) => void; disabled: boolean }) {
  return (
    <motion.nav
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center gap-1 py-5 md:flex"
    >
      <div className="glass mb-4 flex h-11 w-11 items-center justify-center rounded-2xl">
        <GraduationCap size={20} className="text-accent" />
      </div>
      {groups.map((group) => (
        <div key={group} className="mb-2 flex w-full flex-col items-center gap-1">
          <p className="select-none text-[9px] uppercase tracking-widest text-faint" style={{ writingMode: "vertical-rl" }}>{group}</p>
          {(Object.entries(views) as Array<[ViewId, (typeof views)[ViewId]]>)
            .filter(([, meta]) => meta.group === group)
            .map(([id, meta]) => (
              <RailButton key={id} active={view === id} disabled={disabled} label={meta.label} onClick={() => onView(id)}>
                <meta.icon size={19} />
              </RailButton>
            ))}
        </div>
      ))}
    </motion.nav>
  );
}

function RailButton({ active, children, label, onClick, disabled }: { active: boolean; children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-300 disabled:opacity-30 ${active ? "text-bg0" : "text-muted hover:bg-white/5 hover:text-ink"}`}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          className="absolute inset-0 rounded-xl bg-accent shadow-[0_0_22px_rgba(34,211,238,0.45)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/** 顶部：标题 + 全局筛选条 + 数据源 */
function TopBar({ data, filters, view, onView }: {
  data: ReturnType<typeof useDataset>;
  filters: ReturnType<typeof useFilters>;
  view: ViewId;
  onView: (view: ViewId) => void;
}) {
  const dataset = data.dataset;
  const examOptions = (dataset?.exams ?? []).map((name) => ({ value: name, label: name }));
  return (
    <header className="mb-6 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent/80">Quality Insight · NEXT</p>
          <h1 className="mt-1 text-xl font-semibold tracking-wide text-ink">
            质量慧析 <span className="grad-text">深空观测站</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {dataset && (
            <span className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] text-muted sm:inline-flex">
              <Database size={12} className="text-tier-under" />
              {dataset.sourceName || "本地数据集"} · {dataset.scores.length.toLocaleString()} 条
            </span>
          )}
          <GlowButton tone="ghost" onClick={() => onView("settings")}>
            <Upload size={14} /> 导入 / 设置
          </GlowButton>
        </div>
      </div>
      {dataset && (
        <div className="glass mt-4 flex flex-wrap items-center gap-3 px-4 py-3">
          <Select
            label="考试"
            value={filters.exam}
            onChange={filters.setExam}
            options={examOptions.length ? examOptions : [{ value: filters.exam, label: filters.exam || "—" }]}
          />
          <Select
            label="类别"
            value={filters.track}
            onChange={(value) => filters.setTrack(value as Track | "全部")}
            options={[
              { value: "全部", label: "全部类别" },
              { value: "物理类", label: "物理类" },
              { value: "历史类", label: "历史类" },
            ]}
          />
          <Select
            label="班级"
            value={String(filters.classNo)}
            onChange={(value) => filters.setClassNo(value === "全部" ? "全部" : Number(value))}
            options={[{ value: "全部", label: "全部班级" }, ...Array.from({ length: 21 }, (_, index) => index + 1).map((no) => ({ value: String(no), label: `${no}班` }))]}
          />
          <span className="ml-auto hidden text-[11px] text-faint lg:inline">当前视图：{views[view].label}</span>
        </div>
      )}
      {data.importMessage && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl border border-accent/30 bg-accent/8 px-4 py-2.5 text-xs text-accent"
        >
          {data.importMessage}
          <button type="button" className="ml-3 text-muted underline-offset-2 hover:underline" onClick={data.dismissMessage}>知道了</button>
        </motion.p>
      )}
    </header>
  );
}

/** 欢迎页（无数据时） */
function WelcomeScreen({ data, onView }: { data: ReturnType<typeof useDataset>; onView: (view: ViewId) => void }) {
  return (
    <Stagger className="mt-[12vh] flex flex-col items-center text-center">
      <StaggerItem>
        <div className="glass mb-6 flex h-20 w-20 items-center justify-center rounded-3xl">
          <GraduationCap size={36} className="text-accent" />
        </div>
      </StaggerItem>
      <StaggerItem><h2 className="text-3xl font-semibold tracking-wide">把成绩单，变成<span className="grad-text">观测站</span></h2></StaggerItem>
      <StaggerItem><p className="mt-4 max-w-md text-sm leading-relaxed text-muted">导入质量复盘工作簿，即可在本地完成年级、班级、学科、学生与小题的全链路分析。数据只留在本机浏览器中。</p></StaggerItem>
      <StaggerItem className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <GlowButton onClick={() => { data.loadDemo(); }}>
          <Sparkles size={15} /> 先看演示数据
        </GlowButton>
        <GlowButton tone="violet" onClick={() => onView("settings")}>
          <Menu size={15} /> 了解导入方式
        </GlowButton>
      </StaggerItem>
    </Stagger>
  );
}

function RestoringScreen() {
  return (
    <div className="mt-[14vh] flex flex-col items-center gap-3 text-muted">
      <LoaderCircle size={26} className="animate-spin text-accent" />
      <p className="text-xs">正在恢复本地数据…</p>
    </div>
  );
}

function ViewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="glass h-36 animate-pulse" style={{ animationDelay: `${index * 90}ms` }} />
      ))}
    </div>
  );
}

/** 移动端底部导航 */
function MobileNav({ view, onView, disabled }: { view: ViewId; onView: (view: ViewId) => void; disabled: boolean }) {
  const mobileItems: Array<[ViewId, (typeof views)[ViewId]["label"], (typeof views)[ViewId]["icon"]]> = [
    ["dashboard", views.dashboard.label, views.dashboard.icon],
    ["grade", views.grade.label, views.grade.icon],
    ["students", views.students.label, views.students.icon],
    ["reports", views.reports.label, views.reports.icon],
    ["settings", views.settings.label, views.settings.icon],
  ];
  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-20 flex items-center justify-around rounded-2xl px-2 py-2 md:hidden">
      {mobileItems.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => onView(id)}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] transition-colors duration-300 disabled:opacity-30 ${view === id ? "text-accent" : "text-muted"}`}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
}
