import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

/**
 * ScrollArea Component
 * 
 * A custom scrollable container that provides cross-browser compatible scrolling with
 * customizable scrollbars. Built on top of Radix UI's ScrollArea primitive.
 * 
 * This component creates an area that can scroll when content overflows, with custom-styled 
 * scrollbars that appear only when needed.
 */
const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    {/* Viewport - The visible area where content is displayed */}
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    {/* ScrollBar - Custom styled scrollbar that appears when content overflows */}
    <ScrollBar />
    {/* Corner - Fills the corner where the two scrollbars meet */}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

/**
 * ScrollBar Component
 * 
 * Custom scrollbar that can be oriented vertically or horizontally.
 * When content overflows, this scrollbar appears with subtle styling.
 * 
 * Props:
 * - orientation: "vertical" (default) | "horizontal" - Direction of the scrollbar
 * - className: Additional CSS classes
 */
const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      // Styling for vertical scrollbar - appears on right side
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      // Styling for horizontal scrollbar - appears at bottom
      orientation === "horizontal" &&
        "h-2.5 border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    {/* Thumb - The draggable part of the scrollbar */}
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar } 