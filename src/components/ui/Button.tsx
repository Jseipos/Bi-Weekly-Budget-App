"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          // Variants
          variant === "primary" &&
            "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
          variant === "secondary" &&
            "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 border border-gray-300",
          variant === "danger" &&
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
          variant === "ghost" &&
            "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400",
          // Sizes
          size === "sm" && "px-3 py-1.5 text-sm min-h-[36px]",
          size === "md" && "px-4 py-2 text-sm min-h-[44px]",
          size === "lg" && "px-6 py-3 text-base min-h-[48px]",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export { Button };
