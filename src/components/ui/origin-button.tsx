"use client";

import { motion } from "motion/react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

const componentThemeClassName =
  "[--ic-background:#ffffff] [--ic-foreground:#111111] [--ic-card:#ffffff] [--ic-card-foreground:#111111] [--ic-border:#e3e7ec] [--ic-ring:rgba(17,17,17,0.16)] [--color-background:var(--ic-background)] [--color-foreground:var(--ic-foreground)] [--color-card:var(--ic-card)] [--color-card-foreground:var(--ic-card-foreground)] [--color-border:var(--ic-border)] [--color-ring:var(--ic-ring)] dark:[--ic-background:#111111] dark:[--ic-foreground:#f6f3ec] dark:[--ic-card:#171716] dark:[--ic-card-foreground:#f6f3ec] dark:[--ic-border:#2b2a25] dark:[--ic-ring:rgba(246,243,236,0.18)]";

const rootClassName = cn(
  componentThemeClassName,
  "relative inline-flex h-12 cursor-pointer touch-manipulation select-none items-center justify-center overflow-hidden rounded-xl px-8 text-[15px] font-medium tracking-[-0.02em]",
  "border-[0.5px] border-border hover:border-foreground bg-card text-card-foreground",
  "transition-[color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-50",
);

const FILL_DURATION = 0.5;
const FILL_EASE = [0.16, 1, 0.3, 1] as const;
const MotionLink = motion.create(Link);

function getCoverDiameter(width: number, height: number, x: number, y: number) {
  return Math.ceil(
    2 *
      Math.max(
        Math.hypot(x, y),
        Math.hypot(width - x, y),
        Math.hypot(x, height - y),
        Math.hypot(width - x, height - y),
      ),
  );
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function hasTextContent(node: React.ReactNode): boolean {
  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim().length > 0;
  }
  if (Array.isArray(node)) return node.some(hasTextContent);
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return hasTextContent(node.props.children);
  }
  return false;
}

function useAccessibleNameWarning(
  componentName: string,
  children: React.ReactNode,
  ariaLabel?: string,
  ariaLabelledBy?: string,
) {
  React.useEffect(() => {
    if (
      process.env.NODE_ENV === "production" ||
      hasTextContent(children) ||
      ariaLabel?.trim() ||
      ariaLabelledBy?.trim()
    ) {
      return;
    }
    console.warn(
      `${componentName}: provide visible label text or aria-label / aria-labelledby so the control has an accessible name.`,
    );
  }, [ariaLabel, ariaLabelledBy, children, componentName]);
}

function useOriginFill<T extends HTMLElement>(
  nodeRef: React.RefObject<T | null>,
  isDisabled = false,
) {
  const [hovered, setHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);
  const [origin, setOrigin] = React.useState({ x: 0, y: 0 });
  const [coverSize, setCoverSize] = React.useState(0);
  const showFill = !isDisabled && (hovered || isPressed);

  const updateOrigin = React.useCallback((x: number, y: number) => {
    const node = nodeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setOrigin({ x, y });
    setCoverSize(getCoverDiameter(rect.width, rect.height, x, y));
  }, [nodeRef]);

  const updateOriginFromPointer = React.useCallback(
    (event: React.PointerEvent<T>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      updateOrigin(event.clientX - rect.left, event.clientY - rect.top);
    },
    [updateOrigin],
  );

  const updateOriginFromCenter = React.useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    updateOrigin(rect.width / 2, rect.height / 2);
  }, [nodeRef, updateOrigin]);

  React.useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node || !showFill || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      setCoverSize(getCoverDiameter(rect.width, rect.height, origin.x, origin.y));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => observer.disconnect();
  }, [nodeRef, showFill, origin.x, origin.y]);

  return {
    showFill,
    isPressed,
    origin,
    coverSize,
    setHovered,
    setIsPressed,
    updateOriginFromPointer,
    updateOriginFromCenter,
  };
}

function OriginFill({
  show,
  size,
  x,
  y,
}: {
  show: boolean;
  size: number;
  x: number;
  y: number;
}) {
  return (
    <motion.span
      animate={{ scale: show && size > 0 ? 1 : 0 }}
      aria-hidden
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-contrast-surface"
      initial={false}
      style={{ height: size, left: x, top: y, width: size }}
      transition={{ duration: FILL_DURATION, ease: FILL_EASE }}
    />
  );
}

type ButtonHTMLAttributesForMotion = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onAnimationStart"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
>;

type OriginButtonProps = ButtonHTMLAttributesForMotion & {
  children?: React.ReactNode;
  loading?: boolean;
};

