"use client";

// 图表统一懒加载：recharts 体积大，首次渲染含图表视图时才加载。
// 数据键与旧版完全一致（功能不变），仅视觉按深空观测站主题重构。
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TIER_COLORS } from "../lib/chart-theme";

const GRID = "#eceae5";
const AXIS_TICK = { fill: "#8a8a84", fontSize: 11 };
const ACCENT = "#2b5bd7";
const VIOLET = "#1c1b18";
const TOP = TIER_COLORS.top;
const UNDER = TIER_COLORS.undergraduate;
const COLORS = [TOP, UNDER, VIOLET, ACCENT];

const axis = { tick: AXIS_TICK, axisLine: false as const, tickLine: false as const };
const darkTooltip = {
  contentStyle: { background: "#ffffff", border: "1px solid #e8e6e1", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(28,27,24,0.08)" },
  labelStyle: { color: "#1c1b18", fontWeight: 600 },
  itemStyle: { color: "#75736c" },
  cursor: { fill: "rgba(43,91,215,0.05)" },
};

type ChartRow = Record<string, unknown>;

export function DistributionChart({ bins, medianBinLabel }: { bins: ChartRow[]; medianBinLabel?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bins} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
        
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...axis} interval={0} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...darkTooltip} />
        <ReferenceLine x={medianBinLabel} stroke={VIOLET} strokeDasharray="4 4" label={{ value: "中位数", fill: "#75736c", fontSize: 10, position: "top" }} />
        <Bar dataKey="count" name="人数" fill="#2b5bd7" radius={[6, 6, 2, 2]} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RateBarsChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" {...axis} />
        <YAxis unit="%" domain={[0, 100]} {...axis} />
        <Tooltip {...darkTooltip} />
        <Legend wrapperStyle={{ color: "#8b97ad", fontSize: 12 }} />
        <Bar dataKey="一本率" fill={TOP} radius={[6, 6, 2, 2]} animationDuration={900} />
        <Bar dataKey="本科率" fill={UNDER} radius={[6, 6, 2, 2]} animationDuration={1100} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrackPieChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={4} cornerRadius={6} animationDuration={1000} stroke="#ffffff">
          {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip {...darkTooltip} />
        <Legend wrapperStyle={{ color: "#8b97ad", fontSize: 12 }} verticalAlign="bottom" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ClassCompareChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" {...axis} />
        <YAxis yAxisId="left" {...axis} />
        <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} {...axis} />
        <Tooltip {...darkTooltip} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
        <Legend wrapperStyle={{ color: "#8b97ad", fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="平均分" fill={ACCENT} radius={[6, 6, 2, 2]} animationDuration={800} />
        <Bar yAxisId="right" dataKey="一本率" fill={TOP} radius={[6, 6, 2, 2]} animationDuration={1000} />
        <Bar yAxisId="right" dataKey="本科率" fill={UNDER} radius={[6, 6, 2, 2]} animationDuration={1200} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SubjectClassChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
        
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" {...axis} />
        <YAxis domain={["dataMin - 8", "dataMax + 5"]} {...axis} />
        <Tooltip {...darkTooltip} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
        <Bar dataKey="average" name="平均分" fill="#2b5bd7" radius={[7, 7, 2, 2]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistoryLineChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="exam" {...axis} />
        <YAxis domain={["dataMin - 20", "dataMax + 20"]} {...axis} />
        <Tooltip {...darkTooltip} />
        <Line type="monotone" dataKey="total" name="总分" stroke={ACCENT} strokeWidth={3} dot={{ r: 4, fill: "#0a0f1f", stroke: ACCENT, strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={900} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubjectDiagnosisChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="subject" {...axis} />
        <YAxis {...axis} />
        <Tooltip {...darkTooltip} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
        <Legend wrapperStyle={{ color: "#8b97ad", fontSize: 12 }} />
        <Bar dataKey="score" name="个人分数" fill={ACCENT} radius={[5, 5, 2, 2]} animationDuration={700} />
        <Bar dataKey="topLine" name="一本有效分" fill={TOP} radius={[5, 5, 2, 2]} animationDuration={950} />
        <Bar dataKey="undergraduateLine" name="本科有效分" fill={UNDER} radius={[5, 5, 2, 2]} animationDuration={1150} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ItemRateChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" {...axis} interval={0} angle={-25} textAnchor="end" height={58} />
        <YAxis unit="%" domain={[0, 100]} {...axis} />
        <Tooltip {...darkTooltip} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
        <Bar dataKey="得分率" radius={[6, 6, 2, 2]} animationDuration={1000}>
          {data.map((item, index) => {
            const rate = Number(item["得分率"]);
            return <Cell key={index} fill={rate < 60 ? "#fb923c" : rate >= 80 ? UNDER : ACCENT} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GradeTrendChart({ data }: { data: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={GRID} />
        <XAxis dataKey="exam" {...axis} />
        <YAxis yAxisId="score" domain={["dataMin - 20", "dataMax + 20"]} {...axis} />
        <YAxis yAxisId="count" orientation="right" {...axis} />
        <Tooltip {...darkTooltip} />
        <Legend wrapperStyle={{ color: "#8b97ad", fontSize: 12 }} />
        <Line yAxisId="score" type="monotone" dataKey="average" name="平均分" stroke={ACCENT} strokeWidth={3} dot={false} animationDuration={700} />
        <Line yAxisId="count" type="monotone" dataKey="top" name="一本上线" stroke={TOP} strokeWidth={3} dot={false} animationDuration={950} />
        <Line yAxisId="count" type="monotone" dataKey="undergraduate" name="本科上线" stroke={UNDER} strokeWidth={3} dot={false} animationDuration={1150} />
      </LineChart>
    </ResponsiveContainer>
  );
}
