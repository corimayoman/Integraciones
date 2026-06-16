/**
 * Admin View — User access management.
 * Only accessible to Admin-role users.
 * @module admin-view
 */

import { listAllowedUsers, saveAllowedUser, deleteAllowedUser, ALL_SECTIONS, refreshCurrentUserSections, getGoogleUser } from '../firebase-auth.js';
import { t } from '../i18n.js';

export function renderAdminPanel(container) {
  container.textContent = '';

  const wrap = document.createElement('div');
  wrap.className = 'admin-view';

  const heading = document.createElement('h2');
  heading.className = 'admin-view__title';
  heading.textContent = t('admin.title');
  wrap.appendChild(heading);

  const sub = document.createElement('p');
  sub.className = 'admin-view__subtitle';
  sub.textContent = t('admin.description');
  wrap.appendChild(sub);

  // Add user form
  const formCard = document.createElement('div');
  formCard.className = 'admin-form-card';

  const formTitle = document.createElement('h3');
  formTitle.className = 'admin-form-card__title';
  formTitle.textContent = t('admin.addUser');
  formCard.appendChild(formTitle);

  const formRow = document.createElement('div');
  formRow.className = 'admin-form-row';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.placeholder = t('admin.placeholder');
  emailInput.className = 'admin-input';
  emailInput.id = 'admin-new-email';

  const roleSelect = document.createElement('select');
  roleSelect.className = 'admin-select';
  roleSelect.id = 'admin-new-role';
  for (const [val, key] of [['Viewer', 'admin.viewer'], ['Admin', 'admin.adminRole']]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = t(key);
    roleSelect.appendChild(opt);
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'admin-btn admin-btn--primary';
  addBtn.textContent = t('admin.add');

  const formMsg = document.createElement('span');
  formMsg.className = 'admin-form-msg';

  formRow.appendChild(emailInput);
  formRow.appendChild(roleSelect);
  formRow.appendChild(addBtn);
  formCard.appendChild(formRow);
  formCard.appendChild(formMsg);
  wrap.appendChild(formCard);

  // User table
  const tableCard = document.createElement('div');
  tableCard.className = 'admin-table-card';

  const tableTitle = document.createElement('h3');
  tableTitle.className = 'admin-form-card__title';
  tableTitle.textContent = t('admin.allowedUsers');
  tableCard.appendChild(tableTitle);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'admin-table-wrap';
  tableWrap.id = 'admin-users-table';
  tableCard.appendChild(tableWrap);
  wrap.appendChild(tableCard);

  container.appendChild(wrap);

  // Load users on mount
  loadUsers(tableWrap, formMsg);

  addBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim().toLowerCase();
    const role = roleSelect.value;

    formMsg.textContent = '';
    formMsg.className = 'admin-form-msg';

    if (!email.endsWith('@globant.com')) {
      formMsg.textContent = t('admin.onlyGlobant');
      formMsg.classList.add('admin-form-msg--error');
      return;
    }

    addBtn.disabled = true;
    addBtn.textContent = t('admin.saving');
    try {
      await saveAllowedUser(email, role, true);
      emailInput.value = '';
      formMsg.textContent = t('admin.added', { email, role });
      formMsg.classList.add('admin-form-msg--ok');
      await loadUsers(tableWrap, formMsg);
    } catch (err) {
      formMsg.textContent = t('admin.error', { msg: err.message });
      formMsg.classList.add('admin-form-msg--error');
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = t('admin.add');
    }
  });
}

const PAGE_SIZE = 10;

