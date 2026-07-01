(function () {
  'use strict';

  let client = null;

  function isConfigured() {
    const cfg = SITE_CONFIG.supabase || {};
    return Boolean(cfg.url && (cfg.publishableKey || cfg.anonKey));
  }

  function getApiKey() {
    const cfg = SITE_CONFIG.supabase || {};
    return cfg.publishableKey || cfg.anonKey || '';
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (!client && window.supabase) {
      client = window.supabase.createClient(
        SITE_CONFIG.supabase.url,
        getApiKey()
      );
    }
    return client;
  }

  async function testConnection() {
    if (!isConfigured()) return { ok: false, reason: 'not_configured' };

    try {
      const { error } = await getClient()
        .from('reviews')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01') return { ok: false, reason: 'no_table' };
        return { ok: false, reason: 'api_error', message: error.message };
      }
      return { ok: true };
    } catch (err) {
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes('failed to fetch') || msg.includes('network')) {
        return { ok: false, reason: 'network' };
      }
      return { ok: false, reason: 'unknown', message: err?.message };
    }
  }

  window.SupabaseReviews = {
    isConfigured,
    getApiKey,
    getClient,
    testConnection,
  };
})();
