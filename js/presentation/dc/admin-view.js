/**
 * Admin View — Data Collection Module (Redesigned)
 *
 * Company-centric admin panel. Each company expands to show assigned users.
 * Users section with inline modals (no window.prompt/confirm).
 * Import CSV section integrated.
 *
 * @module dc/admin-view
 */

import {
  fetchUsers, createUser, updateUser,
  fetchAssignments, createAssignment, deleteAssignment,
  fetchCompanies, createCompany, deleteCompany, getCurrentUser,
} from '../../data/dc-api-client.js';
import { createSpinner, createErrorState, createEmptyState } from '../components.js';
import { renderImportView } from './import-view.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let usersCache = null;
let companiesCache = null;
/** Map<companyId, assignment[]> */
let assignmentsByCompany = new Map();
/** @type {number|null} Company ID currently expanded */
let expandedCompanyId = null;
/** @type {'companies'|'users'|'import'} */
let activeTab = 'companies';
/** @type {HTMLElement|null} Currently open modal */
let openModal = null;

/* ------------------------------------------------------------------ */
/*  Main render                                                        */
/* ------------------------------------------------------------------ */

export function renderAdminView(container) {
  container.textContent = '';
  usersCache = null;
  companiesCache = null;
  assignmentsByCompany = new Map();
  expandedCompanyId = null;
  activeTab = 'companies';
  openModal = null;

  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    container.appendChild(createErrorState('Acceso denegado. Solo administradores.'));
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-admin';

  // Header
  const header = document.createElement('div');
  header.className = 'dc-admin__header';

  const backLink = document.createElement('a');
  backLink.href = '#/data-collection';
  backLink.className = 'btn btn--secondary btn--sm';
  backLink.textContent = '← Empresas';
  backLink.setAttribute('aria-label', 'Volver a lista de empresas');
  header.appendChild(backLink);

  const title = document.createElement('h2');
  title.className = 'dc-admin__title';
  title.textContent = 'Panel de Administración';
  header.appendChild(title);

  wrapper.appendChild(header);

  // Tabs
  wrapper.appendChild(buildTabs());

  // Content area
  const content = document.createElement('div');
  content.id = 'dc-admin-content';
  wrapper.appendChild(content);

  const spinner = createSpinner('md');
  content.appendChild(spinner);
  container.appendChild(wrapper);

  loadAdminData(content, spinner);
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function buildTabs() {
  const nav = document.createElement('nav');
  nav.className = 'dc-admin__tabs';
  nav.setAttribute('role', 'tablist');

  const tabs = [
    { id: 'companies', label: 'Empresas', icon: '🏢' },
    { id: 'users', label: 'Usuarios', icon: '👤' },
    { id: 'import', label: 'Importar CSV', icon: '📥' },
  ];

  for (const t of tabs) {
    const btn = document.createElement('button');
    btn.className = `dc-admin__tab${activeTab === t.id ? ' dc-admin__tab--active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', activeTab === t.id ? 'true' : 'false');
    btn.dataset.tab = t.id;
    btn.textContent = `${t.icon} ${t.label}`;
    btn.addEventListener('click', () => {
      activeTab = t.id;
      // Update tab styles
      nav.querySelectorAll('.dc-admin__tab').forEach(b => {
        b.classList.toggle('dc-admin__tab--active', b.dataset.tab === t.id);
        b.setAttribute('aria-selected', b.dataset.tab === t.id ? 'true' : 'false');
      });
      renderActiveTab();
    });
    nav.appendChild(btn);
  }

  return nav;
}

/* ------------------------------------------------------------------ */
/*  Data loading                                                       */
/* ------------------------------------------------------------------ */

async function loadAdminData(content, spinner) {
  try {
    const [usersResult, companiesResult] = await Promise.all([
      fetchUsers(),
      fetchCompanies(),
    ]);
    spinner.remove();

    if (!usersResult.ok) {
      content.appendChild(createErrorState(
        usersResult.error || 'Error al cargar usuarios.',
        () => renderAdminView(content.parentElement)
      ));
      return;
    }

    usersCache = usersResult.data || [];
    companiesCache = companiesResult.ok ? (companiesResult.data || []) : [];

    // Preload assignments for all users
    await loadAllAssignments();

    renderActiveTab();
  } catch {
    spinner.remove();
    content.appendChild(createErrorState('Error de conexión.'));
  }
}

async function loadAllAssignments() {
  assignmentsByCompany = new Map();
  const promises = (usersCache || []).map(async (user) => {
    try {
      const r = await fetchAssignments(user.id);
      if (r.ok) {
        for (const a of (r.data || [])) {
          const cid = a.company_id;
          if (!assignmentsByCompany.has(cid)) assignmentsByCompany.set(cid, []);
          assignmentsByCompany.get(cid).push({ ...a, user_name: user.name, user_id: user.id, user_active: user.active });
        }
      }
    } catch { /* silent */ }
  });
  await Promise.all(promises);
}

function renderActiveTab() {
  const content = document.getElementById('dc-admin-content');
  if (!content) return;
  content.textContent = '';

  if (activeTab === 'companies') renderCompaniesTab(content);
  else if (activeTab === 'users') renderUsersTab(content);
  else if (activeTab === 'import') renderImportTab(content);
}

/* ------------------------------------------------------------------ */
/*  Companies Tab (company-centric view)                               */
/* ------------------------------------------------------------------ */

function renderCompaniesTab(container) {
  // Create company form
  container.appendChild(buildCreateCompanyForm());

  if (!companiesCache || companiesCache.length === 0) {
    container.appendChild(createEmptyState('No hay empresas registradas.'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'dc-admin__company-grid';

  for (const company of companiesCache) {
    grid.appendChild(buildCompanyCard(company));
  }
  container.appendChild(grid);
}

function buildCompanyCard(company) {
  const card = document.createElement('div');
  card.className = `dc-admin__company-card${expandedCompanyId === company.id ? ' dc-admin__company-card--expanded' : ''}`;

  // Card header (clickable to expand)
  const header = document.createElement('div');
  header.className = 'dc-admin__company-card-header';
  header.addEventListener('click', () => {
    expandedCompanyId = expandedCompanyId === company.id ? null : company.id;
    renderActiveTab();
  });

  const icon = document.createElement('span');
  icon.className = 'dc-admin__company-icon';
  icon.textContent = '🏢';
  header.appendChild(icon);

  const info = document.createElement('div');
  info.className = 'dc-admin__company-info';

  const name = document.createElement('span');
  name.className = 'dc-admin__company-name';
  name.textContent = company.name;
  info.appendChild(name);

  const assignments = assignmentsByCompany.get(company.id) || [];
  const count = document.createElement('span');
  count.className = 'dc-admin__company-user-count';
  count.textContent = `${assignments.length} usuario${assignments.length !== 1 ? 's' : ''}`;
  info.appendChild(count);

  header.appendChild(info);

  const arrow = document.createElement('span');
  arrow.className = 'dc-admin__company-arrow';
  arrow.textContent = expandedCompanyId === company.id ? '▾' : '▸';
  header.appendChild(arrow);

  card.appendChild(header);

  // Expanded content
  if (expandedCompanyId === company.id) {
    const body = document.createElement('div');
    body.className = 'dc-admin__company-body';

    // Assigned users list
    if (assignments.length > 0) {
      const list = document.createElement('div');
      list.className = 'dc-admin__assigned-users';

      for (const a of assignments) {
        const row = document.createElement('div');
        row.className = 'dc-admin__assigned-user';

        const userInfo = document.createElement('div');
        userInfo.className = 'dc-admin__assigned-user-info';

        const userName = document.createElement('span');
        userName.className = 'dc-admin__assigned-user-name';
        userName.textContent = a.user_name || `Usuario #${a.user_id}`;
        userInfo.appendChild(userName);

        const roleBadge = document.createElement('span');
        roleBadge.className = `dc-admin__role-badge dc-admin__role-badge--${a.role}`;
        roleBadge.textContent = a.role === 'empresa' ? '🏢 Empresa' : '🌐 Globant';
        userInfo.appendChild(roleBadge);

        if (a.user_active === 0) {
          const inactiveBadge = document.createElement('span');
          inactiveBadge.className = 'dc-admin__user-status dc-admin__user-status--inactive';
          inactiveBadge.textContent = 'Inactivo';
          userInfo.appendChild(inactiveBadge);
        }

        row.appendChild(userInfo);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn--danger btn--sm';
        removeBtn.textContent = '✕';
        removeBtn.title = `Quitar ${a.user_name} de ${company.name}`;
        removeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          showConfirmModal(
            `¿Quitar a "${a.user_name}" de "${company.name}"?`,
            async () => {
              const r = await deleteAssignment(a.id);
              if (r.ok) { await reloadAll(); }
              else showToast(r.error || 'Error al quitar asignación.', 'error');
            }
          );
        });
        row.appendChild(removeBtn);
        list.appendChild(row);
      }
      body.appendChild(list);
    } else {
      const empty = document.createElement('p');
      empty.className = 'dc-admin__empty-text';
      empty.textContent = 'Sin usuarios asignados.';
      body.appendChild(empty);
    }

    // Add user form
    body.appendChild(buildAddUserToCompanyForm(company));

    // Delete company button
    const dangerZone = document.createElement('div');
    dangerZone.className = 'dc-admin__danger-zone';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn--danger btn--sm';
    deleteBtn.textContent = '🗑 Eliminar empresa';
    deleteBtn.addEventListener('click', () => {
      showConfirmModal(
        `¿Eliminar "${company.name}" y todos sus datos? Esta acción no se puede deshacer.`,
        async () => {
          const r = await deleteCompany(company.id);
          if (r.ok) { expandedCompanyId = null; await reloadAll(); }
          else showToast(r.error || 'Error al eliminar.', 'error');
        }
      );
    });
    dangerZone.appendChild(deleteBtn);
    body.appendChild(dangerZone);

    card.appendChild(body);
  }

  return card;
}

