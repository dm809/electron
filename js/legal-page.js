(function () {
  'use strict';

  function applyLegalData() {
    const legal = typeof SITE_CONFIG !== 'undefined' ? SITE_CONFIG.legal : null;
    if (!legal) return;

    const map = {
      'business-name': legal.businessName,
      nif: legal.nif,
      address: legal.address,
      email: legal.privacyEmail,
      phone: legal.phone,
      activity: legal.activity,
      iae: legal.iae,
      'alta-date': legal.altaCensoDate,
    };

    Object.entries(map).forEach(([key, value]) => {
      if (!value) return;
      document.querySelectorAll(`[data-legal="${key}"]`).forEach((el) => {
        if (key === 'email') {
          el.innerHTML = `<a href="mailto:${value}">${value}</a>`;
        } else if (key === 'phone') {
          const digits = String(value).replace(/\D/g, '');
          const href = digits ? `tel:+${digits}` : '#';
          el.innerHTML = `<a href="${href}">${value}</a>`;
        } else {
          el.textContent = value;
        }
        el.classList.remove('placeholder');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLegalData);
  } else {
    applyLegalData();
  }
})();