const OriginButton = React.forwardRef<HTMLButtonElement, OriginButtonProps>(
  ({ children, className, disabled, loading = false, type = "button", ...props }, ref) => {
    const isDisabled = Boolean(disabled || loading);
    const nodeRef = React.useRef<HTMLButtonElement>(null);
    const fill = useOriginFill(nodeRef, isDisabled);
    useAccessibleNameWarning(
      "OriginButton",
      children,
      props["aria-label"],
      props["aria-labelledby"],
    );

    const setMergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        nodeRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    return (
      <motion.button
        {...props}
        aria-busy={loading || undefined}
        className={cn(rootClassName, className)}
        data-pressed={fill.isPressed ? "true" : "false"}
        disabled={isDisabled}
        onBlur={(event) => {
          props.onBlur?.(event);
          fill.setIsPressed(false);
          if (!event.defaultPrevented) fill.setHovered(false);
        }}
        onFocus={(event) => {
          props.onFocus?.(event);
          if (!isDisabled && !event.defaultPrevented && event.currentTarget.matches(":focus-visible")) {
            fill.updateOriginFromCenter();
            fill.setHovered(true);
          }
        }}
        onPointerDown={(event) => {
          props.onPointerDown?.(event);
          if (!event.defaultPrevented && !isDisabled && event.button === 0) {
            fill.updateOriginFromPointer(event);
            fill.setIsPressed(true);
            fill.setHovered(true);
          }
        }}
        onPointerEnter={(event) => {
          props.onPointerEnter?.(event);
          if (!event.defaultPrevented && !isDisabled) {
            fill.updateOriginFromPointer(event);
            fill.setHovered(true);
          }
        }}
        onPointerLeave={(event) => {
          props.onPointerLeave?.(event);
          fill.setHovered(false);
          fill.setIsPressed(false);
        }}
        onPointerUp={(event) => {
          props.onPointerUp?.(event);
          fill.setIsPressed(false);
        }}
        ref={setMergedRef}
        style={fill.showFill ? { ...props.style, color: "var(--primary)" } : props.style}
        type={type}
        whileTap={isDisabled ? undefined : { scale: 0.985 }}
      >
        <OriginFill show={fill.showFill} size={fill.coverSize} x={fill.origin.x} y={fill.origin.y} />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      </motion.button>
    );
  },
);
OriginButton.displayName = "OriginButton";

type OriginLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onAnimationStart"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
>;

const OriginLink = React.forwardRef<HTMLAnchorElement, OriginLinkProps>(
  ({ children, className, ...props }, ref) => {
    const nodeRef = React.useRef<HTMLAnchorElement>(null);
    const fill = useOriginFill(nodeRef);
    useAccessibleNameWarning(
      "OriginLink",
      children,
      props["aria-label"],
      props["aria-labelledby"],
    );

    const setMergedRef = React.useCallback(
      (node: HTMLAnchorElement | null) => {
        nodeRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    return (
      <MotionLink
        {...props}
        className={cn(rootClassName, className)}
        data-pressed={fill.isPressed ? "true" : "false"}
        onBlur={(event) => {
          props.onBlur?.(event);
          fill.setHovered(false);
          fill.setIsPressed(false);
        }}
        onFocus={(event) => {
          props.onFocus?.(event);
          if (!event.defaultPrevented && event.currentTarget.matches(":focus-visible")) {
            fill.updateOriginFromCenter();
            fill.setHovered(true);
          }
        }}
        onPointerDown={(event) => {
          props.onPointerDown?.(event);
          if (!event.defaultPrevented && event.button === 0) {
            fill.updateOriginFromPointer(event);
            fill.setIsPressed(true);
            fill.setHovered(true);
          }
        }}
        onPointerEnter={(event) => {
          props.onPointerEnter?.(event);
          if (!event.defaultPrevented) {
            fill.updateOriginFromPointer(event);
            fill.setHovered(true);
          }
        }}
        onPointerLeave={(event) => {
          props.onPointerLeave?.(event);
          fill.setHovered(false);
          fill.setIsPressed(false);
        }}
        onPointerUp={(event) => {
          props.onPointerUp?.(event);
          fill.setIsPressed(false);
        }}
        ref={setMergedRef}
        style={fill.showFill ? { ...props.style, color: "var(--primary)" } : props.style}
        whileTap={{ scale: 0.985 }}
      >
        <OriginFill show={fill.showFill} size={fill.coverSize} x={fill.origin.x} y={fill.origin.y} />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      </MotionLink>
    );
  },
);
OriginLink.displayName = "OriginLink";

export { OriginButton, OriginLink };
export type { OriginButtonProps, OriginLinkProps };
