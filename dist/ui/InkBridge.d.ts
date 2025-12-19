/**
 * Vulpes Celare - Ink Bridge
 *
 * Provides Ink-compatible component patterns for our existing output system.
 * This bridges the gap between our current chalk-based output and Ink's
 * React-like component model without requiring the full Ink dependency.
 *
 * Why this approach:
 * 1. Ink is a heavy dependency (React for terminal)
 * 2. Our existing theme system is already excellent
 * 3. We want the PATTERN without the weight
 * 4. Easy migration path if we ever want full Ink
 */
export interface ComponentProps {
    children?: ComponentChild | ComponentChild[];
}
export type ComponentChild = string | number | Component | null | undefined;
export interface Component {
    render(): string;
}
export interface BoxProps extends ComponentProps {
    borderStyle?: "single" | "double" | "round" | "bold" | "none";
    padding?: number;
    margin?: number;
    width?: number | string;
    title?: string;
    borderColor?: string;
}
export interface TextProps extends ComponentProps {
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    dimColor?: boolean;
}
export interface SpinnerProps {
    type?: "dots" | "line" | "arc" | "circle";
    label?: string;
}
export interface SelectProps<T> {
    items: Array<{
        label: string;
        value: T;
    }>;
    onSelect: (value: T) => void;
}
export interface ProgressBarProps {
    value: number;
    width?: number;
    showPercentage?: boolean;
    color?: string;
}
/**
 * Create Ink-style components that render to our existing output system.
 * This provides familiar React-like patterns without the dependency.
 */
export declare const InkComponents: {
    /**
     * Box component - renders content in a bordered box
     */
    Box: (props: BoxProps) => Component;
    /**
     * Text component - styled text
     */
    Text: (props: TextProps) => Component;
    /**
     * Static component - renders children without animation
     */
    Static: (props: ComponentProps) => Component;
    /**
     * Newline component
     */
    Newline: () => Component;
    /**
     * Spacer component - fills available space
     */
    Spacer: () => Component;
    /**
     * Progress bar component
     */
    ProgressBar: (props: ProgressBarProps) => Component;
    /**
     * Spinner component (static representation for non-interactive mode)
     */
    Spinner: (props: SpinnerProps) => Component;
    /**
     * Table component
     */
    Table: <T extends Record<string, unknown>>(data: T[]) => Component;
};
/**
 * Render a component tree to string.
 * This is our lightweight alternative to Ink's render().
 */
export declare function render(component: Component): string;
/**
 * Render and print a component to output.
 */
export declare function renderToOutput(component: Component): void;
/**
 * Create a component tree using function calls instead of JSX.
 *
 * @example
 * const app = h(InkComponents.Box, { title: 'Hello' },
 *   h(InkComponents.Text, { bold: true }, 'World')
 * );
 * renderToOutput(app);
 */
export declare function h<P extends ComponentProps>(component: (props: P) => Component, props: Omit<P, "children">, ...children: ComponentChild[]): Component;
export declare const Box: (props: BoxProps) => Component, Text: (props: TextProps) => Component, Static: (props: ComponentProps) => Component, Newline: () => Component, Spacer: () => Component, ProgressBar: (props: ProgressBarProps) => Component, Spinner: (props: SpinnerProps) => Component, Table: <T extends Record<string, unknown>>(data: T[]) => Component;
//# sourceMappingURL=InkBridge.d.ts.map