function buildAddUserToCompanyForm(company) {
  const form = document.createElement('form');
  form.className = 'dc-admin__add-user-form';

  const label = document.createElement('span');
  label.className = 'dc-admin__add-user-label';
  label.textContent = '+ Agregar usuario';
  form.appendChild(label);

  const userSelect = document.createElement('select');
  userSelect.className = 'dc-admin__select';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Seleccionar usuario...';
  userSelect.appendChild(defaultOpt);

  const currentAssignments = assignmentsByCompany.get(company.id) || [];
  const assignedUserIds = new Set(currentAssignments.map(a => a.user_id));

  for (const u of (usersCache || [])) {
    if (assignedUserIds.has(u.id)) continue;
    if (!u.active) continue;
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    userSelect.appendChild(opt);
  }
  form.appendChild(userSelect);

  const roleSelect = document.createElement('select');
  roleSelect.className = 'dc-admin__select';
  for (const [val, lbl] of [['empresa', 'Rol: Empresa'], ['globant', 'Rol: Globant']]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = lbl;
    roleSelect.appendChild(opt);
  }
  form.appendChild(roleSelect);

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'btn btn--primary btn--sm';
  btn.textContent = 'Asignar';
  form.appendChild(btn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = Number(userSelect.value);
    if (!userId) return;
    btn.disabled = true;
    try {
      const r = await createAssignment({ userId, companyId: company.id, role: roleSelect.value });
      if (r.ok) { await reloadAll(); }
      else showToast(r.error || 'Error al asignar.', 'error');
    } catch { showToast('Error de conexión.', 'error'); }
    finally { btn.disabled = false; }
  });

  return form;
}

