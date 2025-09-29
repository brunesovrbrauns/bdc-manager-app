import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "default",
  size = "md",
  style,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    cursor: "pointer",
    outline: "none",
    border:
      variant === "outline" ? "1px solid #e5e7eb" : "1px solid transparent",
    background:
      variant === "outline"
        ? "#ffffff"
        : variant === "destructive"
        ? "#ef4444"
        : variant === "ghost"
        ? "transparent"
        : "#111827",
    color: variant === "outline" ? "#111827" : "#ffffff",
    padding:
      size === "sm"
        ? "6px 10px"
        : size === "lg"
        ? "10px 16px"
        : "8px 12px",
    fontSize: size === "sm" ? 12 : size === "lg" ? 15 : 14,
    ...style,
  };

  return <button style={base} {...props} />;
}

export default Button;
