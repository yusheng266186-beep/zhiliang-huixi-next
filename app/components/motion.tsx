"use client";

// 动效原语：全部基于 motion/react，内置 prefers-reduced-motion 降级。
// 简约高级风格：动效只服务于状态变化——快、轻、无炫技。
// 曲线只有两种：交互用 spring(400/40)，进出场景用 [0.22,1,0.36,1]；时长 ≤250ms。
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** 视图切换：快速淡入 + 轻微上浮 */
export function PageTransition({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** 进入视口时淡入上浮（只触发一次，幅度克制） */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/** 容器 + 子项的轻微错拍（0.03s，位移 6px，无缩放） */
export function Stagger({ children, className, gap = 0.03 }: { children: ReactNode; className?: string; gap?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT_EXPO } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** KPI 数字滚动：进入视口后短促滚动到目标值 */
export function CountUp({ value, digits = 0, suffix = "", className }: { value: number; digits?: number; suffix?: string; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 160, damping: 30 });
  const text = useTransform(spring, (latest) => `${latest.toFixed(digits)}${suffix}`);

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  return (
    <span ref={ref} className={className}>
      {reduced ? `${value.toFixed(digits)}${suffix}` : <motion.span>{text}</motion.span>}
    </span>
  );
}

/** 悬停：仅背景微变（位移交给 CSS border 变化），保持版面稳定 */
export function Hoverable({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`glow-hover ${className ?? ""}`} onClick={onClick}>
      {children}
    </div>
  );
}

/** 按压反馈 */
export function Pressable({ children, className, onClick, disabled }: { children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled || reduced ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.12 }}
      style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
    >
      {children}
    </motion.div>
  );
}

/** 高度自适应展开/收起 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
