import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createDemoDataset } from "./demo";
import { parseGradeWorkbook } from "./parser";
import { loadLatestDataset, saveLatestDataset } from "./storage";
import type { GradeDataset, Track } from "./types";

export type ViewId =
  | "dashboard"
  | "grade"
  | "classes"
  | "subjects"
  | "students"
  | "online"
  | "items"
  | "history"
  | "reports"
  | "settings";

export interface ViewContext {
  dataset: GradeDataset;
  exam: string;
  track: Track | "全部";
  classNo: number | "全部";
  setExam: (value: string) => void;
  setTrack: (value: Track | "全部") => void;
  setClassNo: (value: number | "全部") => void;
  go: (view: ViewId) => void;
}

export type DatasetStatus = "restoring" | "empty" | "ready";

export interface DatasetState {
  dataset: GradeDataset | null;
  status: DatasetStatus;
  importMessage: string | null;
  importWorkbook: (file: File) => Promise<void>;
  loadDemo: () => void;
  clearDataset: () => void;
  dismissMessage: () => void;
}

// 数据状态机：恢复(IndexedDB) → 空/就绪；导入/演示/清除是唯一的数据入口。
// 通过 Context 提供全局唯一实例：任何视图调用 useDataset() 拿到的是同一份状态，
// 设置页导入后外壳与所有视图立即同步。
const DatasetContext = createContext<DatasetState | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const state = useDatasetState();
  return <DatasetContext.Provider value={state}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetState {
  const state = useContext(DatasetContext);
  if (!state) throw new Error("useDataset 必须在 <DatasetProvider> 内使用（AppShell 已提供）。");
  return state;
}

function useDatasetState(): DatasetState {
  const [dataset, setDataset] = useState<GradeDataset | null>(null);
  const [status, setStatus] = useState<DatasetStatus>("restoring");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLatestDataset()
      .then((restored) => {
        if (cancelled) return;
        if (restored) {
          setDataset(restored);
          setStatus("ready");
        } else {
          setStatus("empty");
        }
      })
      .catch(() => !cancelled && setStatus("empty"));
    return () => {
      cancelled = true;
    };
  }, []);

  const importWorkbook = useCallback(async (file: File) => {
    try {
      const parsed = await parseGradeWorkbook(file);
      await saveLatestDataset(parsed);
      setDataset(parsed);
      setStatus("ready");
      const warnings = (parsed.issues ?? []).filter((issue) => issue.level !== "info").length;
      setImportMessage(`导入完成：识别 ${parsed.scores.length.toLocaleString()} 条成绩、${parsed.exams.length} 次考试${warnings ? `，${warnings} 项数据提醒见设置页` : "，数据检查通过"}。`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "导入失败，请检查工作簿格式。");
      throw error;
    }
  }, []);

  const loadDemo = useCallback(() => {
    const demo = createDemoDataset();
    setDataset(demo);
    setStatus("ready");
    setImportMessage("已载入内置演示数据（可随时在设置页导入真实工作簿覆盖）。");
  }, []);

  const clearDataset = useCallback(() => {
    setDataset(null);
    setStatus("empty");
    setImportMessage("已清除本地数据。");
  }, []);

  const dismissMessage = useCallback(() => setImportMessage(null), []);

  return useMemo(
    () => ({ dataset, status, importMessage, importWorkbook, loadDemo, clearDataset, dismissMessage }),
    [dataset, status, importMessage, importWorkbook, loadDemo, clearDataset, dismissMessage],
  );
}

// 全局筛选的默认口径：默认定位到最新一次考试，类别/班级为全部。
export function useFilters(dataset: GradeDataset | null) {
  const [exam, setExam] = useState<string>("");
  const [track, setTrack] = useState<Track | "全部">("全部");
  const [classNo, setClassNo] = useState<number | "全部">("全部");

  useEffect(() => {
    if (dataset && !exam) setExam(dataset.exams.includes("4册") ? "4册" : dataset.exams.at(-1) ?? "");
  }, [dataset, exam]);

  return useMemo(
    () => ({
      exam,
      track,
      classNo,
      setExam: (value: string) => setExam(value),
      setTrack: (value: Track | "全部") => setTrack(value),
      setClassNo: (value: number | "全部") => setClassNo(value),
    }),
    [exam, track, classNo],
  );
}
