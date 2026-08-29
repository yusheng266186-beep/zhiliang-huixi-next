// 规则与班型：导入流程（拖拽/选择 → 解析 → 质检提醒 → 持久化）、演示与清除数据、
// 班型配置、字段识别与模块能力面板。数据操作只通过 lib/hooks 的 useDataset 入口，
// 展示数据与视图上下文保持一致（用户在本视图执行导入/演示/清除后切换为本地结果）。
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, CheckCircle2, Database, FileSpreadsheet, LoaderCircle, ShieldCheck, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Collapse, EASE_OUT_EXPO, Hoverable, Pressable, Reveal, Stagger, StaggerItem } from "../components/motion";
import { DataTable, EmptyState, GlowButton, Panel } from "../components/ui";
import { filterScores, getThreshold } from "../lib/analytics";
import { CLASS_PROFILES, getClassProfile, relevantSubjects } from "../lib/class-config";
import { useDataset, type ViewContext } from "../lib/hooks";
import type { ImportIssue, Track } from "../lib/types";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const cnDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const ISSUE_STYLE: Record<ImportIssue["level"], { icon: typeof AlertTriangle; wrap: string; iconCls: string }> = {
  error: { icon: X, wrap: "border-danger/40 bg-danger/8", iconCls: "text-danger" },
  warning: { icon: AlertTriangle, wrap: "border-warn/40 bg-warn/8", iconCls: "text-warn" },
  info: { icon: CheckCircle2, wrap: "border-line bg-white/[0.03]", iconCls: "text-tier-under" },
};

type Notice = { text: string; tone: "success" | "error" };

