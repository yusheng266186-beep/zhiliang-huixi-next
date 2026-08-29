import { Panel } from "../components/ui";
import type { ViewContext } from "../lib/hooks";

export default function SettingsView({ ctx }: { ctx: ViewContext }) {
  return (
    <Panel title="Settings · 建设中" subtitle="此视图由重构流程填充">
      <p className="text-sm text-muted">当前考试：{ctx.exam}</p>
    </Panel>
  );
}
