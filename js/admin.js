(function () {
  'use strict';

  let currentTab = 'pending';
  let session = null;

  const els = {
    setup: document.getElementById('admin-setup'),
    login: document.getElementById('admin-login'),
    dashboard: document.getElementById('admin-dashboard'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    list: document.getElementById('admin-list'),
    empty: document.getElementById('admin-empty'),
    count: document.getElementById('pending-count'),
    refreshBtn: document.getElementById('refresh-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    tabs: document.querySelectorAll('.admin__tab'),
  };

  function db() {
    return SupabaseReviews.getClient();
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

  async function init() {
    if (!SupabaseReviews.isConfigured()) {
      showPanel('setup');
      return;
    }

    const client = db();
    const { data } = await client.auth.getSession();
    session = data.session;

    if (session) {
      showPanel('dashboard');
      await loadReviews();
    } else {
      showPanel('login');
    }
  }

  async function login(email, password) {
    showError('');
    const { data, error } = await db().auth.signInWithPassword({ email, password });

    if (error) {
      showError('Неверный email или пароль');
      return;
    }

    session = data.session;
    showPanel('dashboard');
    await loadReviews();
  }

  async function logout() {
    await db().auth.signOut();
    session = null;
    showPanel('login');
  }

  async function fetchReviews(status) {
    const { data, error } = await db()
      .from('reviews')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function updatePendingCount() {
    try {
      const pending = await fetchReviews('pending');
      els.count.textContent = `${pending.length} ${pluralReviews(pending.length)}`;
    } catch {
      els.count.textContent = '—';
    }
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

    try {
      const status = currentTab === 'pending' ? 'pending' : 'approved';
      const reviews = await fetchReviews(status);

      if (currentTab === 'pending') {
        els.count.textContent = `${reviews.length} ${pluralReviews(reviews.length)}`;
      } else {
        await updatePendingCount();
      }

      if (!reviews.length) {
        els.list.innerHTML = '';
        els.empty.hidden = false;
        return;
      }

      els.list.innerHTML = reviews.map(renderCard).join('');
    } catch (err) {
      console.error(err);
      els.list.innerHTML = '<p class="admin__error">Ошибка загрузки. Проверь настройки Supabase.</p>';
    }
  }

  async function approveReview(id) {
    const { error } = await db().from('reviews').update({ status: 'approved' }).eq('id', id);
    if (error) throw error;
  }

  async function rejectReview(id) {
    const { error } = await db().from('reviews').update({ status: 'rejected' }).eq('id', id);
    if (error) throw error;
  }

  async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв навсегда?')) return;
    const { error } = await db().from('reviews').delete().eq('id', id);
    if (error) throw error;
  }

  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    login(
      document.getElementById('admin-email').value.trim(),
      document.getElementById('admin-password').value
    );
  });

  els.logoutBtn.addEventListener('click', logout);
  els.refreshBtn.addEventListener('click', loadReviews);

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
      alert('Не удалось выполнить действие');
    } finally {
      btn.disabled = false;
    }
  });

  init();
})();
