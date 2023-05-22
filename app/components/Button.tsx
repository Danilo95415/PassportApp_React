import React, { ButtonHTMLAttributes, useMemo } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

// Children are centered and spaced out with gap-4.
// If your button just contains text, simply use the text
// e.g. <Button>Click me</Button>
// If your button has an icon or other elements, just include both elements
// e.g. <Button><Icon /><span>Click me</span></Button>
export const Button = ({ variant, className, ...props }: ButtonProps) => {
  const variantClassName = useMemo(() => {
    if (variant === "secondary") return "bg-background border border-accent-2 hover:bg-accent-2";
    else return "bg-accent hover:bg-muted enabled:hover:text-accent";
  }, [variant]);

  return (
    <button
      className={`group flex items-center justify-center gap-4 rounded-md px-5 py-2 text-color-1
        disabled:cursor-not-allowed disabled:bg-accent-2 disabled:brightness-75
        ${variantClassName} ${className}`}
      {...props}
    />
  );
};
