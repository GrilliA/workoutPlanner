/**
 * After a save was stopped by a check of ours (the form has `noValidate`), moves the focus to
 * the first field marked `aria-invalid`, or to the form's own error message (`data-form-error`,
 * which needs `tabIndex={-1}`), so keyboard and screen reader users land on what to fix.
 */
export function focusFirstInvalid(form: HTMLElement | null): void {
  const firstProblem = form?.querySelector<HTMLElement>('[aria-invalid="true"], [data-form-error]');
  firstProblem?.focus();
}
