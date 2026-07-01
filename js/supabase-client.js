(function () {
  'use strict';

  let client = null;

  function isConfigured() {
    const cfg = SITE_CONFIG.supabase || {};
    return Boolean(cfg.url && cfg.anonKey);
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (!client && window.supabase) {
      client = window.supabase.createClient(
        SITE_CONFIG.supabase.url,
        SITE_CONFIG.supabase.anonKey
      );
    }
    return client;
  }

  window.SupabaseReviews = {
    isConfigured,
    getClient,
  };
})();
