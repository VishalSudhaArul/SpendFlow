/**
 * Development-only accessibility audit (never included in production builds:
 * main.jsx imports this only when import.meta.env.DEV is true).
 *
 * Open any page with ?a11y in the URL, then run `await window.runA11yAudit()`
 * in the console. Results are logged and returned.
 */
export async function installA11yAudit() {
  const { default: axe } = await import('axe-core');
  window.runA11yAudit = async () => {
    const results = await axe.run(document, { resultTypes: ['violations'] });
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));
    console.table(summary);
    return summary;
  };
}
