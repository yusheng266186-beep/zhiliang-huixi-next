// 报告中心：四类质量报告的深色"数字简报"预览 + Word / PDF / Excel 三通道导出。
// 功能与旧版一致：同一 buildQualityReport 模型、同一导出函数、同一文案；
// PDF 采用按需挂载的浅色导出宿主（挂载 → 双 rAF → html2canvas → 卸载）。
import { memo, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Printer, X } from "lucide-react";
import { CountUp, EASE_OUT_EXPO, PageTransition, Reveal, Stagger, StaggerItem } from "../components/motion";
import { Chip, GlowButton, Panel, Segmented } from "../components/ui";
import { subjectSummaries } from "../lib/analytics";
import type { ExecutiveInsight, ScoreSegment } from "../lib/analytics";
import { exportAnalysisExcel, exportElementPdf, exportReportWord } from "../lib/exporters";
import type { ViewContext } from "../lib/hooks";
import { buildQualityReport, type QualityReportModel, type ReportType } from "../lib/report-model";
import type { SubjectName } from "../lib/types";

const REPORT_TYPES: ReportType[] = ["年级质量分析", "班级成绩分析", "学科质量分析", "上线与临界生"];

const format1 = (value: number) => value.toFixed(1);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** 屏显分层色（主题令牌）；导出宿主的浅色固定值见底部 PRINT_CSS */
const SEGMENT_COLORS: Record<ScoreSegment["id"], string> = {
  high: "var(--accent-2)",
  top: "var(--tier-top)",
  "top-critical": "var(--warn)",
  undergraduate: "var(--tier-under)",
  "undergraduate-critical": "var(--tier-under)",
  foundation: "var(--muted)",
  unclassified: "var(--line-strong)",
};

const INSIGHT_TONE: Record<ExecutiveInsight["tone"], string> = {
  good: "var(--tier-under)",
  warn: "var(--tier-top)",
  attention: "var(--danger)",
  neutral: "var(--accent)",
};

const INSIGHT_PRINT_TONE: Record<ExecutiveInsight["tone"], string> = {
  good: "rl-tone-good",
  warn: "rl-tone-warn",
  attention: "rl-tone-attention",
  neutral: "rl-tone-neutral",
};

/** 报告数字：屏显时 CountUp 滚动，导出宿主（print）输出静态值保证截图为最终值 */
function ReportNum({ value, digits = 0, suffix = "", light }: { value: number; digits?: number; suffix?: string; light: boolean }) {
  if (light) return <span>{value.toFixed(digits)}{suffix}</span>;
  return <CountUp value={value} digits={digits} suffix={suffix} />;
}

function SectionHead({ index, title, light }: { index: string; title: string; light: boolean }) {
  return (
    <div className={light ? "mb-3.5 flex items-center gap-2.5" : "mb-4 flex items-center gap-3 border-b border-[rgba(148,163,184,0.12)] pb-3"}>
      <span className={light ? "rl-num" : "grad-text kpi-num text-2xl font-bold leading-none"}>{index}</span>
      <h3 className={`${light ? "rl-strong" : "text-ink"} text-[15px] font-semibold tracking-wide`}>{title}</h3>
    </div>
  );
}

function KpiCell({ light, label, tone, note, children }: {
  light: boolean;
  label: string;
  tone?: "accent" | "ink" | "top" | "under";
  note?: string;
  children: ReactNode;
}) {
  const valueTone = light
    ? tone === "top" ? "rl-top" : tone === "under" ? "rl-under" : "rl-strong"
    : tone === "top" ? "text-tier-top" : tone === "under" ? "text-tier-under" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <div className={light ? "rl-card rl-kpi rounded-xl p-3.5" : "glass p-4"}>
      <span className={`${light ? "rl-dim" : "text-muted"} text-[11px] tracking-wider`}>{label}</span>
      <p className={`kpi-num mt-1.5 text-[clamp(20px,2.4vw,30px)] font-semibold leading-none ${light ? "rl-kpi-value" : ""} ${valueTone}`}>
        {children}
      </p>
      {note && <small className={`${light ? "rl-kpi-unit" : "text-muted"} mt-1 block text-[11px]`}>{note}</small>}
    </div>
  );
}

