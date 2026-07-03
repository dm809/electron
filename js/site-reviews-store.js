(function () {
  'use strict';

  const GH_OWNER = 'dm809';
  const GH_REPO = 'electron';
  const GH_PATH = 'data/reviews.json';
  const GH_EDIT_URL = `https://github.com/${GH_OWNER}/${GH_REPO}/edit/main/${GH_PATH}`;
  const TOKEN_KEY = 'elektron-gh-token';

  function basePath() {
    const raw = typeof window.getSiteBasePath === 'function'
      ? getSiteBasePath()
      : (SITE_CONFIG.githubPagesPath || '/electron/');
    return String(raw).replace(/\/?$/, '/');
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

  function jsonUrl() {
    return `${basePath()}data/reviews.json?v=${Date.now()}`;
  }

  function rawGitHubUrl() {
    return `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/data/reviews.json?v=${Date.now()}`;
  }

  async function fetchJsonUrl(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      return mergeReviews(Array.isArray(data) ? data : []);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchFromSite(timeoutMs = 8000) {
    const local = await fetchJsonUrl(jsonUrl(), timeoutMs);
    if (local.length) return local;
    return fetchJsonUrl(rawGitHubUrl(), timeoutMs);
  }

  function getGitHubToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function setGitHubToken(token) {
    const clean = String(token || '').trim();
    if (clean) sessionStorage.setItem(TOKEN_KEY, clean);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function toBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  async function pushToGitHub(reviews) {
    const token = getGitHubToken();
    if (!token) return { ok: false, reason: 'no_token' };

    const apiBase = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    let sha;
    const getRes = await fetch(apiBase, { headers });
    if (getRes.ok) {
      sha = (await getRes.json()).sha;
    } else if (getRes.status !== 404) {
      const msg = await getRes.text();
      return { ok: false, reason: 'github_read', status: getRes.status, message: msg };
    }

    const body = `${JSON.stringify(reviews, null, 2)}\n`;
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Publish ELEKTRON review',
        content: toBase64Utf8(body),
        ...(sha ? { sha } : {}),
      }),
    });

    if (!putRes.ok) {
      const msg = await putRes.text();
      return { ok: false, reason: 'github_write', status: putRes.status, message: msg };
    }
    return { ok: true };
  }

  async function publishReview(review) {
    const normalized = normalizeReview(review);
    if (!normalized) return { ok: false, scope: 'invalid' };

    const token = getGitHubToken();
    const current = await fetchFromSite(8000);
    const merged = mergeReviews(current, [normalized]);

    if (token) {
      const pushed = await pushToGitHub(merged);
      if (pushed.ok) return { ok: true, scope: 'site', merged };
      return { ok: false, scope: 'error', merged, error: formatGhError(pushed) };
    }

    return { ok: false, scope: 'no_token', merged };
  }

  function formatGhError(result) {
    if (result.reason === 'no_token') return 'Нет GitHub token';
    if (result.status === 401) return 'Token неверный или просрочен. Создай новый на github.com/settings/tokens';
    if (result.status === 403) return 'Token без прав repo. Создай classic token с галочкой repo';
    return `GitHub ${result.status || ''}: ${(result.message || result.reason || '').slice(0, 120)}`;
  }

  async function copyJsonForManualEdit(reviews) {
    const text = `${JSON.stringify(reviews, null, 2)}\n`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* fallback below */
    }
    downloadJson(reviews);
    window.open(GH_EDIT_URL, '_blank');
    return text;
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
    mergeReviews,
    fetchFromSite,
    pushToGitHub,
    publishReview,
    copyJsonForManualEdit,
    downloadJson,
    getGitHubToken,
    setGitHubToken,
    formatGhError,
    editUrl: GH_EDIT_URL,
    jsonPath: GH_PATH,
  };
})();
