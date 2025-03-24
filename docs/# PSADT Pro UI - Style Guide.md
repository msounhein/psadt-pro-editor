# PSADT Pro UI - Style Guide

## Design Philosophy
The PSADT Pro UI follows a modern, dark-mode-first approach inspired by professional development environments like Visual Studio Code and GitHub's dark theme. The interface prioritizes readability, clear hierarchy, and distraction-free coding while maintaining a professional, technical aesthetic.

## Color Palette

### Core Colors
- **Background**: `#0e1116` - Primary dark background for main areas
- **Foreground**: `#e6edf3` - Primary text color for high readability
- **Border**: `#30363d` - Subtle separation between UI elements
- **Primary Accent**: `#2188ff` - Interactive elements, selections, highlights
- **Error**: `#f85149` - Error states and alerts
- **Heading**: `#e6edf3` - Consistent with foreground for headings

### Secondary Colors
- **Secondary Background**: `#1e1e1e` - Used for editor background
- **Hover States**: `#2a2d2e` - Background for hover interactions
- **Active/Selected**: `#37373d` - Background for active or selected items
- **Muted Text**: `#8a8a8a` - For secondary or less important text
- **Success**: `#26a148` - Confirmation and success messages
- **Warning**: `#d29922` - Warning states and notifications

## Typography

### Font Stack
```css
fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
```

### Font Sizes
- **Code Editor**: `14px` - Optimized for code readability
- **UI Text**: `0.875rem` (14px) - Standard interface text
- **Small Text**: `0.75rem` (12px) - Secondary information, labels
- **Headings**: `1.25rem` (20px) for primary, `1rem` (16px) for secondary

## Component Styles

### Navigation
- Left sidebar with `#0e1116` background
- Selected items with `#37373d` background
- Hover effect with `#2a2d2e` background
- Icons with `24px` size, `#cccccc` color

### Code Editor
- Monaco editor with VS Code-like dark theme
- Line numbers enabled with subtle styling
- Syntax highlighting for PowerShell with green comments (`#6A9955`)
- Active line highlight for better focus
- Minimap enabled for navigation overview

### File Explorer
- Tree view with folder expansion icons
- Selected file highlighted with `#37373d` background
- File icons based on file type (blue for PowerShell, gray for text)
- Folder icons with open/closed states

### Buttons
- Primary action buttons with `#2188ff` background
- Secondary buttons with transparent background and border
- Hover states with slight opacity changes
- Icons positioned consistently with text

### Cards and Panels
- Cards with `#252526` background
- `#30363d` borders for subtle definition
- Rounded corners (`0.375rem` or 6px) for soft appearance
- Padding consistent at `1rem` (16px)

## Layout Guidelines

### Spacing System
- Based on 4px increments: 4px, 8px, 16px, 24px, 32px, 48px
- Consistent margin and padding using these increments
- Inner container padding: `16px`
- Item separation: `8px` for related items, `16px` for sections

### Grid System
- Sidebar fixed at `240px` width
- Content area uses flexible grid with responsive breakpoints
- Editor should occupy maximum available space

### Responsive Behavior
- Collapsible sidebar on smaller screens
- Responsive editor that scales to available space
- Minimum width considerations for proper tool display

## Animation and Transitions

### Loading States
- Spinner with `#4285F4` accent color
- Subtle pulse animation for loading indicators
- Loading skeleton with subtle gradient animation

### Transitions
- Smooth transitions for expandable sections (150ms)
- Subtle fade effects for content changes
- No animations that could distract from coding experience

## Component-Specific Details

### Dialog Boxes
- Center-aligned with `absolute inset-0 flex items-center justify-center`
- Semi-transparent overlay background
- Card-style container with clear heading and actions
- Action buttons aligned at bottom right

### Notifications
- Toast-style for temporary messages
- Persistent notifications in dedicated area
- Color-coded by severity (error, warning, info)

### Status Indicators
- Small dot indicators for file status (modified, saved)
- Text status messages with appropriate colors
- Icon + text combinations for important states

## Accessibility Considerations

### Focus States
- Clear focus indicators with `#2188ff` outline
- Never remove focus styling for keyboard navigation
- Sufficient contrast in all interactive elements

### Color Contrast
- All text meets WCAG AA standards for contrast
- Error messages with sufficient contrast against backgrounds
- Icons with adequate size for visibility

## Implementation Notes

### CSS Approach
- Tailwind CSS for utility-first styling
- Custom theme extension for specialized components
- Consistent class naming for custom components
- Dark mode prioritized with potential for light mode alternative

### Style Composition
- Utilize Tailwind's composition via `cn()` utility
- Maintain consistency by using shared style variables
- Separate theme constants for reuse across components

This style guide ensures a consistent, professional aesthetic throughout the PSADT Pro UI, focusing on readability, usability, and a distraction-free coding experience that respects modern development environment conventions.
