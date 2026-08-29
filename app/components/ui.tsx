"use client";

// 共享 UI 原语：所有视图从这里取面板/表格/筛选控件，保证设计语言统一。
// 简约高级风：白底、发丝描边、墨色主按钮、克制的语义色。
import type { ReactNode } from "react";
import { CountUp, Reveal } from "./motion";

/** 面板：白底卡片 + 发丝描边 */
export function Panel({ title, subtitle, action, children, className = "", span = false }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; span?: boolean }) {
  return (
    <section className={`glass p-5 md:p-6 ${span ? "xl:col-span-2" : ""} ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** KPI 数字卡 */
export function StatBlock({ label, value, digits = 0, suffix = "", note, tone = "plain", icon }: { label: string; value: number; digits?: number; suffix?: string; note?: string; tone?: "cyan" | "violet" | "amber" | "green" | "plain"; icon?: ReactNode }) {
  const toneColor = { cyan: "text-accent", violet: "text-ink", amber: "text-tier-top", green: "text-tier-under", plain: "text-ink" }[tone];
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{label}</p>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <p className={`kpi-num mt-2 text-[clamp(26px,3vw,34px)] font-semibold leading-none ${toneColor}`}>
        <CountUp value={value} digits={digits} suffix={suffix} />
      </p>
      {note && <p className="mt-2 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

/** 数据表：粘性表头 + 行悬停 */
export function DataTable({ headers, children, maxHeight = "480px", empty }: { headers: ReactNode[]; children: ReactNode; maxHeight?: string; empty?: boolean }) {
  if (empty) return <EmptyState title="当前筛选范围没有数据" hint="调整顶部的考试、类别或班级筛选后再试。" />;
  return (
    <div className="overflow-auto rounded-xl border border-line" style={{ maxHeight }}>
      <table className="data-table">
        <thead>
          <tr>{headers.map((head, index) => <th key={index}>{head}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** 筛选胶囊（单选）：选中为墨色底白字 */
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors duration-200 ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:border-line-strong hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

/** 玻璃下拉 */
export function Select({ label, value, onChange, options }: { label?: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      {label && <span className="whitespace-nowrap">{label}</span>}
      <select className="glass-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

/** 分段选择器：灰色轨道 + 白色滑块 */
export function Segmented({ options, value, onChange }: { options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-xl border border-line bg-bg0 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3.5 py-1.5 text-xs transition-colors duration-200 ${active ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(28,27,24,0.08)]" : "text-muted hover:text-ink"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 分层进度条（语义色） */
export function SegmentBar({ label, count, rate, intent, color }: { label: string; count: number; rate: number; intent?: string; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <b className="font-medium text-ink">{label}</b>
        <span className="text-muted">{count}人 · {(rate * 100).toFixed(1)}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efede8]">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, rate * 100)}%`, background: color }} />
      </div>
      {intent && <small className="mt-1 block text-[11px] text-muted">{intent}</small>}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <Reveal className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <p className="text-sm text-muted">{title}</p>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </Reveal>
  );
}

/** 语义徽章：一本/本科（克制的描边色） */
export function TierBadge({ tier }: { tier: "top" | "under" | "below" | "close" }) {
  const map = {
    top: { label: "一本/特控线上", cls: "border-tier-top/40 text-tier-top bg-tier-top/8" },
    under: { label: "本科线上", cls: "border-tier-under/40 text-tier-under bg-tier-under/8" },
    close: { label: "临界", cls: "border-warn/40 text-warn bg-warn/8" },
    below: { label: "线下", cls: "border-line text-muted bg-white" },
  }[tier];
  return <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] ${map.cls}`}>{map.label}</span>;
}

/** 按钮：primary=墨色实底；outline=白底描边；ghost=素色 */
export function GlowButton({ children, onClick, tone = "cyan", disabled, type = "button" }: { children: ReactNode; onClick?: () => void; tone?: "cyan" | "violet" | "ghost"; disabled?: boolean; type?: "button" | "submit" }) {
  const cls = {
    cyan: "border-ink bg-ink text-white hover:bg-[#33322d]",
    violet: "border-line bg-white text-ink hover:border-line-strong",
    ghost: "border-transparent text-muted hover:text-ink",
  }[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}
