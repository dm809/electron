(function () {
  'use strict';

  const PIN_KEY = 'elektron-admin-pin';
  const LOCAL_APPROVED_KEY = 'elektron-approved-reviews';

  let currentTab = 'pending';
  let adminPin = '';
  let supabaseOk = false;

  const els = {
    setup: document.getElementById('admin-setup'),
    login: document.getElementById('admin-login'),
    dashboard: document.getElementById('admin-dashboard'),
    loginForm: document.getElementById('login-form'),
    manualForm: document.getElementById('manual-form'),
    loginError: document.getElementById('login-error'),
    loginWarn: document.getElementById('login-warn'),
    list: document.getElementById('admin-list'),
    empty: document.getElementById('admin-empty'),
    count: document.getElementById('pending-count'),
    refreshBtn: document.getElementById('refresh-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    tabs: document.querySelectorAll('.admin__tab'),
    manual: document.getElementById('admin-manual'),
  };

  function localPin() {
    return String(SITE_CONFIG.adminLocalPin || '472891');
  }

  function verifyPin(pin) {
    return String(pin).trim() === localPin();
  }

  function getSavedPin() {
    return sessionStorage.getItem(PIN_KEY) || '';
  }

  function savePin(pin) {
    sessionStorage.setItem(PIN_KEY, pin);
    adminPin = pin;
  }

  function clearPin() {
    sessionStorage.removeItem(PIN_KEY);
    adminPin = '';
  }

  function loadLocalApproved() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_APPROVED_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalApproved(list) {
    localStorage.setItem(LOCAL_APPROVED_KEY, JSON.stringify(list));
  }

  function starsHtml(rating) {
    const n = Math.min(5, Math.max(1, Number(rating) || 5));
    return Array.from({ length: 5 }, (_, i) =>
      `<span class="star-display__star${i < n ? ' star-display__star--filled' : ''}">★</span>`
    ).join('');
  }

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleString('ru', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr || '';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showPanel(name) {
    els.setup.hidden = name !== 'setup';
    els.login.hidden = name !== 'login';
    els.dashboard.hidden = name !== 'dashboard';
  }

  function showError(msg) {
    els.loginError.textContent = msg;
    els.loginError.hidden = !msg;
  }

  function showWarn(msg) {
    if (!els.loginWarn) return;
    els.loginWarn.textContent = msg;
    els.loginWarn.hidden = !msg;
  }

  function translateError(error) {
    const msg = (error?.message || String(error)).toLowerCase();
    if (msg.includes('invalid pin')) return 'Неверный PIN-код';
    if (msg.includes('function') && msg.includes('does not exist')) {
      return 'Запусти supabase-admin-pin.sql в Supabase → SQL Editor (обновлённая версия)';
    }
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('abort')) {
      return 'Supabase недоступен. Отзывы приходят на email — публикуй вручную ниже.';
    }
    return error?.message || 'Ошибка';
  }

  function getUrlParams() {
    const p = new URLSearchParams(location.search);
    return {
      approveId: p.get('approve'),
      pin: p.get('pin'),
      pub: p.get('pub') === '1',
      name: p.get('name'),
      rating: Number(p.get('r') || p.get('rating') || 5),
      text: p.get('text'),
    };
  }

  function clearUrlParams() {
    history.replaceState({}, '', 'admin.html');
  }

  async function tryAutoActionFromEmail() {
    const params = getUrlParams();

    if (params.pin && verifyPin(params.pin)) {
      adminPin = params.pin.trim();
      savePin(adminPin);
    }

    if (params.pub && params.name && params.text) {
      if (!adminPin) {
        showPanel('login');
        if (params.pin) document.getElementById('admin-pin').value = params.pin;
        showWarn('Нажми «Войти» (PIN уже вставлен) — отзыв опубликуется автоматически.');
        return false;
      }

      await checkSupabase();
      try {
        const result = await publishManual(params.name, params.rating, params.text);
        clearUrlParams();
        showPanel('dashboard');
        currentTab = 'approved';
        els.tabs.forEach((t) => t.classList.toggle('admin__tab--active', t.dataset.tab === 'approved'));
        showPublishedAlert(result.scope);
        await loadReviews();
        return true;
      } catch (err) {
        showPanel('dashboard');
        showWarn(translateError(err));
        return false;
      }
    }

    if (params.approveId) {
      if (!adminPin) {
        showPanel('login');
        if (params.pin) document.getElementById('admin-pin').value = params.pin;
        showWarn('Нажми «Войти» — отзыв опубликуется автоматически.');
        return false;
      }

      await checkSupabase();
      if (!supabaseOk) {
        showPanel('dashboard');
        showWarn('База offline — используй «Запасную ссылку» из письма или опубликуй вручную.');
        return false;
      }

      await SupabaseReviews.rpc('admin_set_status', {
        p_pin: adminPin,
        p_id: params.approveId,
        p_status: 'approved',
      }, 8000);
      clearUrlParams();
      showPanel('dashboard');
      currentTab = 'approved';
      els.tabs.forEach((t) => t.classList.toggle('admin__tab--active', t.dataset.tab === 'approved'));
      showPublishedAlert('global');
      await loadReviews();
      return true;
    }

    return false;
  }

  async function checkSupabase() {
    if (!SupabaseReviews.isConfigured()) {
      supabaseOk = false;
      return false;
    }
    sessionStorage.removeItem('elektron-supabase-skip');
    const result = await SupabaseReviews.testConnection(8000);
    supabaseOk = result.ok;
    return supabaseOk;
  }

  async function init() {
    if (!SupabaseReviews.isConfigured()) {
      showPanel('setup');
      return;
    }

    const params = getUrlParams();
    if (params.pin) document.getElementById('admin-pin').value = params.pin;

    if (await tryAutoActionFromEmail()) return;

    await checkSupabase();

    const saved = getSavedPin();
    if (saved && verifyPin(saved)) {
      adminPin = saved;
      showPanel('dashboard');
      if (!supabaseOk) {
        showWarn('⚠ База offline — в письме нажми «ОПУБЛИКОВАТЬ» или опубликуй вручную внизу.');
      }
      await loadReviews();
      return;
    }

    if (params.approveId || params.pub) {
      showPanel('login');
      return;
    }

    showPanel('login');
  }

  async function login(pin) {
    showError('');
    const cleanPin = String(pin).trim();

    if (!verifyPin(cleanPin)) {
      showError('Неверный PIN. По умолчанию: 472891');
      return;
    }

    await checkSupabase();
    savePin(cleanPin);
    adminPin = cleanPin;

    if (await tryAutoActionFromEmail()) return;

    showPanel('dashboard');

    if (!supabaseOk) {
      showWarn('⚠ База offline — в письме нажми «ОПУБЛИКОВАТЬ» или опубликуй вручную внизу.');
    }

    await loadReviews();
  }

  function logout() {
    clearPin();
    showPanel('login');
    showError('');
    showWarn('');
    document.getElementById('admin-pin').value = '';
  }

  async function fetchReviews(status) {
    if (supabaseOk) {
      try {
        const data = await SupabaseReviews.rpc('admin_get_reviews', {
          p_pin: adminPin,
          p_status: status,
        }, 5000);
        return data || [];
      } catch (err) {
        console.warn('Supabase RPC failed:', err);
        supabaseOk = false;
      }
    }

    if (status === 'approved') {
      const local = loadLocalApproved().map((r, i) => ({
        id: `local-a-${i}`,
        name: r.name,
        rating: r.rating,
        text: r.text,
        created_at: r.date,
        status: 'approved',
        _localIndex: i,
      }));

      if (window.SiteReviewsStore) {
        const site = await SiteReviewsStore.fetchFromSite(5000);
        const fromSite = site.map((r, i) => ({
          id: `site-${i}`,
          name: r.name,
          rating: r.rating,
          text: r.text,
          created_at: r.date,
          status: 'approved',
        }));
        return SiteReviewsStore.mergeReviews(fromSite, local).map((r, i) => ({
          id: r.id || `merged-${i}`,
          ...r,
          status: 'approved',
        }));
      }

      return local;
    }

    return [];
  }

  function pluralReviews(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'отзыв';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'отзыва';
    return 'отзывов';
  }

  function renderCard(review) {
    const isPending = review.status === 'pending';

    const actions = isPending
      ? `
        <div class="admin-card__actions">
          <button type="button" class="btn btn--sm btn--approve" data-action="approve" data-id="${review.id}">✓ Опубликовать</button>
          <button type="button" class="btn btn--sm btn--reject" data-action="reject" data-id="${review.id}">✕ Отклонить</button>
        </div>`
      : `
        <div class="admin-card__actions">
          <button type="button" class="btn btn--sm btn--reject" data-action="delete" data-id="${review.id}">Удалить</button>
        </div>`;

    return `
      <article class="admin-card${isPending ? ' admin-card--pending' : ''}">
        <div class="admin-card__head">
          <strong>${escapeHtml(review.name)}</strong>
          <time>${formatDate(review.created_at)}</time>
        </div>
        <div class="star-display">${starsHtml(review.rating)}</div>
        <p class="admin-card__text">${escapeHtml(review.text)}</p>
        ${actions}
      </article>`;
  }

  async function loadReviews() {
    els.list.innerHTML = '<p class="admin__loading">Загрузка...</p>';
    els.empty.hidden = true;

    if (els.manual) {
      els.manual.hidden = currentTab !== 'pending';
    }

    try {
      const status = currentTab === 'pending' ? 'pending' : 'approved';
      const reviews = await fetchReviews(status);

      const pending = await fetchReviews('pending');
      els.count.textContent = `${pending.length} ${pluralReviews(pending.length)}`;

      if (!reviews.length) {
        els.list.innerHTML = '';
        els.empty.hidden = false;
        if (currentTab === 'pending' && !supabaseOk) {
          els.empty.textContent = 'Ожидающих нет в базе. Проверь email или опубликуй вручную ↓';
        } else {
          els.empty.textContent = 'Нет отзывов в этой вкладке';
        }
        return;
      }

      els.list.innerHTML = reviews.map(renderCard).join('');
    } catch (err) {
      console.error(err);
      els.list.innerHTML = `<p class="admin__error">${escapeHtml(translateError(err))}</p>`;
    }
  }

  async function approveReview(id) {
    if (!supabaseOk || String(id).startsWith('local-')) {
      throw new Error('Используй форму «Опубликовать вручную» или восстанови Supabase');
    }
    await SupabaseReviews.rpc('admin_set_status', {
      p_pin: adminPin,
      p_id: id,
      p_status: 'approved',
    }, 5000);

    const pending = await SupabaseReviews.rpc('admin_get_reviews', {
      p_pin: adminPin,
      p_status: 'approved',
    }, 5000);
    const row = (pending || []).find((r) => r.id === id);
    if (row) await syncReviewToSiteFile(row);
  }

  async function rejectReview(id) {
    if (!supabaseOk) throw new Error('Supabase offline');
    await SupabaseReviews.rpc('admin_set_status', {
      p_pin: adminPin,
      p_id: id,
      p_status: 'rejected',
    }, 5000);
  }

  async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв навсегда?')) return;

    if (String(id).startsWith('local-a-')) {
      const approved = loadLocalApproved();
      approved.splice(Number(String(id).replace('local-a-', '')), 1);
      saveLocalApproved(approved);
      return;
    }

    if (!supabaseOk) throw new Error('Supabase offline');
    await SupabaseReviews.rpc('admin_delete_review', {
      p_pin: adminPin,
      p_id: id,
    }, 5000);
  }

  async function publishManual(name, rating, text) {
    const review = {
      name,
      rating,
      text,
      date: new Date().toISOString(),
    };

    let scope = 'local';

    if (SupabaseReviews.isConfigured()) {
      try {
        await SupabaseReviews.publishApproved(name, rating, text, adminPin, 8000);
        scope = 'global';
      } catch (err) {
        console.warn('Supabase publish failed:', err);
      }
    }

    const siteResult = await syncReviewToSiteFile(review);
    if (siteResult.scope === 'site') return { scope: 'site' };
    if (scope === 'global') return { scope: 'global' };
    if (siteResult.scope === 'download') return { scope: 'download' };

    const list = loadLocalApproved();
    list.unshift(review);
    saveLocalApproved(list.slice(0, 100));
    return { scope: 'local' };
  }

  function showPublishedAlert(scope) {
    const siteUrl = `${location.origin}${(SITE_CONFIG.basePath || '/electron/').replace(/\/?$/, '/')}index.html`;
    if (scope === 'global') {
      alert(`✓ Отзыв опубликован для ВСЕХ (база Supabase)!\n\nОткрой сайт и нажми Ctrl+F5:\n${siteUrl}`);
      window.open(siteUrl, '_blank');
      return;
    }
    if (scope === 'site') {
      alert(`✓ Отзыв на сайте для ВСЕХ!\n\nGitHub обновлён — подожди 1–2 мин и Ctrl+F5:\n${siteUrl}`);
      window.open(siteUrl, '_blank');
      return;
    }
    if (scope === 'download') {
      alert(`Отзыв добавлен в файл reviews.json (скачан).\n\nЗагрузи его на GitHub в папку data/reviews.json\nили нажми «Подключить GitHub» внизу админки.`);
      return;
    }
    alert(`Отзыв сохранён только на этом устройстве.\nПодключи GitHub или Supabase — тогда все увидят отзывы.`);
  }

  async function syncReviewToSiteFile(review) {
    if (!window.SiteReviewsStore) return { scope: 'local' };

    const current = await SiteReviewsStore.fetchFromSite(8000);
    const merged = SiteReviewsStore.mergeReviews(current, [review]);
    const pushed = await SiteReviewsStore.pushToGitHub(merged);

    if (pushed.ok) return { scope: 'site', merged };

    SiteReviewsStore.downloadJson(merged);
    return { scope: 'download', merged };
  }

  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    login(document.getElementById('admin-pin').value);
  });

  if (els.manualForm) {
    els.manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('manual-name').value.trim();
      const rating = Number(document.getElementById('manual-rating').value);
      const text = document.getElementById('manual-text').value.trim();
      const btn = els.manualForm.querySelector('button[type="submit"]');

      if (!name || !text) return;

      btn.disabled = true;
      try {
        const result = await publishManual(name, rating, text);
        els.manualForm.reset();
        document.getElementById('manual-rating').value = '5';
        showPublishedAlert(result.scope);
        currentTab = 'approved';
        els.tabs.forEach((t) => t.classList.toggle('admin__tab--active', t.dataset.tab === 'approved'));
        await loadReviews();
      } catch (err) {
        alert(translateError(err));
      } finally {
        btn.disabled = false;
      }
    });
  }

  els.logoutBtn.addEventListener('click', logout);
  els.refreshBtn.addEventListener('click', async () => {
    await checkSupabase();
    loadReviews();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      els.tabs.forEach((t) => t.classList.toggle('admin__tab--active', t === tab));
      loadReviews();
    });
  });

  els.list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset;
    btn.disabled = true;

    try {
      if (action === 'approve') await approveReview(id);
      else if (action === 'reject') await rejectReview(id);
      else if (action === 'delete') await deleteReview(id);
      await loadReviews();
    } catch (err) {
      console.error(err);
      alert(translateError(err));
    } finally {
      btn.disabled = false;
    }
  });

  function initGitHubSync() {
    const btn = document.getElementById('github-sync-btn');
    if (!btn || !window.SiteReviewsStore) return;

    if (SiteReviewsStore.getGitHubToken()) {
      btn.textContent = 'GitHub подключён ✓';
    }

    btn.addEventListener('click', () => {
      const current = SiteReviewsStore.getGitHubToken();
      const token = prompt(
        'Вставь GitHub token (classic, scope: repo).\nОн хранится только в этой вкладке.\n\nОставь пустым — отключить.',
        current || ''
      );
      if (token === null) return;
      SiteReviewsStore.setGitHubToken(token.trim());
      btn.textContent = token.trim() ? 'GitHub подключён ✓' : 'Подключить GitHub';
      if (token.trim()) alert('GitHub подключён. Теперь «Опубликовать» сразу обновит сайт для всех.');
    });
  }

  initGitHubSync();
  init();
})();
