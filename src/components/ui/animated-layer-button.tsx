import * as React from "react";
import { cn } from "@/lib/utils";

export interface AnimatedLayerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const AnimatedLayerButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedLayerButtonProps
>(({ className, children, ...props }, ref) => {
  return (
    <button
      className={cn(
        "px-5 py-2.5 text-sm font-semibold rounded-lg transition-all hover:scale-105",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      style={{ 
        backgroundColor: '#34a85a', 
        color: 'var(--primary-foreground)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)'
      }}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
AnimatedLayerButton.displayName = "AnimatedLayerButton";

export { AnimatedLayerButton };
