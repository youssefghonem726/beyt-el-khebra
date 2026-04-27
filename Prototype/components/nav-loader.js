 /**
 * Bayt El Khebra — Navbar Loader
 * Injects role-based navigation and highlights the active page.
 */
(function () {
  const sidebars = document.querySelectorAll('aside.sidebar[data-nav]');
  if (!sidebars.length) return;

  // Get current page filename (e.g. "index.html" or "manager-orders.html")
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  sidebars.forEach(function (sidebar) {
    const role = sidebar.getAttribute('data-nav');
    if (!NAVS || !NAVS[role]) return;

    // Build nav element
    const nav = document.createElement('nav');
    nav.innerHTML = NAVS[role];

    // Highlight active link
    nav.querySelectorAll('a.nav-link').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkPage = href.split('/').pop();
      if (linkPage === currentPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Replace existing <nav> if present, otherwise append
    const existingNav = sidebar.querySelector('nav');
    if (existingNav) {
      sidebar.replaceChild(nav, existingNav);
    } else {
      sidebar.appendChild(nav);
    }
  });

  function initSearchFilters() {
    document.querySelectorAll('input[type="search"]').forEach(function (input) {
      const container = input.closest('.search-container') || input.parentElement;
      if (!container) return;

      let filterIcon = container.querySelector('.filter-icon');
      if (!filterIcon) {
        filterIcon = document.createElement('button');
        filterIcon.type = 'button';
        filterIcon.className = 'filter-icon';
        filterIcon.textContent = '🔽';
        container.appendChild(filterIcon);
      }

      const dropdown = container.querySelector('.filter-dropdown');
      if (!dropdown) {
        const newDropdown = document.createElement('div');
        newDropdown.className = 'filter-dropdown';
        newDropdown.innerHTML = `
          <div class="field">
            <label>Status</label>
            <select class="select">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Pending</option>
            </select>
          </div>
          <button class="btn primary" type="button">Apply Filters</button>
        `;
        container.appendChild(newDropdown);
      }

      const dropdownEl = container.querySelector('.filter-dropdown');
      const applyBtn = dropdownEl ? dropdownEl.querySelector('.btn.primary') : null;
      const select = dropdownEl ? dropdownEl.querySelector('select') : null;

      // Toggle dropdown
      filterIcon.addEventListener('click', function (e) {
        e.preventDefault();
        dropdownEl.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function (e) {
        if (!container.contains(e.target)) {
          dropdownEl.classList.remove('show');
        }
      });

      const getFilterValues = function () {
        const query = input.value.trim().toLowerCase();
        const status = select ? select.value.trim().toLowerCase() : '';
        return { query, status };
      };

      const findTarget = function () {
        const region = input.closest('section, main, body');
        if (!region) return null;
        return region.querySelector('table, .client-grid, .job-cards, .order-grid, .card-grid, .table-wrap');
      };

      const showNoResults = function (container) {
        if (!container) return;
        let noResults = container.querySelector('.no-results');
        if (!noResults) {
          noResults = document.createElement('div');
          noResults.className = 'no-results';
          noResults.textContent = 'No matching results';
          if (container.matches('table') && container.parentElement) {
            container.parentElement.appendChild(noResults);
          } else {
            container.appendChild(noResults);
          }
        }
      };

      const hideNoResults = function (container) {
        if (!container) return;
        const noResults = container.querySelector('.no-results');
        if (noResults) noResults.remove();
      };

      const applyFilter = function () {
        const filter = getFilterValues();
        const target = findTarget();
        if (!target) return;

        let items = [];
        if (target.matches('table')) {
          items = Array.from(target.querySelectorAll('tbody tr'));
        } else if (target.querySelectorAll('tbody tr').length > 0) {
          items = Array.from(target.querySelectorAll('tbody tr'));
        } else if (target.querySelectorAll('a.client-card-link, .card, .client-card, .order-card').length > 0) {
          items = Array.from(target.querySelectorAll('a.client-card-link, .card, .client-card, .order-card'));
        } else if (target.querySelectorAll('.card').length > 0) {
          items = Array.from(target.querySelectorAll('.card'));
        } else {
          items = Array.from(target.children);
        }

        let visibleCount = 0;
        items.forEach(function (item) {
          const text = item.textContent.toLowerCase();
          const queryMatch = !filter.query || text.indexOf(filter.query) !== -1;
          const statusMatch = !filter.status || /^all/i.test(filter.status) || text.indexOf(filter.status) !== -1;
          const show = queryMatch && statusMatch;
          item.style.display = show ? '' : 'none';
          if (show) visibleCount += 1;
        });

        if (visibleCount === 0) {
          showNoResults(target);
        } else {
          hideNoResults(target);
        }
      };

      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          applyFilter();
          dropdownEl.classList.remove('show');
        });
      }

      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          applyFilter();
        }
      });
    });
  }

  initSearchFilters();
})();