function buildCreateCompanyForm() {
  const form = document.createElement('form');
  form.className = 'dc-admin__create-company-form';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'dc-admin__input';
  input.placeholder = 'Nombre de la nueva empresa...';
  input.required = true;
  form.appendChild(input);

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'btn btn--primary btn--sm';
  btn.textContent = '+ Crear Empresa';
  form.appendChild(btn);

  const errorEl = document.createElement('p');
  errorEl.className = 'dc-admin__form-error';
  errorEl.style.display = 'none';
  form.appendChild(errorEl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const name = input.value.trim();
    if (!name) { errorEl.textContent = 'Ingrese un nombre.'; errorEl.style.display = ''; return; }
    btn.disabled = true;
    try {
      const result = await createCompany({ name });
      if (result.ok) { input.value = ''; await reloadAll(); }
      else { errorEl.textContent = result.error || 'Error.'; errorEl.style.display = ''; }
    } catch { errorEl.textContent = 'Error de conexión.'; errorEl.style.display = ''; }
    finally { btn.disabled = false; }
  });
  return form;
}

/* ------------------------------------------------------------------ */
/*  Users Tab                                                          */
/* ------------------------------------------------------------------ */

function renderUsersTab(container) {
  container.appendChild(buildCreateUserForm());

  if (!usersCache || usersCache.length === 0) {
    container.appendChild(createEmptyState('No hay usuarios registrados.'));
    return;
  }

  const list = document.createElement('div');
  list.className = 'dc-admin__user-list';

  for (const user of usersCache) {
    list.appendChild(buildUserCard(user));
  }
  container.appendChild(list);
}

