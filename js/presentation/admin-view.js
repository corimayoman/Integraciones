/**
 * Admin View — User access management.
 * Only accessible to Admin-role users.
 * @module admin-view
 */

import { listAllowedUsers, saveAllowedUser, deleteAllowedUser } from '../firebase-auth.js';

export function renderAdminPanel(container) {
  container.textContent = '';

  const wrap = document.createElement('div');
  wrap.className = 'admin-view';

  const heading = document.createElement('h2');
  heading.className = 'admin-view__title';
  heading.textContent = 'User Access Management';
  wrap.appendChild(heading);

  const sub = document.createElement('p');
  sub.className = 'admin-view__subtitle';
  sub.textContent = 'Manage who can access the AMS Integration Tracker. Only @globant.com accounts are permitted.';
  wrap.appendChild(sub);

  // Add user form
  const formCard = document.createElement('div');
  formCard.className = 'admin-form-card';

  const formTitle = document.createElement('h3');
  formTitle.className = 'admin-form-card__title';
  formTitle.textContent = 'Add User';
  formCard.appendChild(formTitle);

  const formRow = document.createElement('div');
  formRow.className = 'admin-form-row';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.placeholder = 'user@globant.com';
  emailInput.className = 'admin-input';
  emailInput.id = 'admin-new-email';

  const roleSelect = document.createElement('select');
  roleSelect.className = 'admin-select';
  roleSelect.id = 'admin-new-role';
  for (const r of ['Viewer', 'Admin']) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    roleSelect.appendChild(opt);
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'admin-btn admin-btn--primary';
  addBtn.textContent = 'Add';

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
  tableTitle.textContent = 'Allowed Users';
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
      formMsg.textContent = 'Only @globant.com accounts are allowed.';
      formMsg.classList.add('admin-form-msg--error');
      return;
    }

    addBtn.disabled = true;
    addBtn.textContent = 'Saving…';
    try {
      await saveAllowedUser(email, role, true);
      emailInput.value = '';
      formMsg.textContent = `${email} added as ${role}.`;
      formMsg.classList.add('admin-form-msg--ok');
      await loadUsers(tableWrap, formMsg);
    } catch (err) {
      formMsg.textContent = `Error: ${err.message}`;
      formMsg.classList.add('admin-form-msg--error');
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = 'Add';
    }
  });
}

async function loadUsers(tableWrap, formMsg) {
  tableWrap.textContent = '';

  const loading = document.createElement('p');
  loading.className = 'admin-loading';
  loading.textContent = 'Loading…';
  tableWrap.appendChild(loading);

  let users;
  try {
    users = await listAllowedUsers();
  } catch (err) {
    tableWrap.textContent = '';
    const errEl = document.createElement('p');
    errEl.className = 'admin-error';
    errEl.textContent = `Failed to load users: ${err.message}`;
    tableWrap.appendChild(errEl);
    return;
  }

  tableWrap.textContent = '';

  const table = document.createElement('table');
  table.className = 'admin-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of ['Email', 'Role', 'Status', 'Added', 'Actions']) {
    const th = document.createElement('th');
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const user of users) {
    const tr = document.createElement('tr');
    if (!user.active) tr.classList.add('admin-row--inactive');

    const tdEmail = document.createElement('td');
    tdEmail.className = 'admin-td';
    tdEmail.textContent = user.email;

    const tdRole = document.createElement('td');
    tdRole.className = 'admin-td';
    const roleSelect = document.createElement('select');
    roleSelect.className = 'admin-select admin-select--sm';
    for (const r of ['Viewer', 'Admin']) {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      if (r === user.role) opt.selected = true;
      roleSelect.appendChild(opt);
    }
    tdRole.appendChild(roleSelect);

    const tdStatus = document.createElement('td');
    tdStatus.className = 'admin-td';
    const statusBadge = document.createElement('span');
    statusBadge.className = `admin-badge admin-badge--${user.active ? 'active' : 'inactive'}`;
    statusBadge.textContent = user.active ? 'Active' : 'Inactive';
    tdStatus.appendChild(statusBadge);

    const tdAdded = document.createElement('td');
    tdAdded.className = 'admin-td admin-td--meta';
    tdAdded.textContent = user.addedAt ?? '—';

    const tdActions = document.createElement('td');
    tdActions.className = 'admin-td admin-td--actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'admin-btn admin-btn--sm';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      try {
        await saveAllowedUser(user.email, roleSelect.value, user.active);
        saveBtn.textContent = '✓';
        setTimeout(() => { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }, 1500);
      } catch (err) {
        saveBtn.textContent = 'Error';
        setTimeout(() => { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }, 2000);
      }
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = `admin-btn admin-btn--sm admin-btn--${user.active ? 'warn' : 'ok'}`;
    toggleBtn.textContent = user.active ? 'Deactivate' : 'Activate';
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
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Remove ${user.email} from allowed users?`)) return;
      deleteBtn.disabled = true;
      try {
        await deleteAllowedUser(user.key);
        await loadUsers(tableWrap, formMsg);
      } catch {
        deleteBtn.disabled = false;
      }
    });

    tdActions.appendChild(saveBtn);
    tdActions.appendChild(toggleBtn);
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAdded);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
}
