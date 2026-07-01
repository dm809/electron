(function () {
  'use strict';

  const GH_OWNER = 'dm809';
  const GH_REPO = 'electron';
  const GH_PATH = 'data/reviews.json';
  const TOKEN_KEY = 'elektron-gh-token';

  function basePath() {
    return (SITE_CONFIG.basePath || '/electron/').replace(/\/?$/, '/');
  }

  function reviewKey(r) {
    return `${r.name}|${r.rating}|${r.text}`.toLowerCase();
  }

  function normalizeReview(r) {
    if (!r || !r.name || !r.text) return null;
    return {
      name: String(r.name).trim(),
      rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
      text: String(r.text).trim(),
      date: r.date || r.created_at || new Date().toISOString(),
    };
  }

  function mergeReviews(...lists) {
    const seen = new Set();
    const out = [];

    lists.flat().forEach((raw) => {
      const r = normalizeReview(raw);
      if (!r) return;
      const key = reviewKey(r);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(r);
    });

    return out;
  }

  function jsonUrl(cacheBust) {
    const q = cacheBust ? `?v=${Date.now()}` : '';
    return `${basePath()}data/reviews.json${q}`;
  }

  async function fetchFromSite(timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(jsonUrl(true), { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      return mergeReviews(Array.isArray(data) ? data : []);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  function getGitHubToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function setGitHubToken(token) {
    const clean = String(token || '').trim();
    if (clean) sessionStorage.setItem(TOKEN_KEY, clean);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  async function pushToGitHub(reviews) {
    const token = getGitHubToken();
    if (!token) return { ok: false, reason: 'no_token' };

    const apiBase = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    let sha;
    const getRes = await fetch(apiBase, { headers });
    if (getRes.ok) {
      const meta = await getRes.json();
      sha = meta.sha;
    } else if (getRes.status !== 404) {
      return { ok: false, reason: 'github_read', status: getRes.status };
    }

    const body = JSON.stringify(reviews, null, 2) + '\n';
    const content = btoa(unescape(encodeURIComponent(body)));

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Publish ELEKTRON review',
        content,
        ...(sha ? { sha } : {}),
      }),
    });

    if (!putRes.ok) {
      return { ok: false, reason: 'github_write', status: putRes.status };
    }

    return { ok: true };
  }

  function downloadJson(reviews) {
    const blob = new Blob([JSON.stringify(reviews, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reviews.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  window.SiteReviewsStore = {
    reviewKey,
    mergeReviews,
    fetchFromSite,
    pushToGitHub,
    downloadJson,
    getGitHubToken,
    setGitHubToken,
    jsonPath: GH_PATH,
  };
})();
