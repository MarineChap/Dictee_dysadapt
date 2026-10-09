import { Link } from 'react-router-dom';
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  // bg-primary is switched to --primary-solid in dark mode (globals.css)
  primary: 'bg-primary text-white hover:bg-primary-hover border border-transparent',
  secondary: 'bg-surface text-primary border border-primary hover:bg-primary-muted',
  ghost: 'bg-transparent text-primary border border-transparent hover:bg-primary-muted',
  danger:
    'bg-surface text-danger-700 dark:text-danger-300 border border-danger-700 dark:border-danger-300 hover:bg-danger-50 dark:hover:bg-danger-950',
};

const SIZE: Record<ButtonSize, string> = {
  // 44 px tall from md up: the WCAG 2.5.5 target size
  sm: 'min-h-9 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-base gap-2',
  lg: 'min-h-13 px-6 text-lg gap-2.5',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

/** The classes of a button, for the rare element that can be neither
 *  <Button> nor <ButtonLink> (a react-dropzone root, a <label> for a file input). */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}): string {
  return cx(
    // active: a press is visible on touch screens (no zoom)
    'inline-flex items-center justify-center rounded-md font-bold leading-tight transition-colors active:brightness-90',
    'disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:cursor-not-allowed',
    VARIANT[variant],
    SIZE[size],
    fullWidth && 'w-full'
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** A Lucide icon drawn before the label */
  icon?: LucideIcon;
  /** A Lucide icon drawn after the label */
  iconRight?: LucideIcon;
  children?: ReactNode;
}

function Content({
  icon: Icon,
  iconRight: IconRight,
  size = 'md',
  loading,
  children,
}: CommonProps & { loading?: boolean }) {
  const px = ICON_SIZE[size];
  return (
    <>
      {loading ? (
        <Loader2 size={px} className="animate-spin shrink-0" aria-hidden="true" />
      ) : (
        Icon && <Icon size={px} className="shrink-0" aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight size={px} className="shrink-0" aria-hidden="true" />}
    </>
  );
}

export type ButtonProps = CommonProps &
  Omit<ComponentProps<'button'>, 'children'> & {
    /** Shows a spinner in place of the icon and disables the button */
    loading?: boolean;
  };

/** The one button of the interface. Never restyle it with colour classes:
 *  pick a variant (docs/frontend-design-system.md). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    fullWidth,
    icon,
    iconRight,
    loading,
    className,
    children,
    type = 'button',
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      {...rest}
    >
      <Content icon={icon} iconRight={iconRight} size={size} loading={loading}>
        {children}
      </Content>
    </button>
  );
});

export type ButtonLinkProps = CommonProps & Omit<ComponentProps<typeof Link>, 'children'>;

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  iconRight,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cx(buttonClasses({ variant, size, fullWidth }), className)} {...rest}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </Link>
  );
}

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: LucideIcon;
  /** Required: the accessible name, also shown as a tooltip */
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary';
  size?: ButtonSize;
};

const ICON_BUTTON_SIZE: Record<ButtonSize, string> = { sm: 'size-9', md: 'size-11', lg: 'size-13' };

/** An icon-only button. `label` is mandatory: it is its only name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', className, type = 'button', title, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        'inline-flex items-center justify-center rounded-md transition-colors shrink-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'ghost'
          ? 'text-muted hover:text-primary hover:bg-primary-muted border border-transparent'
          : VARIANT[variant],
        ICON_BUTTON_SIZE[size],
        className
      )}
      {...rest}
    >
      <Icon size={ICON_SIZE[size]} aria-hidden="true" />
    </button>
  );
});
