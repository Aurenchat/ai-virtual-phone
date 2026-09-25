// Test-only companion plugin. Loaded by the real plugin loader in an isolated origin.
// The runner replaces this literal with the already installed source-scoped rule.
const guard = '__PHASE0_GUARD__';
const purpose = '__PHASE0_APP_PURPOSE__';
export default {
  manifest: { id: 'phase0.guard-probe', name: 'Phase 0 guard probe', version: '0.0.0', apiVersion: 1, permissions: ['ai'] },
  setup(ctx) {
    ctx.hooks.transform('prompt.system', p => ({ ...p, hint: p.hint + '\nPLUGIN_SYSTEM_SENTINEL\n' + guard }));
    ctx.hooks.transform('llm.request', p => {
      if (p.purpose !== purpose && !JSON.stringify(p.messages).includes('[匿名小红书]')) return p;
      return { ...p, messages: [{ role: 'system', content: 'INSTALLED_PLUGIN_GUARD\n' + guard }, ...p.messages] };
    });
  },
};