async function loadUsers(tableWrap, formMsg) {
  tableWrap.textContent = '';

  const loading = document.createElement('p');
  loading.className = 'admin-loading';
  loading.textContent = t('admin.loading');
  tableWrap.appendChild(loading);

  let allUsers;
  try {
    allUsers = await listAllowedUsers();
  } catch (err) {
    tableWrap.textContent = '';
    const errEl = document.createElement('p');
    errEl.className = 'admin-error';
    errEl.textContent = t('admin.failedLoad', { msg: err.message });
    tableWrap.appendChild(errEl);
    return;
  }

  tableWrap.textContent = '';

  // ── Search bar ──────────────────────────────────────────────────────
  let searchQuery = '';
  let currentPage = 0;

  const searchWrap = document.createElement('div');
  searchWrap.className = 'admin-search-wrap';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = t('admin.searchPlaceholder');
  searchInput.className = 'admin-input admin-search-input';
  searchInput.setAttribute('aria-label', t('admin.searchPlaceholder'));

  const searchCount = document.createElement('span');
  searchCount.className = 'admin-search-count';

  searchWrap.appendChild(searchInput);
  searchWrap.appendChild(searchCount);
  tableWrap.appendChild(searchWrap);

  // ── Table ────────────────────────────────────────────────────────────
  const table = document.createElement('table');
  table.className = 'admin-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of [t('admin.colEmail'), t('admin.colRole'), t('admin.colSections'), t('admin.colStatus'), t('admin.colAdded'), t('admin.colActions')]) {
    const th = document.createElement('th');
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  tableWrap.appendChild(table);

  // ── Pagination bar ───────────────────────────────────────────────────
  const paginationWrap = document.createElement('div');
  paginationWrap.className = 'admin-pagination';
  tableWrap.appendChild(paginationWrap);

  // ── Render logic ─────────────────────────────────────────────────────
  function getFiltered() {
    const q = searchQuery.toLowerCase().trim();
    return q ? allUsers.filter(u => u.email.toLowerCase().includes(q)) : allUsers;
  }

  function renderPage() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage >= totalPages) currentPage = totalPages - 1;
    const pageUsers = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    // Count label
    searchCount.textContent = searchQuery
      ? t('admin.searchResults', { n: filtered.length, total: allUsers.length })
      : t('admin.userCount', { n: allUsers.length });

    // Rows
    tbody.textContent = '';
    for (const user of pageUsers) {
      tbody.appendChild(buildUserRow(user, tableWrap, formMsg, renderPage));
    }

    // Pagination
    paginationWrap.textContent = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'admin-btn admin-btn--sm admin-page-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = currentPage === 0;
    prevBtn.addEventListener('click', () => { currentPage--; renderPage(); });

    const pageInfo = document.createElement('span');
    pageInfo.className = 'admin-page-info';
    pageInfo.textContent = t('admin.pageOf', { page: currentPage + 1, total: totalPages });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'admin-btn admin-btn--sm admin-page-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.addEventListener('click', () => { currentPage++; renderPage(); });

    paginationWrap.appendChild(prevBtn);
    paginationWrap.appendChild(pageInfo);
    paginationWrap.appendChild(nextBtn);
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    currentPage = 0;
    renderPage();
  });

  renderPage();
}

