# Highlighter Component Documentation

## Overview

The `Highlighter` component is a React component that creates hand-drawn style annotations around text using the `rough-notation` library. It provides a playful, sketchy aesthetic that's perfect for drawing attention to important text content. The annotations animate in when the element comes into view, creating an engaging user experience.

## Features

- ✨ 7 different annotation styles
- 🎨 Customizable colors and stroke widths
- ⚡ Smooth animations with configurable duration
- 👁️ Viewport-based animations (optional)
- 📱 Responsive and multiline support
- 🎯 Hand-drawn, sketchy aesthetic

## Installation

The component requires the following dependencies:

```bash
npm install rough-notation framer-motion
```

## Import

```tsx
import { Highlighter } from '../components/effects/Highlighter';
```

## Available Actions (Effects)

The `action` prop determines the type of annotation applied to the text. Here are all 7 available actions:

### 1. `"highlight"` (Default)
Creates a yellow highlight behind the text, similar to a marker pen.

**Best for:** Emphasizing important information, key features, or benefits.

**Example:**
```tsx
<Highlighter action="highlight" color="#fef3c7">
  Important text
</Highlighter>
```

### 2. `"underline"`
Draws a wavy or sketchy underline beneath the text.

**Best for:** Underlining key terms, links, or emphasized phrases.

**Example:**
```tsx
<Highlighter action="underline" color="#6366f1" strokeWidth={3}>
  Key term
</Highlighter>
```

### 3. `"box"`
Draws a rectangular box around the text.

**Best for:** Highlighting calls-to-action, important sections, or standalone phrases.

**Example:**
```tsx
<Highlighter action="box" color="#34d399" strokeWidth={2.5}>
  Call to action
</Highlighter>
```

### 4. `"circle"`
Draws a circular annotation around the text.

**Best for:** Emphasizing single words, numbers, or short phrases.

**Example:**
```tsx
<Highlighter action="circle" color="#f59e0b" strokeWidth={2.5}>
  Important
</Highlighter>
```

### 5. `"bracket"`
Draws brackets (square brackets) around the text.

**Best for:** Adding annotations, notes, or grouping related text.

**Example:**
```tsx
<Highlighter action="bracket" color="#8b5cf6" strokeWidth={2.5}>
  Annotation
</Highlighter>
```

### 6. `"strike-through"`
Draws a line through the text (strikethrough).

**Best for:** Showing deprecated features, old information, or items to remove.

**Example:**
```tsx
<Highlighter action="strike-through" color="#ef4444">
  Old feature
</Highlighter>
```

### 7. `"crossed-off"`
Similar to strike-through but with a different visual style (crossed out).

**Best for:** Indicating removed items, outdated information, or negative examples.

**Example:**
```tsx
<Highlighter action="crossed-off" color="#94a3b8">
  Manual work
</Highlighter>
```

## Props

### `children` (required)
- **Type:** `React.ReactNode`
- **Description:** The text content to be annotated.
- **Example:** `"Your text here"`

### `action` (optional)
- **Type:** `"highlight" | "underline" | "box" | "circle" | "strike-through" | "crossed-off" | "bracket"`
- **Default:** `"highlight"`
- **Description:** The type of annotation to apply.
- **Example:** `action="underline"`

### `color` (optional)
- **Type:** `string`
- **Default:** `"#ffd1dc"` (light pink)
- **Description:** The color of the annotation. Can be any valid CSS color (hex, rgb, rgba, named colors).
- **Examples:**
  - `color="#6366f1"` (hex)
  - `color="rgb(99, 102, 241)"` (rgb)
  - `color="rgba(99, 102, 241, 0.8)"` (rgba with opacity)
  - `color="indigo"` (named color)

### `strokeWidth` (optional)
- **Type:** `number`
- **Default:** `1.5`
- **Description:** The thickness of the annotation stroke. Higher values create thicker lines.
- **Range:** Typically `1` to `5`
- **Example:** `strokeWidth={3}`