/**
 * 报告纸：屏显（深色数字简报）与导出宿主（浅色纸感 .report-light）共用同一结构，
 * 信息结构与旧版 ReportBody 完全一致：品牌行 / 标题 / meta / 焦点声明 / KPI / 六段内容 / 页脚。
 */
const ReportDocument = memo(function ReportDocument({ model, theme, id }: { model: QualityReportModel; theme: "screen" | "print"; id?: string }) {
  const light = theme === "print";
  const { summary, classes, subjects, segments, insights, critical } = model;
  const em = light ? undefined : "kpi-num font-semibold text-ink";
  const bestSubject = [...subjects].sort((a, b) => b.undergraduateEffectiveRate - a.undergraduateEffectiveRate)[0];
  const worstSubject = [...subjects].sort((a, b) => a.undergraduateEffectiveRate - b.undergraduateEffectiveRate)[0];

  const sectionCls = light ? "rl-section" : "glass p-5 md:p-6";
  const tableWrapCls = light ? "mt-3.5" : "mt-3.5 overflow-x-auto rounded-xl border border-line";
  const tableCls = light ? "rl-table" : "data-table";
  const cardCls = light ? "rl-card" : "border-line bg-white/[0.03]";
  const cardBase = light ? `${cardCls} rounded-xl` : `rounded-xl border ${cardCls}`;

  return (
    <div id={id} className={light ? "report-light" : "flex flex-col gap-4"}>
      {/* 报告头：品牌行 / 标题 / meta / 焦点声明 / KPI */}
      <header className={light ? "" : "glass p-5 md:p-6"}>
        <p className={light ? "rl-brand" : "text-[11px] font-semibold uppercase tracking-[0.28em] text-accent"}>荣县一中 · 高2024级</p>
        <h1 className={light ? "rl-title" : "mt-2 text-[clamp(20px,2.6vw,28px)] font-semibold leading-snug text-ink"}>
          {model.exam}考试 · {model.reportType}报告
        </h1>
        <p className={`${light ? "rl-meta" : "text-muted"} mt-1.5 text-xs`}>
          范围：{model.scope}　生成方式：系统即时生成　综合识别置信度{percent(model.quality.confidence)}
        </p>
        <div className={`${light ? "rl-focus" : "border-accent/25 bg-accent/8"} mt-4 rounded-xl border p-3.5`}>
          <b className={`${light ? "rl-accent" : "text-accent"} text-[11px] font-semibold tracking-wider`}>本报告回答什么</b>
          <span className={`${light ? "rl-body" : "text-ink/90"} mt-1 block text-[13px] leading-relaxed`}>{model.focusStatement}</span>
        </div>
        <div className={`mt-4 grid grid-cols-2 ${light ? "gap-2.5" : "gap-3 lg:grid-cols-4"}`}>
          <KpiCell light={light} label="参考人数" tone="accent">
            <ReportNum value={summary.count} light={light} />
          </KpiCell>
          <KpiCell light={light} label="平均分 / 中位数">
            <ReportNum value={summary.average} digits={1} light={light} />
            <span className={`${light ? "rl-kpi-unit" : "text-muted"} text-[0.5em] font-normal`}> / </span>
            <ReportNum value={summary.median} digits={1} light={light} />
          </KpiCell>
          <KpiCell light={light} label="特控/一本上线" tone="top" note={percent(summary.topRate)}>
            <ReportNum value={summary.topCount} light={light} />
            <span className="text-[0.5em] font-normal"> 人</span>
          </KpiCell>
          <KpiCell light={light} label="本科上线" tone="under" note={percent(summary.undergraduateRate)}>
            <ReportNum value={summary.undergraduateCount} light={light} />
            <span className="text-[0.5em] font-normal"> 人</span>
          </KpiCell>
        </div>
      </header>

      {/* 01 总体情况 */}
      <section className={sectionCls}>
        <SectionHead index="01" title="总体情况" light={light} />
        <p className={`${light ? "rl-body" : "text-muted"} text-[13px] leading-[1.9]`}>
          本次纳入分析学生<b className={em}>{summary.count}</b>人，成绩中位数<b className={em}>{format1(summary.median)}</b>分，
          四分位区间<b className={em}>{format1(model.stats.p25)}</b>—<b className={em}>{format1(model.stats.p75)}</b>分。
          一本线下20分以内临界学生<b className={em}>{summary.topCriticalCount}</b>人，
          本科线下20分以内临界学生<b className={em}>{summary.undergraduateCriticalCount}</b>人。
        </p>
        <div className={`mt-4 grid grid-cols-2 ${light ? "gap-2" : "gap-2.5 md:grid-cols-3"}`}>
          {segments.map((segment) => (
            <div key={segment.id} className={`${cardBase} p-3`}>
              <div className="flex items-center gap-2">
                <i
                  className={light ? `rl-seg-dot seg-${segment.id}` : "h-2 w-2 shrink-0 rounded-full"}
                  style={light ? undefined : { background: SEGMENT_COLORS[segment.id] }}
                />
                <b className={`${light ? "rl-strong" : "text-ink"} text-xs font-semibold`}>{segment.label}</b>
                <strong className={`${light ? "rl-strong" : "text-ink"} kpi-num ml-auto text-sm font-semibold`}>{segment.count}人</strong>
              </div>
              <span className={`${light ? "rl-dim" : "text-muted"} mt-1.5 block text-[11px] leading-relaxed`}>
                {percent(segment.rate)} · {segment.intent}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 02 证据链洞察 */}
      <section className={sectionCls}>
        <SectionHead index="02" title="证据链洞察" light={light} />
        <div className={`mt-3 grid gap-2.5 md:grid-cols-2`}>
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`${cardBase} p-3.5 ${light ? `rl-insight ${INSIGHT_PRINT_TONE[insight.tone]}` : ""}`}
              style={light ? undefined : { borderLeft: `3px solid ${INSIGHT_TONE[insight.tone]}` }}
            >
              <b className={`${light ? "rl-strong" : "text-ink"} text-[13px] font-semibold`}>{insight.title}</b>
              <span className={`${light ? "rl-body" : "text-muted"} mt-1 block text-xs leading-relaxed`}>{insight.finding}</span>
              <small className={`${light ? "rl-faint" : "text-faint"} mt-1 block text-[11px] leading-relaxed`}>{insight.action}</small>
            </div>
          ))}
        </div>
      </section>

      {/* 03 班级表现 */}
      <section className={sectionCls}>
        <SectionHead index="03" title="班级表现" light={light} />
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr><th>班级</th><th>班型</th><th>人数</th><th>平均分</th><th>一本上线</th><th>本科上线</th></tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.classNo}>
                  <td>{item.classNo}班</td>
                  <td>{item.type}</td>
                  <td className={light ? undefined : "num"}>{item.count}</td>
                  <td>
                    {format1(item.average)}{" "}
                    <small className={item.averageDelta >= 0 ? (light ? "rl-pos" : "text-tier-under") : light ? "rl-neg" : "text-danger"}>
                      {item.averageDelta >= 0 ? "+" : ""}{format1(item.averageDelta)}
                    </small>
                  </td>
                  <td>{item.topCount} / {percent(item.topRate)}</td>
                  <td>{item.undergraduateCount} / {percent(item.undergraduateRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 04 学科诊断 */}
      <section className={sectionCls}>
        <SectionHead index="04" title="学科诊断" light={light} />
        <p className={`${light ? "rl-body" : "text-muted"} text-[13px] leading-[1.9]`}>
          {subjects.length
            ? <>当前可比学科中，<b className={em}>{bestSubject!.subject}</b>本科有效率最高，<b className={em}>{worstSubject!.subject}</b>最低。</>
            : "暂无有效学科分数据"}
        </p>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr><th>学科</th><th>参考人数</th><th>平均分</th><th>一本有效人数/率</th><th>本科有效人数/率</th></tr>
            </thead>
            <tbody>
              {subjects.map((item) => (
                <tr key={item.subject}>
                  <td>{item.subject}</td>
                  <td>{item.count}</td>
                  <td>{format1(item.average)}</td>
                  <td>{item.topEffectiveCount} / {percent(item.topEffectiveRate)}</td>
                  <td>{item.undergraduateEffectiveCount} / {percent(item.undergraduateEffectiveRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 05 临界生关注 */}
      <section className={sectionCls}>
        <SectionHead index="05" title="临界生关注" light={light} />
        <p className={`${light ? "rl-body" : "text-muted"} text-[13px] leading-[1.9]`}>
          建议班主任与任课教师重点关注以下靠线学生，优先补强其差距最大的学科。
        </p>
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr><th>临界类型</th><th>班级</th><th>姓名</th><th>总分</th><th>一本差</th><th>本科差</th><th>优先补强</th></tr>
            </thead>
            <tbody>
              {critical.slice(0, 20).map((item, index) => (
                <tr key={`${item.classNo}-${item.name}-${index}`}>
                  <td>{item.criticalTiers.join("、")}</td>
                  <td>{item.classNo}班</td>
                  <td>{item.name}</td>
                  <td>{format1(item.total)}</td>
                  <td>{item.topDiff === null ? "—" : format1(item.topDiff)}</td>
                  <td>{item.undergraduateDiff === null ? "—" : format1(item.undergraduateDiff)}</td>
                  <td>{item.weakSubjects.slice(0, 2).map((weak) => weak.subject).join("、") || "待分析"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 06 数据质量与方法 */}
      <section className={sectionCls}>
        <SectionHead index="06" title="数据质量与方法" light={light} />
        <div className={`mt-3 grid grid-cols-2 ${light ? "gap-2" : "gap-2.5 md:grid-cols-4"}`}>
          {[
            { label: "学科完整度", value: percent(model.quality.subjectCompleteness) },
            { label: "分数线完整度", value: percent(model.quality.thresholdCompleteness) },
            { label: "小题覆盖度", value: percent(model.quality.itemCoverage) },
            { label: "重建总分", value: String(model.quality.reconstructedTotals) },
          ].map((chip) => (
            <div key={chip.label} className={`${cardBase} p-3`}>
              <span className={`${light ? "rl-dim" : "text-muted"} text-[11px]`}>{chip.label}</span>
              <b className={`${light ? "rl-strong" : "text-ink"} kpi-num mt-1 block text-[15px] font-semibold`}>{chip.value}</b>
            </div>
          ))}
        </div>
        <p className={`${light ? "rl-faint" : "text-faint"} mt-3 text-[11px] leading-[1.8]`}>
          {model.methodology.slice(0, 3).join(" ")}
        </p>
        <div className={`${light ? "rl-footer" : "border-[rgba(148,163,184,0.12)] text-faint"} mt-4 border-t pt-3 text-[11px]`}>
          数据来源：{model.sourceName} · 系统依据导入成绩重新计算
        </div>
      </section>
    </div>
  );
});

/** 导出宿主：视口外的浅色纸面（html2canvas 截图用），报告正文以固定浅色渲染保证可打印 */
const PRINT_CSS = `
.export-report-host {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 1100px;
  background: #ffffff;
  color: #173042;
  padding: 32px;
  z-index: -1;
  pointer-events: none;
}
.report-light {
  background: #ffffff;
  color: #173042;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", sans-serif;
  font-feature-settings: "tnum";
  font-size: 13px;
  line-height: 1.8;
}
.report-light .rl-brand { font-size: 11px; font-weight: 600; letter-spacing: 0.28em; color: #0e7490; text-transform: uppercase; }
.report-light .rl-title { margin: 8px 0 4px; font-size: 26px; font-weight: 700; line-height: 1.35; color: #12283a; }
.report-light .rl-meta { color: #5b6b7c; }
.report-light .rl-dim { color: #5b6b7c; }
.report-light .rl-faint { color: #7a8a9a; }
.report-light .rl-strong { color: #12283a; }
.report-light .rl-accent { color: #0e7490; }
.report-light .rl-top { color: #b45309; }
.report-light .rl-under { color: #047857; }
.report-light .rl-pos { color: #047857; }
.report-light .rl-neg { color: #b91c1c; }
.report-light .rl-card { border: 1px solid #e2eaf1; background: #ffffff; }
.report-light .rl-kpi { border-color: #dfe7ef; background: #fbfdfe; }
.report-light .rl-kpi-value { font-size: 24px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.report-light .rl-kpi-unit { color: #5b6b7c; }
.report-light .rl-focus { border-color: #d8e2ec; border-left: 3px solid #0e7490; background: #f3f8fb; }
.report-light .rl-section { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e3eaf1; }
.report-light .rl-num { color: #0e7490; font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.report-light .rl-body { color: #3d5165; }
.report-light .rl-body b { color: #12283a; font-variant-numeric: tabular-nums; }
.report-light .rl-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.report-light .rl-table th { text-align: left; padding: 7px 10px; background: #eef4f9; color: #33506b; font-weight: 600; border: 1px solid #dfe7ef; white-space: nowrap; }
.report-light .rl-table td { padding: 7px 10px; border: 1px solid #e6edf4; color: #2c4257; white-space: nowrap; font-variant-numeric: tabular-nums; }
.report-light .rl-insight { border-left-width: 3px; }
.report-light .rl-tone-good { border-left-color: #059669; }
.report-light .rl-tone-warn { border-left-color: #d97706; }
.report-light .rl-tone-attention { border-left-color: #dc2626; }
.report-light .rl-tone-neutral { border-left-color: #0e7490; }
.report-light .rl-seg-dot { width: 9px; height: 9px; border-radius: 9999px; flex: none; }
.report-light .seg-high { background: #7c3aed; }
.report-light .seg-top { background: #d97706; }
.report-light .seg-top-critical { background: #ea580c; }
.report-light .seg-undergraduate { background: #059669; }
.report-light .seg-undergraduate-critical { background: #10b981; }
.report-light .seg-foundation { background: #94a3b8; }
.report-light .seg-unclassified { background: #cbd5e1; }
.report-light .rl-footer { border-top: 1px solid #e3eaf1; color: #7a8a9a; }
`;

type Notice = { text: string; tone: "success" | "error" };

export default function ReportsView({ ctx }: { ctx: ViewContext }) {
  const { dataset, exam, track, classNo } = ctx;
  const [reportType, setReportType] = useState<ReportType>("年级质量分析");
  const [subject, setSubject] = useState<SubjectName>("语文");
  const [exporting, setExporting] = useState<"word" | "pdf" | "excel" | null>(null);
  const [pdfHostMounted, setPdfHostMounted] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const subjects = useMemo(() => subjectSummaries(dataset, exam, track, classNo), [dataset, exam, track, classNo]);
  // 与旧版一致：默认语文；当前范围没有该学科时退回第一个可识别学科。
  const activeSubject = subjects.some((item) => item.subject === subject) ? subject : subjects[0]?.subject ?? subject;
  const report = useMemo(
    () => buildQualityReport(dataset, { exam, track, classNo, reportType, subject: activeSubject }),
    [dataset, exam, track, classNo, reportType, activeSubject],
  );

  async function handleExportWord() {
    setExporting("word");
    try {
      await exportReportWord(report);
      setNotice({ text: "详细Word报告已生成并开始下载。", tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? `Word导出失败：${error.message}` : "Word导出失败，请重试。", tone: "error" });
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    setExporting("pdf");
    try {
      setPdfHostMounted(true);
      // 等待按需挂载的导出宿主完成一次真实渲染后再截图
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await document.fonts?.ready;
      await exportElementPdf(document.getElementById("export-report-content"), `质量慧析-${exam}-${reportType}.pdf`);
      setNotice({ text: "分页PDF报告已生成并开始下载。", tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? `PDF导出失败：${error.message}` : "PDF导出失败，请重试。", tone: "error" });
    } finally {
      setPdfHostMounted(false);
      setExporting(null);
    }
  }

  async function handleExportExcel() {
    setExporting("excel");
    try {
      await exportAnalysisExcel(report);
      setNotice({ text: "多工作表Excel分析包已生成并开始下载。", tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? `Excel导出失败：${error.message}` : "Excel导出失败，请重试。", tone: "error" });
    } finally {
      setExporting(null);
    }
  }

  const exportButtons: Array<{ key: "word" | "pdf" | "excel"; label: string; busyLabel: string; icon: ReactNode; tone: "cyan" | "violet" | "ghost"; onClick: () => Promise<void> }> = [
    { key: "word", label: "导出Word（详细）", busyLabel: "正在生成", icon: <Download size={15} />, tone: "cyan", onClick: handleExportWord },
    { key: "pdf", label: "导出PDF（分页）", busyLabel: "正在生成", icon: <Printer size={15} />, tone: "violet", onClick: handleExportPdf },
    { key: "excel", label: "导出分析Excel", busyLabel: "正在生成", icon: <FileSpreadsheet size={15} />, tone: "ghost", onClick: handleExportExcel },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部：报告类型选择（全局筛选条件自动带入） */}
      <StaggerTop reportType={reportType} onReportType={setReportType} exam={exam} scope={report.scope} />

      {/* 导出结果行内提示条 */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key="report-notice"
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
            <button type="button" aria-label="关闭提示" className="opacity-70 transition-opacity duration-300 hover:opacity-100" onClick={() => setNotice(null)}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左列：导出通道 + 知识点口径 */}
        <Reveal className="flex flex-col gap-4">
          <Panel title="报告导出" subtitle="三种格式共用同一份分析模型">
            <div className="grid gap-2.5">
              {exportButtons.map((button) => (
                <GlowButton key={button.key} tone={button.tone} disabled={exporting !== null} onClick={() => void button.onClick()}>
                  {exporting === button.key ? <LoaderCircle size={15} className="animate-spin" /> : button.icon}
                  {exporting === button.key ? button.busyLabel : button.label}
                </GlowButton>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-line px-3 py-1 text-[11px] text-muted">9段报告结构</span>
              <span className="rounded-full border border-line px-3 py-1 text-[11px] text-muted">7张Excel工作表</span>
              <span className="rounded-full border border-line px-3 py-1 text-[11px] text-muted">学生、班级、学科、小题、质检全覆盖</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              Word适合正式复盘，PDF适合打印留档，Excel适合二次筛选与分发；三者共用同一份分析模型。
            </p>
          </Panel>
          <Panel title="知识点口径" subtitle="Word 与 Excel 的知识点表使用该学科口径">
            {subjects.length ? (
              <div className="flex flex-wrap gap-2">
                {subjects.map((item) => (
                  <Chip key={item.subject} active={activeSubject === item.subject} onClick={() => setSubject(item.subject)}>
                    {item.subject}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">暂无有效学科分数据</p>
            )}
          </Panel>
        </Reveal>

        {/* 右列：报告预览（类型切换时交叉过渡） */}
        <Panel title="报告预览" subtitle={report.title}>
          <PageTransition viewKey={reportType}>
            <ReportDocument model={report} theme="screen" />
          </PageTransition>
        </Panel>
      </div>

      {/* PDF 按需挂载宿主：挂载 → 双 rAF → html2canvas → 卸载 */}
      {pdfHostMounted && (
        <div className="export-report-host" aria-hidden="true">
          <ReportDocument model={report} theme="print" id="export-report-content" />
        </div>
      )}
      <style>{PRINT_CSS}</style>
    </div>
  );
}

/** 顶部模板条（Stagger 错拍进场） */
function StaggerTop({ reportType, onReportType, exam, scope }: { reportType: ReportType; onReportType: (value: ReportType) => void; exam: string; scope: string }) {
  return (
    <Stagger className="glass flex flex-col gap-3 p-4 md:p-5">
      <StaggerItem className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent/80">Report Center</p>
          <h2 className="mt-1 text-lg font-semibold tracking-wide text-ink">报告中心</h2>
        </div>
        <div className="max-w-full overflow-x-auto pb-1">
          <Segmented
            options={REPORT_TYPES.map((type) => ({ value: type, label: type }))}
            value={reportType}
            onChange={(value) => onReportType(value as ReportType)}
          />
        </div>
      </StaggerItem>
      <StaggerItem className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="rounded-full border border-line px-2.5 py-1">{exam}考试</span>
        <span className="rounded-full border border-line px-2.5 py-1">{scope}</span>
        <span className="text-faint">当前筛选条件将自动带入报告</span>
      </StaggerItem>
    </Stagger>
  );
}
