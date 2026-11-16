/**
 * Copies field-level errors from an API 422/400 response onto a react-hook-form
 * form. Returns true if at least one field error was applied.
 */
export function applyServerErrors(error, setError, fieldNames) {
  let applied = false;
  for (const detail of error?.details ?? []) {
    if (detail.path && fieldNames.includes(detail.path)) {
      setError(detail.path, { type: 'server', message: detail.message });
      applied = true;
    }
  }
  return applied;
}