/** 细进度条：进入视口后从 0 展开到目标宽度 */
function MeterBar({ value, color, glow }: { value: number; color: string; glow: string }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${glow}` }}
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.max(2, value * 100)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
      />
    </div>
  );
}

function MiniStat({ label, value, unit, tone = "text-ink" }: { label: string; value: string; unit: string; tone?: string }) {
  return (
    <div className="glass p-3">
      <p className="text-[11px] tracking-wider text-muted">{label}</p>
      <p className={`kpi-num mt-1 text-xl font-semibold leading-none ${tone}`}>
        {value}
        <span className="ml-1 text-[11px] font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}

export default function SettingsView({ ctx }: { ctx: ViewContext }) {
  const { exam, track, classNo } = ctx;
  const local = useDataset();
  const reduced = useReducedMotion();

  const [useLocalData, setUseLocalData] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const failedRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 导入/演示/清除在本地 DatasetState 上执行；执行后展示本地结果，其余情况镜像视图上下文的数据。
  const dataset = useLocalData ? local.dataset : ctx.dataset;

  // useDataset 的 importMessage 是唯一数据入口消息：同步到行内提示条（错误消息来自 importWorkbook 抛出的异常）。
  useEffect(() => {
    setNotice(local.importMessage ? { text: local.importMessage, tone: failedRef.current ? "error" : "success" } : null);
  }, [local.importMessage]);

  const issues = dataset?.issues ?? [];
  const warningCount = issues.filter((item) => item.level === "warning" || item.level === "error").length;

  const activeScores = useMemo(
    () => (dataset ? filterScores(dataset, exam, track, classNo) : []),
    [dataset, exam, track, classNo],
  );
  const subjectCompleteness = useMemo(() => {
    const expected = activeScores.reduce((sum, row) => sum + relevantSubjects(getClassProfile(row.classNo)).length, 0);
    const present = activeScores.reduce((sum, row) => sum + relevantSubjects(getClassProfile(row.classNo)).filter((item) => typeof row.subjects[item] === "number").length, 0);
    return expected ? present / expected : 0;
  }, [activeScores]);
  const thresholdCompleteness = useMemo(() => {
    const tracks = [...new Set(activeScores.map((row) => row.track))];
    const complete = tracks.filter((item) => {
      const line = dataset ? getThreshold(dataset, exam, item) : undefined;
      return typeof line?.topTotal === "number" && typeof line?.undergraduateTotal === "number";
    }).length;
    return tracks.length ? complete / tracks.length : 0;
  }, [activeScores, dataset, exam]);
  const dataQualityScore = activeScores.length ? Math.round(subjectCompleteness * 72 + thresholdCompleteness * 28) : 0;

  const capabilities = dataset?.profile?.capabilities ?? [];
  const itemResponseCount = dataset ? (dataset.itemResponses ?? []).length : 0;

  async function handleImport(file: File | null | undefined) {
    if (!file || importing) return;
    if (!/\.(xlsx|xls|xlsm)$/i.test(file.name)) {
      setNotice({ text: "请选择 .xlsx / .xls 格式的工作簿文件。", tone: "error" });
      return;
    }
    failedRef.current = false;
    setUseLocalData(true);
    setImporting(true);
    try {
      await local.importWorkbook(file);
    } catch {
      failedRef.current = true;
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDemo() {
    failedRef.current = false;
    setUseLocalData(true);
    local.loadDemo();
  }

  function handleClear() {
    failedRef.current = false;
    setUseLocalData(true);
    setConfirmClear(false);
    local.clearDataset();
  }

  const thresholdRows = (["物理类", "历史类"] as Track[]).map((item) => {
    const line = dataset ? getThreshold(dataset, exam, item) : undefined;
    return { track: item, topTotal: line?.topTotal ?? null, undergraduateTotal: line?.undergraduateTotal ?? null };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部条 */}
      <Stagger className="glass flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
        <StaggerItem>
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent/80">Data & Rules</p>
          <h2 className="mt-1 text-lg font-semibold tracking-wide text-ink">规则与班型</h2>
        </StaggerItem>
        <StaggerItem className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span className="rounded-full border border-line px-2.5 py-1">{dataset ? dataset.sourceName || "本地数据集" : "本地暂无数据"}</span>
          <span className={`rounded-full border px-2.5 py-1 ${warningCount ? "border-warn/50 text-warn" : "border-tier-under/50 text-tier-under"}`}>
            {warningCount ? `${warningCount} 项数据提醒` : "数据检查通过"}
          </span>
        </StaggerItem>
      </Stagger>

      {/* 数据操作结果行内提示条 */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key="settings-notice"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs ${
              notice.tone === "error" ? "border-danger/40 bg-danger/10 text-danger" : "border-tier-under/40 bg-tier-under/10 text-tier-under"
            }`}
          >
            <span className="flex items-center gap-2">
              {notice.tone === "error" ? <AlertTriangle size={14} className="shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />}
              {notice.text}
            </span>
            <button
              type="button"
              aria-label="关闭提示"
              className="opacity-70 transition-opacity duration-300 hover:opacity-100"
              onClick={() => { setNotice(null); local.dismissMessage(); }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Stagger className="grid items-start gap-4 lg:grid-cols-2">
        {/* 导入流程（核心） */}
        <StaggerItem className="lg:col-span-2">
          <Panel title="导入质量复盘工作簿" subtitle="拖拽或点击选择 · 本地解析 · IndexedDB 持久化">
            <div
              role="button"
              tabIndex={0}
              aria-label="选择或拖入工作簿文件"
              onClick={() => !importing && fileRef.current?.click()}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && !importing) {
                  event.preventDefault();
                  fileRef.current?.click();
                }
              }}
              onDragOver={(event) => { event.preventDefault(); if (!importing) setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                void handleImport(event.dataTransfer.files?.[0] ?? null);
              }}
              className={`relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors duration-300 ${
                dragActive || importing ? "border-accent/80 bg-accent/8" : "border-line-strong bg-white/[0.02] hover:border-accent/50"
              }`}
            >
              {(dragActive || importing) && !reduced && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(110deg, transparent 25%, rgba(34,211,238,0.14) 50%, transparent 75%)", backgroundSize: "220% 100%" }}
                  animate={{ backgroundPosition: ["-120% 0%", "120% 0%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              )}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(420px 150px at 50% 0%, rgba(34,211,238,0.16), transparent 70%)" }}
                animate={{ opacity: dragActive || importing ? [0.35, 0.8, 0.35] : 0 }}
                transition={{ duration: 1.8, repeat: dragActive || importing ? Infinity : 0, ease: "easeInOut" }}
              />
              <span className="glass relative flex h-12 w-12 items-center justify-center rounded-2xl">
                {importing ? <LoaderCircle size={22} className="animate-spin text-accent" /> : <Upload size={20} className="text-accent" />}
              </span>
              <p className="relative mt-1 text-sm font-medium text-ink">
                {importing ? "正在解析工作簿…" : dragActive ? "松开鼠标，开始导入" : "拖拽工作簿到此处，或点击选择文件"}
              </p>
              <p className="relative text-[11px] text-muted">支持 .xlsx / .xls / .xlsm，本地解析，数据不上传服务器</p>
              {importing && (
                <div className="relative mt-2 h-1 w-44 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-accent"
                    style={{ boxShadow: "0 0 12px rgba(34,211,238,0.5)" }}
                    animate={{ x: ["-110%", "330%"] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              hidden
              onChange={(event) => void handleImport(event.target.files?.[0] ?? null)}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <GlowButton tone="cyan" disabled={importing} onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> 选择工作簿
              </GlowButton>
              <GlowButton tone="violet" disabled={importing} onClick={handleDemo}>
                <Sparkles size={15} /> 载入演示数据
              </GlowButton>
              <Pressable disabled={importing} onClick={() => setConfirmClear((open) => !open)}>
                <span className="inline-flex items-center gap-2 rounded-xl border border-danger/50 bg-danger/10 px-4 py-2 text-sm font-medium text-danger transition-colors duration-300 hover:bg-danger/20">
                  <Trash2 size={15} /> 清除本地数据
                </span>
              </Pressable>
            </div>

            {/* 清除数据：Collapse 内联二次确认 */}
            <Collapse open={confirmClear}>
              <div className="mt-3 rounded-xl border border-danger/40 bg-danger/8 p-3.5">
                <p className="text-xs leading-relaxed text-ink">确认清除本地保存的全部数据？清除后本页立即回到空数据状态，重新导入工作簿即可恢复分析。</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Pressable onClick={handleClear}>
                    <span className="inline-flex items-center gap-2 rounded-xl border border-danger/50 bg-danger/15 px-4 py-2 text-sm font-medium text-danger transition-colors duration-300 hover:bg-danger/25">
                      <Trash2 size={15} /> 确认清除
                    </span>
                  </Pressable>
                  <GlowButton tone="ghost" onClick={() => setConfirmClear(false)}>取消</GlowButton>
                </div>
              </div>
            </Collapse>

            {/* 导入统计（成功后随数据源展示） */}
            {dataset && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <MiniStat label="成绩记录" value={dataset.scores.length.toLocaleString()} unit="条" tone="text-accent" />
                  <MiniStat label="考试" value={String(dataset.exams.length)} unit="次" />
                  <MiniStat label="分数线配置" value={String(dataset.thresholds.length)} unit="组" tone="text-accent2" />
                  <MiniStat label="小题作答" value={itemResponseCount.toLocaleString()} unit="条" />
                </div>
                <p className="mt-2.5 text-[11px] text-muted">
                  数据提醒 <b className={`kpi-num ${warningCount ? "text-warn" : "text-tier-under"}`}>{warningCount}</b> 项，明细见下方“导入质量检查”。
                </p>
              </div>
            )}
          </Panel>
        </StaggerItem>

        {dataset ? (
          <>
            {/* 数据源信息 */}
            <StaggerItem>
              <Panel title="数据源信息" subtitle="数据仅保存在本机浏览器中">
                <div className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.03] p-3.5">
                  <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink" title={dataset.sourceName}>{dataset.sourceName || "本地数据集"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">导入于 {cnDate(dataset.importedAt)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <MiniStat label="成绩记录" value={dataset.scores.length.toLocaleString()} unit="条" />
                  <MiniStat label="考试" value={String(dataset.exams.length)} unit="次" />
                  <MiniStat label="分数线配置" value={String(dataset.thresholds.length)} unit="组" tone="text-accent2" />
                  <MiniStat label="小题作答" value={itemResponseCount.toLocaleString()} unit="条" />
                </div>
              </Panel>
            </StaggerItem>

            {/* 数据健康度 */}
            <StaggerItem>
              <Panel
                title="当前数据健康度"
                subtitle="缺失数据按模块降级，不会拖垮整个系统"
                action={
                  <span
                    className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] ${
                      dataQualityScore >= 95
                        ? "border-tier-under/50 bg-tier-under/10 text-tier-under"
                        : dataQualityScore >= 80
                          ? "border-warn/50 bg-warn/10 text-warn"
                          : "border-danger/50 bg-danger/10 text-danger"
                    }`}
                  >
                    <ShieldCheck size={11} className="mr-1 inline" />
                    {dataQualityScore}分
                  </span>
                }
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted">学科字段完整度</span>
                      <b className="kpi-num text-ink">{percent(subjectCompleteness)}</b>
                    </div>
                    <MeterBar value={subjectCompleteness} color="var(--accent)" glow="rgba(34,211,238,0.4)" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted">一本/本科线完整度</span>
                      <b className="kpi-num text-ink">{percent(thresholdCompleteness)}</b>
                    </div>
                    <MeterBar value={thresholdCompleteness} color="var(--accent-2)" glow="rgba(167,139,250,0.4)" />
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted">当前有效成绩</span>
                    <b className="kpi-num text-ink">{activeScores.length.toLocaleString()}条</b>
                  </div>
                  <p className="-mt-2 text-[11px] text-faint">缺失单科显示“—”，不计入均分分母</p>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted">数据提醒</span>
                    <b className={`kpi-num ${warningCount ? "text-warn" : "text-ink"}`}>{warningCount}项</b>
                  </div>
                  <p className="-mt-2 text-[11px] text-faint">错误阻止覆盖旧数据，警告仅关闭受影响模块</p>
                </div>
              </Panel>
            </StaggerItem>

            {/* 当前考试分数线 */}
            <StaggerItem>
              <Panel title="当前考试分数线" subtitle={`${exam} · 分类别设置`}>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {thresholdRows.map((row) => (
                    <Hoverable key={row.track} className="glass rounded-2xl p-4">
                      <b className="text-[13px] font-semibold text-ink">{row.track}</b>
                      <div className="mt-2 flex flex-col text-xs">
                        <div className="flex items-center justify-between border-t border-line py-2">
                          <span className="text-muted">特控/一本线</span>
                          <strong className="kpi-num text-tier-top">{row.topTotal ?? "未设置"}</strong>
                        </div>
                        <div className="flex items-center justify-between border-t border-line py-2">
                          <span className="text-muted">本科线</span>
                          <strong className="kpi-num text-tier-under">{row.undergraduateTotal ?? "未设置"}</strong>
                        </div>
                      </div>
                    </Hoverable>
                  ))}
                </div>
              </Panel>
            </StaggerItem>

            {/* 模块可用性矩阵 */}
            <StaggerItem>
              <Panel title="模块可用性矩阵" subtitle="字段缺失时关闭受影响指标，其他模块继续可用">
                {capabilities.length ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {capabilities.map((capability) => (
                      <Hoverable key={capability.id} className="glass rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-[13px] font-semibold text-ink">{capability.label}</b>
                          <span
                            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] ${
                              capability.available ? "border-tier-under/50 bg-tier-under/10 text-tier-under" : "border-warn/50 bg-warn/10 text-warn"
                            }`}
                          >
                            {capability.available ? "可用" : "降级"}
                          </span>
                        </div>
                        <MeterBar value={capability.confidence} color={capability.available ? "var(--tier-under)" : "var(--warn)"} glow={capability.available ? "rgba(52,211,153,0.4)" : "rgba(251,146,60,0.4)"} />
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                          <span>识别置信度</span>
                          <span className="kpi-num">{percent(capability.confidence)}</span>
                        </div>
                        <small className="mt-1.5 block text-[11px] leading-relaxed text-faint">{capability.reason}</small>
                      </Hoverable>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Database size={26} />} title="暂无模块可用性档案" hint="导入工作簿后自动生成字段识别与模块可用性评估。" />
                )}
              </Panel>
            </StaggerItem>
          </>
        ) : (
          <StaggerItem className="lg:col-span-2">
            <Panel title="当前数据" subtitle="清除后可重新导入或载入演示数据">
              <EmptyState icon={<Database size={28} />} title="本地暂无数据" hint="导入质量复盘工作簿或载入演示数据后，这里会显示数据源、质检与能力面板。" />
            </Panel>
          </StaggerItem>
        )}

        {/* 班型与选科规则（内置专用配置，静态展示） */}
        <StaggerItem className="lg:col-span-2">
          <Panel title="班型与选科规则" subtitle="已按本届1—16班情况预置 · 班型口径为内置专用配置">
            <Reveal>
              <DataTable headers={["班级", "类别", "选科组合", "班型", "外语口径", "源表自动转换", "比较建议"]} maxHeight="520px">
                {Object.values(CLASS_PROFILES).map((item) => (
                  <tr key={item.classNo}>
                    <td>{item.classNo}班</td>
                    <td>{item.track}</td>
                    <td>{item.combination}</td>
                    <td>{item.type}</td>
                    <td>{item.classNo === 7 ? "日语" : "英语"}</td>
                    <td>{item.classNo === 7 ? "英语列 → 日语" : item.classNo === 9 ? "生物列 → 地理" : "按原列"}</td>
                    <td>{[1, 2, 10].includes(item.classNo) ? "班型内+全年级双口径" : [15, 16].includes(item.classNo) ? "专项口径" : "同类别平行班"}</td>
                  </tr>
                ))}
              </DataTable>
            </Reveal>
          </Panel>
        </StaggerItem>

        {/* 字段识别映射（存在识别档案时展示） */}
        {dataset?.profile && (
          <StaggerItem className="lg:col-span-2">
            <Panel title="字段识别映射" subtitle="识别策略会随表格列插入、改名和空列自动重算">
              {dataset.profile.fieldMatches.length ? (
                <Reveal>
                  <DataTable headers={["字段", "源表表头", "列号", "策略", "置信度"]} maxHeight="420px">
                    {dataset.profile.fieldMatches.map((match) => (
                      <tr key={`${match.field}-${match.column}`}>
                        <td>{match.field}</td>
                        <td>{match.header || "未识别"}</td>
                        <td className="num">{match.column === null ? "—" : match.column + 1}</td>
                        <td>{match.strategy}</td>
                        <td className="num">{percent(match.confidence)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </Reveal>
              ) : (
                <EmptyState title="暂无字段识别记录" hint="导入工作簿后自动生成。" />
              )}
            </Panel>
          </StaggerItem>
        )}

        {/* 导入质量检查 */}
        {dataset && (
          <StaggerItem className="lg:col-span-2">
          <Panel title="导入质量检查" subtitle="问题按严重程度列出，其他可用模块继续工作">
            {issues.length ? (
              <div className="flex flex-col gap-2.5">
                {issues.map((issue, index) => {
                  const IssueIcon = ISSUE_STYLE[issue.level].icon;
                  return (
                    <Reveal key={index} delay={Math.min(index * 0.04, 0.32)}>
                      <div className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${ISSUE_STYLE[issue.level].wrap}`}>
                        <span className={`mt-0.5 shrink-0 ${ISSUE_STYLE[issue.level].iconCls}`}>
                          <IssueIcon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] leading-relaxed text-ink">{issue.message}</p>
                            {issue.module && (
                              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">{issue.module}</span>
                            )}
                            {typeof issue.affectedCount === "number" && (
                              <span className="kpi-num rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">影响 {issue.affectedCount} 条</span>
                            )}
                          </div>
                          {issue.suggestion && <p className="mt-1 text-[11px] leading-relaxed text-muted">建议：{issue.suggestion}</p>}
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-9 text-center">
                <CheckCircle2 size={26} className="text-tier-under" />
                <p className="text-sm text-muted">数据检查通过</p>
                <p className="text-xs text-faint">未发现明显数据问题，各模块按可用字段正常工作。</p>
              </div>
            )}
          </Panel>
          </StaggerItem>
        )}
      </Stagger>
    </div>
  );
}
