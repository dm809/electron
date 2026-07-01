(function () {
  'use strict';

  const DEFAULT_TIMEOUT = 8000;

  function cfg() {
    return SITE_CONFIG.supabase || {};
  }

  function isConfigured() {
    const c = cfg();
    return Boolean(c.url && c.anonKey);
  }

  function getApiKey() {
    return cfg().anonKey || '';
  }

  async function restFetch(path, options = {}, timeoutMs = DEFAULT_TIMEOUT) {
    if (!isConfigured()) throw new Error('Supabase not configured');

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

  async function testConnection(timeoutMs = DEFAULT_TIMEOUT) {
    if (!isConfigured()) return { ok: false, reason: 'not_configured' };

    try {
      await restFetch('/rest/v1/reviews?select=id&limit=1', { method: 'GET' }, timeoutMs);
      return { ok: true };
    } catch (err) {
      const msg = (err?.message || String(err)).toLowerCase();
      if (msg.includes('42p01') || msg.includes('does not exist')) {
        return { ok: false, reason: 'no_table' };
      }
      if (msg.includes('abort') || msg.includes('timeout')) {
        return { ok: false, reason: 'timeout' };
      }
      if (msg.includes('failed to fetch') || msg.includes('network')) {
        return { ok: false, reason: 'network' };
      }
      return { ok: false, reason: 'api_error', message: err?.message };
    }
  }

  async function insertReview(review, timeoutMs = DEFAULT_TIMEOUT) {
    const data = await restFetch('/rest/v1/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name: review.name,
        rating: review.rating,
        text: review.text,
        status: 'pending',
      }),
    }, timeoutMs);
    return Array.isArray(data) ? data[0] : data;
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

  /** Публикация в базу — RPC или insert+approve */
  async function publishApproved(name, rating, text, pin, timeoutMs = DEFAULT_TIMEOUT) {
    try {
      await rpc('admin_publish_review', {
        p_pin: pin,
        p_name: name,
        p_rating: rating,
        p_text: text,
      }, timeoutMs);
      return { ok: true, method: 'rpc' };
    } catch (err) {
      const row = await insertReview({ name, rating, text }, timeoutMs);
      if (!row?.id) throw err;
      await rpc('admin_set_status', {
        p_pin: pin,
        p_id: row.id,
        p_status: 'approved',
      }, timeoutMs);
      return { ok: true, method: 'insert+approve', id: row.id };
    }
  }

  window.SupabaseReviews = {
    isConfigured,
    getApiKey,
    testConnection,
    insertReview,
    fetchApproved,
    rpc,
    publishApproved,
  };
})();
