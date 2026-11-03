"use client";
import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  effect?: "expandIcon" | "none";
  icon?: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  iconPlacement?: "left" | "right";
};

export function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      effect = "expandIcon",
      icon: Icon,
      iconPlacement = "right",
      className = "",
      children,
      ...rest
    },
    ref,
  ) {
    const [hovered, setHovered] = React.useState(false);
    const leftBox =
      effect === "expandIcon"
        ? `inline-flex items-center overflow-hidden transition-all duration-200 ${hovered ? "w-5 opacity-100 pr-1.5" : "w-0 opacity-0 pr-0"}`
        : "inline-flex items-center w-4 opacity-100";
    const rightBox =
      effect === "expandIcon"
        ? `inline-flex items-center overflow-hidden transition-all duration-200 ${hovered ? "w-5 opacity-100 pl-1.5" : "w-0 opacity-0 pl-0 translate-x-full"}`
        : "inline-flex items-center w-4 opacity-100";
    const labelShift =
      effect === "expandIcon"
        ? hovered
          ? iconPlacement === "right"
            ? "-translate-x-0.5"
            : "translate-x-0.5"
          : "translate-x-0"
        : "translate-x-0";

    return (
      <button
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          "group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
          "border border-black/10 bg-white text-black",
          "transition-colors active:scale-95",
          "hover: bg-white active:bg-black/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
          className,
        ].join(" ")}
        {...rest}
      >
        {Icon && iconPlacement === "left" && (
          <span className={leftBox}>
            <Icon />
          </span>
        )}
        <span
          className={["transition-transform duration-200", labelShift].join(
            " ",
          )}
        >
          {children}
        </span>
        {Icon && iconPlacement === "right" && (
          <span className={rightBox}>
            <Icon />
          </span>
        )}
      </button>
    );
  },
);
