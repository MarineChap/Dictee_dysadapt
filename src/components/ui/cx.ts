/** Joins class names, skipping falsy ones: cx('a', cond && 'b'). */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
