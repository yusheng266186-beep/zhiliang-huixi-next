"use client";

// 动效原语：全部基于 motion/react，内置 prefers-reduced-motion 降级。
// 视图代码只允许通过这些原语做动画，保证全站动效语言一致且流畅。
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** 视图切换容器：key 变化时交叉淡入 + 上浮 */
export function PageTransition({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(2px)" }}
        transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** 进入视口时淡入上浮（只触发一次） */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/** 容器 + 子项的错拍进场：直接子节点需包 <StaggerItem> */
export function Stagger({ children, className, gap = 0.05 }: { children: ReactNode; className?: string; gap?: number }) {
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
        hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 26 } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** KPI 数字滚动：进入视口后从 0 滚到目标值，目标变化时平滑追踪 */
export function CountUp({ value, digits = 0, suffix = "", className }: { value: number; digits?: number; suffix?: string; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 24, mass: 0.8 });
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

/** 悬停上浮 + 青光边框（配合 .glow-hover） */
export function Hoverable({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`glow-hover ${className ?? ""}`}
      onClick={onClick}
      whileHover={reduced ? undefined : { y: -3 }}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

/** 按压反馈按钮容器 */
export function Pressable({ children, className, onClick, disabled }: { children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled || reduced ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
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
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
