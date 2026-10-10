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
      activity: legal.activity,
      iae: legal.iae,
    };

    Object.entries(map).forEach(([key, value]) => {
      if (!value) return;
      document.querySelectorAll(`[data-legal="${key}"]`).forEach((el) => {
        if (key === 'email') {
          el.innerHTML = `<a href="mailto:${value}">${value}</a>`;
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
