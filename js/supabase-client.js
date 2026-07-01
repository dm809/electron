(function () {
  'use strict';

  let client = null;
  const DEFAULT_TIMEOUT = 4000;
  const SKIP_KEY = 'elektron-supabase-skip';

  function cfg() {
    return SITE_CONFIG.supabase || {};
  }

  function isConfigured() {
    const c = cfg();
    return Boolean(c.url && (c.anonKey || c.publishableKey));
  }

  function getApiKey() {
    const c = cfg();
    return c.anonKey || c.publishableKey || '';
  }

  function shouldUse() {
    if (!isConfigured()) return false;
    if (cfg().enabled === false) return false;
    if (sessionStorage.getItem(SKIP_KEY) === '1') return false;
    return true;
  }

  function markSkip() {
    sessionStorage.setItem(SKIP_KEY, '1');
  }

  function withTimeout(promise, ms = DEFAULT_TIMEOUT) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
  }

  async function restFetch(path, options = {}, timeoutMs = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const key = getApiKey();

    try {
      const res = await fetch(`${cfg().url}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }

      if (res.status === 204) return null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) return res.json();
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function getClient() {
    if (!shouldUse() || !window.supabase) return null;
    if (!client) {
      client = window.supabase.createClient(cfg().url, getApiKey());
    }
    return client;
  }

  async function testConnection(timeoutMs = DEFAULT_TIMEOUT) {
    if (!shouldUse()) return { ok: false, reason: 'disabled' };

    try {
      await restFetch('/rest/v1/reviews?select=id&limit=1', { method: 'GET' }, timeoutMs);
      return { ok: true };
    } catch (err) {
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes('abort') || msg.includes('timeout')) {
        markSkip();
        return { ok: false, reason: 'timeout' };
      }
      if (msg.includes('failed to fetch') || msg.includes('network')) {
        markSkip();
        return { ok: false, reason: 'network' };
      }
      if (msg.includes('42p01') || msg.includes('does not exist')) {
        return { ok: false, reason: 'no_table' };
      }
      markSkip();
      return { ok: false, reason: 'api_error', message: err?.message };
    }
  }

  async function insertReview(review, timeoutMs = DEFAULT_TIMEOUT) {
    return restFetch('/rest/v1/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: review.name,
        rating: review.rating,
        text: review.text,
        status: 'pending',
      }),
    }, timeoutMs);
  }

  async function fetchApproved(timeoutMs = DEFAULT_TIMEOUT) {
    const data = await restFetch(
      '/rest/v1/reviews?select=name,rating,text,created_at&status=eq.approved&order=created_at.desc',
      { method: 'GET' },
      timeoutMs
    );
    return (data || []).map((r) => ({
      name: r.name,
      rating: r.rating,
      text: r.text,
      date: r.created_at,
    }));
  }

  async function rpc(name, params, timeoutMs = DEFAULT_TIMEOUT) {
    return restFetch(`/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }, timeoutMs);
  }

  window.SupabaseReviews = {
    isConfigured,
    shouldUse,
    getApiKey,
    getClient,
    withTimeout,
    testConnection,
    insertReview,
    fetchApproved,
    rpc,
    markSkip,
  };
})();