function buildUserCard(user) {
  const card = document.createElement('div');
  card.className = 'dc-admin__user-card';

  const header = document.createElement('div');
  header.className = 'dc-admin__user-card-header';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'dc-admin__user-name';
  nameSpan.textContent = user.name;
  header.appendChild(nameSpan);

  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'dc-admin__user-username';
  usernameSpan.textContent = `@${user.username}`;
  header.appendChild(usernameSpan);

  const statusBadge = document.createElement('span');
  statusBadge.className = `dc-admin__user-status dc-admin__user-status--${user.active ? 'active' : 'inactive'}`;
  statusBadge.textContent = user.active ? 'Activo' : 'Inactivo';
  header.appendChild(statusBadge);

  // Role badge
  if (user.role === 'admin') {
    const adminBadge = document.createElement('span');
    adminBadge.className = 'dc-admin__role-badge dc-admin__role-badge--admin';
    adminBadge.textContent = '⚙ Admin';
    header.appendChild(adminBadge);
  }

  const spacer = document.createElement('span');
  spacer.style.flex = '1';
  header.appendChild(spacer);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'dc-admin__user-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn--secondary btn--sm';
  editBtn.textContent = '✎ Editar';
  editBtn.addEventListener('click', () => showEditUserModal(user));
  actions.appendChild(editBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn--secondary btn--sm';
  resetBtn.textContent = '🔑 Contraseña';
  resetBtn.addEventListener('click', () => showResetPasswordModal(user));
  actions.appendChild(resetBtn);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = `btn btn--sm ${user.active ? 'btn--danger' : 'btn--primary'}`;
  toggleBtn.textContent = user.active ? 'Desactivar' : 'Activar';
  toggleBtn.addEventListener('click', () => {
    const action = user.active ? 'desactivar' : 'activar';
    showConfirmModal(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${user.name}"?`,
      async () => {
        const r = await updateUser(user.id, { active: user.active ? 0 : 1 });
        if (r.ok) await reloadAll();
        else showToast(r.error || 'Error.', 'error');
      }
    );
  });
  actions.appendChild(toggleBtn);

  header.appendChild(actions);
  card.appendChild(header);

  // Show assigned companies
  const companyAssignments = [];
  for (const [cid, assigns] of assignmentsByCompany) {
    for (const a of assigns) {
      if (a.user_id === user.id) {
        const company = companiesCache.find(c => c.id === cid);
        companyAssignments.push({ ...a, company_name: company?.name || `#${cid}` });
      }
    }
  }

  if (companyAssignments.length > 0) {
    const chips = document.createElement('div');
    chips.className = 'dc-admin__user-companies';
    for (const a of companyAssignments) {
      const chip = document.createElement('span');
      chip.className = `dc-admin__company-chip dc-admin__company-chip--${a.role}`;
      chip.textContent = `${a.company_name} (${a.role})`;
      chips.appendChild(chip);
    }
    card.appendChild(chips);
  }

  return card;
}

function buildCreateUserForm() {
  const wrapper = document.createElement('div');
  wrapper.className = 'dc-admin__create-form';

  const formTitle = document.createElement('h4');
  formTitle.className = 'dc-admin__form-title';
  formTitle.textContent = 'Nuevo Usuario';
  wrapper.appendChild(formTitle);

  const form = document.createElement('form');
  form.className = 'dc-admin__create-user-fields';

  const errorEl = document.createElement('p');
  errorEl.className = 'dc-admin__form-error';
  errorEl.setAttribute('role', 'alert');
  errorEl.style.display = 'none';
  form.appendChild(errorEl);

  const nameInput = createFormField(form, 'dc-new-name', 'Nombre', 'text');
  const usernameInput = createFormField(form, 'dc-new-username', 'Usuario', 'text');
  const passwordInput = createFormField(form, 'dc-new-password', 'Contraseña', 'password');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn--primary btn--sm';
  submitBtn.textContent = 'Crear Usuario';
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const name = nameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!name || !username || !password) {
      errorEl.textContent = 'Todos los campos son requeridos.';
      errorEl.style.display = '';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';
    try {
      const result = await createUser({ name, username, password });
      if (result.ok) { nameInput.value = ''; usernameInput.value = ''; passwordInput.value = ''; await reloadAll(); }
      else { errorEl.textContent = result.error || 'Error.'; errorEl.style.display = ''; }
    } catch { errorEl.textContent = 'Error de conexión.'; errorEl.style.display = ''; }
    finally { submitBtn.disabled = false; submitBtn.textContent = 'Crear Usuario'; }
  });

  wrapper.appendChild(form);
  return wrapper;
}

function createFormField(form, id, label, type) {
  const group = document.createElement('div');
  group.className = 'dc-admin__field';
  const labelEl = document.createElement('label');
  labelEl.className = 'dc-admin__label';
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;
  group.appendChild(labelEl);
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.className = 'dc-admin__input';
  input.required = true;
  group.appendChild(input);
  form.appendChild(group);
  return input;
}

/* ------------------------------------------------------------------ */
/*  Import Tab                                                         */
/* ------------------------------------------------------------------ */

