"use client";

// 共享 UI 原语：所有视图从这里取面板/表格/筛选控件，保证设计语言统一。
import type { ReactNode } from "react";
import { CountUp, Reveal } from "./motion";

/** 玻璃面板：标题 + 副标题 + 右上角动作位 */
export function Panel({ title, subtitle, action, children, className = "", span = false }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; span?: boolean }) {
  return (
    <section className={`glass glow-hover p-5 md:p-6 ${span ? "xl:col-span-2" : ""} ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-semibold tracking-wide text-ink">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** KPI 大数字卡 */
export function StatBlock({ label, value, digits = 0, suffix = "", note, tone = "cyan", icon }: { label: string; value: number; digits?: number; suffix?: string; note?: string; tone?: "cyan" | "violet" | "amber" | "green" | "plain"; icon?: ReactNode }) {
  const toneColor = { cyan: "text-accent", violet: "text-accent2", amber: "text-tier-top", green: "text-tier-under", plain: "text-ink" }[tone];
  const glow = { cyan: "rgba(34,211,238,.5)", violet: "rgba(167,139,250,.5)", amber: "rgba(251,191,36,.5)", green: "rgba(52,211,153,.5)", plain: "rgba(226,232,240,.4)" }[tone];
  return (
    <div className="glass glow-hover relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: glow }} />
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wider text-muted">{label}</p>
        {icon && <span className="text-muted opacity-70">{icon}</span>}
      </div>
      <p className={`kpi-num mt-2 text-[clamp(26px,3.2vw,40px)] font-semibold leading-none ${toneColor}`}>
        <CountUp value={value} digits={digits} suffix={suffix} />
      </p>
      {note && <p className="mt-2 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

/** 数据表：粘性表头 + 行悬停，列由调用方渲染 */
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

/** 筛选胶囊（单选） */
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs transition-all duration-300 ${active ? "border-accent/60 bg-accent/12 text-accent shadow-[0_0_14px_rgba(34,211,238,0.18)]" : "border-line text-muted hover:border-line-strong hover:text-ink"}`}
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

/** 分段选择器 */
export function Segmented({ options, value, onChange }: { options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="glass inline-flex gap-1 rounded-full p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative rounded-full px-4 py-1.5 text-xs transition-colors duration-300 ${active ? "text-bg0" : "text-muted hover:text-ink"}`}
          >
            {active && <span className="absolute inset-0 rounded-full bg-accent shadow-[0_0_16px_rgba(34,211,238,0.4)]" />}
            <span className="relative z-10 font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 分层进度条（一本/本科语义色） */
export function SegmentBar({ label, count, rate, intent, color }: { label: string; count: number; rate: number; intent?: string; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <b className="text-ink">{label}</b>
        <span className="text-muted">{count}人 · {(rate * 100).toFixed(1)}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, rate * 100)}%`, background: color, boxShadow: `0 0 10px ${color}55` }} />
      </div>
      {intent && <small className="mt-1 block text-[11px] text-muted">{intent}</small>}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <Reveal className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && <div className="text-muted opacity-60">{icon}</div>}
      <p className="text-sm text-muted">{title}</p>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </Reveal>
  );
}

/** 语义徽章：一本/本科 */
export function TierBadge({ tier }: { tier: "top" | "under" | "below" | "close" }) {
  const map = {
    top: { label: "一本/特控线上", cls: "border-tier-top/50 text-tier-top bg-tier-top/10" },
    under: { label: "本科线上", cls: "border-tier-under/50 text-tier-under bg-tier-under/10" },
    close: { label: "临界", cls: "border-warn/50 text-warn bg-warn/10" },
    below: { label: "线下", cls: "border-line text-muted bg-white/5" },
  }[tier];
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] ${map.cls}`}>{map.label}</span>;
}

/** 主行动按钮（发光） */
export function GlowButton({ children, onClick, tone = "cyan", disabled, type = "button" }: { children: ReactNode; onClick?: () => void; tone?: "cyan" | "violet" | "ghost"; disabled?: boolean; type?: "button" | "submit" }) {
  const cls = {
    cyan: "border-accent/50 bg-accent/15 text-accent hover:bg-accent/25 hover:shadow-[0_0_24px_rgba(34,211,238,0.3)]",
    violet: "border-accent2/50 bg-accent2/15 text-accent2 hover:bg-accent2/25 hover:shadow-[0_0_24px_rgba(167,139,250,0.3)]",
    ghost: "border-line text-muted hover:border-line-strong hover:text-ink",
  }[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}