function buildUserRow(user, tableWrap, formMsg, onSaved) {
    const tr = document.createElement('tr');
    if (!user.active) tr.classList.add('admin-row--inactive');

    const tdEmail = document.createElement('td');
    tdEmail.className = 'admin-td';
    tdEmail.textContent = user.email;

    const tdRole = document.createElement('td');
    tdRole.className = 'admin-td';
    const roleSelect = document.createElement('select');
    roleSelect.className = 'admin-select admin-select--sm';
    for (const [val, key] of [['Viewer', 'admin.viewer'], ['Admin', 'admin.adminRole']]) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = t(key);
      if (val === user.role) opt.selected = true;
      roleSelect.appendChild(opt);
    }
    tdRole.appendChild(roleSelect);

    // Sections checkboxes
    const tdSections = document.createElement('td');
    tdSections.className = 'admin-td';
    const SECTION_LABELS = { matrix: t('nav.matrix'), compliance: t('nav.compliance'), sox: t('nav.sox') };
    const sectionChecks = {};
    const sectionsWrap = document.createElement('div');
    sectionsWrap.className = 'admin-sections';
    for (const sec of ALL_SECTIONS) {
      const label = document.createElement('label');
      label.className = 'admin-section-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = sec;
      cb.className = 'admin-section-cb';
      // null sections = all access; checked if null or included
      cb.checked = !user.sections || user.sections.includes(sec);
      sectionChecks[sec] = cb;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + (SECTION_LABELS[sec] || sec)));
      sectionsWrap.appendChild(label);
    }
    // If role is Admin, disable (admins always see everything)
    const updateSectionDisable = () => {
      const isAdm = roleSelect.value === 'Admin';
      Object.values(sectionChecks).forEach(cb => {
        cb.disabled = isAdm;
        if (isAdm) cb.checked = true;
      });
    };
    roleSelect.addEventListener('change', updateSectionDisable);
    updateSectionDisable();
    tdSections.appendChild(sectionsWrap);

    const tdStatus = document.createElement('td');
    tdStatus.className = 'admin-td';
    const statusBadge = document.createElement('span');
    statusBadge.className = `admin-badge admin-badge--${user.active ? 'active' : 'inactive'}`;
    statusBadge.textContent = user.active ? t('admin.active') : t('admin.inactive');
    tdStatus.appendChild(statusBadge);

    const tdAdded = document.createElement('td');
    tdAdded.className = 'admin-td admin-td--meta';
    tdAdded.textContent = user.addedAt ?? '—';

    const tdActions = document.createElement('td');
    tdActions.className = 'admin-td admin-td--actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'admin-btn admin-btn--sm';
    saveBtn.textContent = t('common.save');
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      try {
        const role = roleSelect.value;
        // null sections = full access (Admin or all boxes checked)
        const checked = ALL_SECTIONS.filter(s => sectionChecks[s].checked);
        const sections = (role === 'Admin' || checked.length === ALL_SECTIONS.length)
          ? null
          : checked;
        await saveAllowedUser(user.email, role, user.active, sections);

        // If the saved user is the currently logged-in user, refresh in-memory state
        // and trigger a nav re-render so section visibility updates immediately.
        if (user.email === getGoogleUser()?.email?.toLowerCase()) {
          await refreshCurrentUserSections();
          window.dispatchEvent(new CustomEvent('ams:sections-changed'));
        }

        saveBtn.textContent = '✓';
        setTimeout(() => { saveBtn.textContent = t('common.save'); saveBtn.disabled = false; }, 1500);
      } catch (err) {
        saveBtn.textContent = t('common.error');
        setTimeout(() => { saveBtn.textContent = t('common.save'); saveBtn.disabled = false; }, 2000);
      }
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = `admin-btn admin-btn--sm admin-btn--${user.active ? 'warn' : 'ok'}`;
    toggleBtn.textContent = user.active ? t('admin.deactivate') : t('admin.activate');
    toggleBtn.addEventListener('click', async () => {
      toggleBtn.disabled = true;
      try {
        await saveAllowedUser(user.email, roleSelect.value, !user.active);
        await loadUsers(tableWrap, formMsg);
      } catch {
        toggleBtn.disabled = false;
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'admin-btn admin-btn--sm admin-btn--danger';
    deleteBtn.textContent = t('admin.delete');
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(t('admin.confirmDelete', { email: user.email }))) return;
      deleteBtn.disabled = true;
      try {
        await deleteAllowedUser(user.key);
        await loadUsers(tableWrap, formMsg);
      } catch {
        deleteBtn.disabled = false;
      }
    });

    const actionsDiv = document.createElement('div');
    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(toggleBtn);
    actionsDiv.appendChild(deleteBtn);
    tdActions.appendChild(actionsDiv);

    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdSections);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAdded);
    tr.appendChild(tdActions);
    return tr;
}