function renderImportTab(container) {
  const section = document.createElement('div');
  section.className = 'dc-admin__section';
  renderImportView(section);
  container.appendChild(section);
}

/* ------------------------------------------------------------------ */
/*  Inline Modals (replace window.prompt / window.confirm)             */
/* ------------------------------------------------------------------ */

function showModal(content) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'dc-admin__modal-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  const modal = document.createElement('div');
  modal.className = 'dc-admin__modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.appendChild(content);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);
  openModal = overlay;

  // Focus first input or button
  const focusable = modal.querySelector('input, button');
  if (focusable) focusable.focus();
}

function closeModal() {
  if (openModal) {
    openModal.remove();
    openModal = null;
  }
}

function showConfirmModal(message, onConfirm) {
  const content = document.createElement('div');
  content.className = 'dc-admin__modal-content';

  const msg = document.createElement('p');
  msg.className = 'dc-admin__modal-message';
  msg.textContent = message;
  content.appendChild(msg);

  const actions = document.createElement('div');
  actions.className = 'dc-admin__modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn--secondary btn--sm';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', closeModal);
  actions.appendChild(cancelBtn);

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn--danger btn--sm';
  confirmBtn.textContent = 'Confirmar';
  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Procesando...';
    try { await onConfirm(); } catch { showToast('Error de conexión.', 'error'); }
    closeModal();
  });
  actions.appendChild(confirmBtn);

  content.appendChild(actions);
  showModal(content);
}

function showEditUserModal(user) {
  const content = document.createElement('div');
  content.className = 'dc-admin__modal-content';

  const title = document.createElement('h3');
  title.className = 'dc-admin__modal-title';
  title.textContent = `Editar: ${user.name}`;
  content.appendChild(title);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'dc-admin__input';
  input.value = user.name;
  input.placeholder = 'Nuevo nombre';
  content.appendChild(input);

  const actions = document.createElement('div');
  actions.className = 'dc-admin__modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn--secondary btn--sm';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', closeModal);
  actions.appendChild(cancelBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn--primary btn--sm';
  saveBtn.textContent = 'Guardar';
  saveBtn.addEventListener('click', async () => {
    const newName = input.value.trim();
    if (!newName || newName === user.name) { closeModal(); return; }
    saveBtn.disabled = true;
    try {
      const r = await updateUser(user.id, { name: newName });
      if (r.ok) { await reloadAll(); showToast('Nombre actualizado.', 'success'); }
      else showToast(r.error || 'Error.', 'error');
    } catch { showToast('Error de conexión.', 'error'); }
    closeModal();
  });
  actions.appendChild(saveBtn);

  content.appendChild(actions);
  showModal(content);
}

function showResetPasswordModal(user) {
  const content = document.createElement('div');
  content.className = 'dc-admin__modal-content';

  const title = document.createElement('h3');
  title.className = 'dc-admin__modal-title';
  title.textContent = `Nueva contraseña: ${user.name}`;
  content.appendChild(title);

  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'dc-admin__input';
  input.placeholder = 'Nueva contraseña';
  content.appendChild(input);

  const actions = document.createElement('div');
  actions.className = 'dc-admin__modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn--secondary btn--sm';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', closeModal);
  actions.appendChild(cancelBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn--primary btn--sm';
  saveBtn.textContent = 'Restablecer';
  saveBtn.addEventListener('click', async () => {
    const password = input.value;
    if (!password) { closeModal(); return; }
    saveBtn.disabled = true;
    try {
      const r = await updateUser(user.id, { password });
      if (r.ok) showToast('Contraseña restablecida.', 'success');
      else showToast(r.error || 'Error.', 'error');
    } catch { showToast('Error de conexión.', 'error'); }
    closeModal();
  });
  actions.appendChild(saveBtn);

  content.appendChild(actions);
  showModal(content);
}

/* ------------------------------------------------------------------ */
/*  Toast notifications                                                */
/* ------------------------------------------------------------------ */

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `dc-admin__toast dc-admin__toast--${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('dc-admin__toast--visible'));
  setTimeout(() => {
    toast.classList.remove('dc-admin__toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ------------------------------------------------------------------ */
/*  Reload helper                                                      */
/* ------------------------------------------------------------------ */

async function reloadAll() {
  try {
    const [usersResult, companiesResult] = await Promise.all([
      fetchUsers(),
      fetchCompanies(),
    ]);
    if (usersResult.ok) usersCache = usersResult.data || [];
    if (companiesResult.ok) companiesCache = companiesResult.data || [];
    await loadAllAssignments();
    renderActiveTab();
  } catch { /* silent */ }
}