### `animationDuration` (optional)
- **Type:** `number`
- **Default:** `600`
- **Description:** Duration of the annotation animation in milliseconds.
- **Example:** `animationDuration={800}` (slower animation)
- **Tip:** Lower values (300-500) create snappier animations, higher values (800-1200) create smoother, slower animations.

### `iterations` (optional)
- **Type:** `number`
- **Default:** `2`
- **Description:** Number of times the annotation is drawn. Higher values create a more "sketchy" appearance with multiple overlapping strokes.
- **Range:** Typically `1` to `5`
- **Example:** `iterations={3}` (more sketchy)

### `padding` (optional)
- **Type:** `number`
- **Default:** `2`
- **Description:** Padding around the text in pixels. Controls the spacing between the text and the annotation.
- **Example:** `padding={6}` (more space around text)
- **Tip:** Use higher padding (4-8) for boxes and circles, lower padding (2-4) for underlines and highlights.

### `multiline` (optional)
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether the annotation should span multiple lines of text.
- **Example:** `multiline={false}` (single line only)

### `isView` (optional)
- **Type:** `boolean`
- **Default:** `false`
- **Description:** If `true`, the annotation only appears when the element enters the viewport. If `false`, the annotation appears immediately.
- **Example:** `isView={true}` (animate on scroll)
- **Tip:** Use `isView={true}` for better performance and to create scroll-triggered animations.

## Usage Examples

### Basic Usage

```tsx
import { Highlighter } from '../components/effects/Highlighter';

function MyComponent() {
  return (
    <p>
      This is a <Highlighter>highlighted word</Highlighter> in the text.
    </p>
  );
}
```

### Multiple Actions

```tsx
<p>
  <Highlighter action="highlight" color="#dbeafe">Join meetings</Highlighter>.
  {' '}
  <Highlighter action="underline" color="#6366f1">Generate PRDs</Highlighter>.
  {' '}
  <Highlighter action="box" color="#34d399">Create user stories</Highlighter>.
</p>
```

### Custom Styling

```tsx
<Highlighter
  action="box"
  color="#6366f1"
  strokeWidth={3}
  animationDuration={800}
  padding={6}
  iterations={2}
>
  Custom styled text
</Highlighter>
```

### Scroll-Triggered Animation

```tsx
<Highlighter
  action="underline"
  color="#f59e0b"
  isView={true}
  strokeWidth={2.5}
>
  This annotation appears when scrolled into view
</Highlighter>
```

### In Headings

```tsx
<h1>
  Your{' '}
  <Highlighter 
    action="underline" 
    color="#6366f1" 
    strokeWidth={3}
    animationDuration={800}
  >
    Personalised
  </Highlighter>
  {' '}PM Agent
</h1>
```

## Color Palette Suggestions

Here are some recommended color palettes for different use cases:

### Primary Actions (Indigo/Purple)
```tsx
color="#6366f1" // Indigo
color="#8b5cf6" // Purple
color="#7c3aed" // Violet
```

### Success/Positive (Green)
```tsx
color="#34d399" // Emerald
color="#10b981" // Green
color="#22c55e" // Green-500
```

### Warning/Attention (Orange/Yellow)
```tsx
color="#f59e0b" // Amber
color="#fbbf24" // Yellow
color="#fef3c7" // Yellow-100
```

### Error/Negative (Red)
```tsx
color="#ef4444" // Red
color="#f87171" // Red-400
color="#dc2626" // Red-600
```

### Information (Blue/Cyan)
```tsx
color="#3b82f6" // Blue
color="#06b6d4" // Cyan
color="#dbeafe" // Blue-100
```

### Neutral (Gray)
```tsx
color="#94a3b8" // Slate-400
color="#64748b" // Slate-500
color="#475569" // Slate-600
```

## Best Practices

### 1. **Use Appropriate Actions**
- Use `highlight` for general emphasis
- Use `underline` for key terms or links
- Use `box` for CTAs or important sections
- Use `circle` for single words or numbers
- Use `strike-through` or `crossed-off` for negative examples or deprecated features

### 2. **Color Consistency**
- Maintain a consistent color scheme throughout your application
- Use colors that match your brand identity
- Consider accessibility - ensure sufficient contrast between text and annotation colors

### 3. **Animation Timing**
- Use faster animations (400-600ms) for frequently viewed content
- Use slower animations (800-1200ms) for important, one-time highlights
- Consider using `isView={true}` for better performance on long pages

### 4. **Stroke Width**
- Use thinner strokes (1.5-2) for subtle annotations
- Use thicker strokes (3-4) for bold, attention-grabbing effects
- Match stroke width to the importance of the content

### 5. **Padding**
- Use minimal padding (2-4) for underlines and highlights
- Use more padding (4-8) for boxes and circles to create breathing room
- Adjust padding based on font size and line height

### 6. **Performance**
- Use `isView={true}` to delay animations until elements are visible
- Avoid using too many highlighter components on a single page
- Consider reducing `iterations` if performance is an issue

### 7. **Accessibility**
- Don't rely solely on color to convey meaning
- Ensure annotations enhance, not hinder, readability
- Test with screen readers to ensure content remains accessible

## Common Patterns

### Hero Section Highlighting

```tsx
<h1>
  Your{' '}
  <Highlighter action="underline" color="#6366f1" strokeWidth={3}>
    Personalised
  </Highlighter>
  {' '}PM Agent
</h1>
```

### Feature List

```tsx
<ul>
  <li>
    <Highlighter action="highlight" color="#dbeafe">Join meetings</Highlighter>
  </li>
  <li>
    <Highlighter action="box" color="#34d399">Generate PRDs</Highlighter>
  </li>
  <li>
    <Highlighter action="circle" color="#f59e0b">Create stories</Highlighter>
  </li>
</ul>
```

### Before/After Comparison

```tsx
<p>
  Ship product instead of{' '}
  <Highlighter action="strike-through" color="#ef4444">
    paperwork
  </Highlighter>
  .
</p>
```

### Call-to-Action

```tsx
<p>
  <Highlighter 
    action="box" 
    color="#6366f1" 
    strokeWidth={3}
    padding={8}
  >
    Start Free Trial
  </Highlighter>
</p>
```

## Technical Details

### How It Works

1. The component uses `useRef` to reference the DOM element
2. `useInView` from framer-motion detects when the element enters the viewport (if `isView={true}`)
3. `rough-notation`'s `annotate` function creates the hand-drawn annotation
4. The annotation animates in using the configured `animationDuration`
5. A `ResizeObserver` ensures the annotation updates when the element resizes

### Dependencies

- **react**: For React hooks and component structure
- **framer-motion**: For the `useInView` hook (viewport detection)
- **rough-notation**: For creating hand-drawn style annotations

### Browser Support

The component works in all modern browsers that support:
- CSS custom properties
- ResizeObserver API
- ES6+ JavaScript features

## Troubleshooting

### Annotation Not Appearing

1. **Check if `isView={true}`**: If set to `true`, the annotation only appears when scrolled into view
2. **Verify element is rendered**: Ensure the component is actually mounted in the DOM
3. **Check z-index**: The annotation might be hidden behind other elements
4. **Verify color contrast**: Very light colors might not be visible on light backgrounds

### Animation Not Working

1. **Check `animationDuration`**: Ensure it's a positive number
2. **Verify framer-motion**: Ensure framer-motion is properly installed
3. **Check browser support**: Ensure the browser supports the required APIs

### Performance Issues

1. **Reduce `iterations`**: Lower values (1-2) are more performant
2. **Use `isView={true}`**: This delays animations until elements are visible
3. **Limit number of highlighters**: Too many annotations can impact performance
4. **Reduce `animationDuration`**: Faster animations are less resource-intensive

## Examples in Action

See the landing page hero section for a complete implementation showcasing all 7 annotation types with different colors and styles.

## Additional Resources

- [Rough Notation Documentation](https://roughnotation.com/)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [React Hooks Documentation](https://react.dev/reference/react)

