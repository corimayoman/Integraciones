/**
 * Admin View — Data Collection Module
 *
 * Panel de administración: gestión de empresas, usuarios con empresa asignada,
 * audit log de cambios e importación CSV.
 *
 * @module dc/admin-view
 */

import {
  fetchUsers, createUser, updateUser, deleteUser,
  fetchCompanies, createCompany, deleteCompany, updateCompany,
  fetchAuditLog, getCurrentUser,
} from '../../data/dc-api-client.js';
import { createSpinner, createErrorState, createEmptyState } from '../components.js';
import { renderImportView } from './import-view.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let usersCache = null;
let companiesCache = null;
/** @type {'companies'|'users'|'audit'|'import'} */
let activeTab = 'companies';
/** @type {HTMLElement|null} */
let openModal = null;

/* ------------------------------------------------------------------ */
/*  Entry point                                                        */
/* ------------------------------------------------------------------ */

export function renderAdminView(container) {
  container.textContent = '';
  usersCache = null;
  companiesCache = null;
  activeTab = 'companies';
  openModal = null;

  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    container.appendChild(createErrorState('Acceso denegado. Solo administradores.'));
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-admin';

  const header = document.createElement('div');
  header.className = 'dc-admin__header';

  const backLink = document.createElement('a');
  backLink.href = '#/data-collection';
  backLink.className = 'btn btn--secondary btn--sm';
  backLink.textContent = '← Empresas';
  header.appendChild(backLink);

  const title = document.createElement('h2');
  title.className = 'dc-admin__title';
  title.textContent = 'Panel de Administración';
  header.appendChild(title);

  wrapper.appendChild(header);
  wrapper.appendChild(buildTabs(wrapper));

  const content = document.createElement('div');
  content.id = 'dc-admin-content';
  wrapper.appendChild(content);

  const spinner = createSpinner('md');
  content.appendChild(spinner);
  container.appendChild(wrapper);

  loadData(content, spinner);
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function buildTabs(wrapper) {
  const tabs = [
    { id: 'companies', label: '🏢 Empresas' },
    { id: 'users',     label: '👤 Usuarios' },
    { id: 'audit',     label: '📋 Audit Log' },
    { id: 'import',    label: '📥 Importar CSV' },
  ];

  const nav = document.createElement('nav');
  nav.className = 'dc-admin__tabs';
  nav.setAttribute('role', 'tablist');

  for (const t of tabs) {
    const btn = document.createElement('button');
    btn.className = `dc-admin__tab${activeTab === t.id ? ' dc-admin__tab--active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', activeTab === t.id ? 'true' : 'false');
    btn.dataset.tab = t.id;
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      activeTab = t.id;
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

async function loadData(content, spinner) {
  try {
    const [usersResult, companiesResult] = await Promise.all([fetchUsers(), fetchCompanies()]);
    spinner.remove();

    if (!usersResult.ok) {
      content.appendChild(createErrorState(usersResult.error || 'Error al cargar usuarios.'));
      return;
    }

    usersCache = usersResult.data || [];
    companiesCache = companiesResult.ok ? (companiesResult.data || []) : [];
    renderActiveTab();
  } catch {
    spinner.remove();
    content.appendChild(createErrorState('Error de conexión.'));
  }
}

function renderActiveTab() {
  const content = document.getElementById('dc-admin-content');
  if (!content) return;
  content.textContent = '';

  if (activeTab === 'companies') renderCompaniesTab(content);
  else if (activeTab === 'users')  renderUsersTab(content);
  else if (activeTab === 'audit')  renderAuditTab(content);
  else if (activeTab === 'import') renderImportTab(content);
}

/* ------------------------------------------------------------------ */
/*  Companies Tab                                                      */
/* ------------------------------------------------------------------ */

function renderCompaniesTab(container) {
  container.appendChild(buildCreateCompanyForm());

  if (!companiesCache || companiesCache.length === 0) {
    container.appendChild(createEmptyState('No hay empresas registradas.'));
    return;
  }

  const list = document.createElement('div');
  list.className = 'dc-admin__company-list';

  for (const company of companiesCache) {
    const row = document.createElement('div');
    row.className = 'dc-admin__company-row';

    const name = document.createElement('span');
    name.className = 'dc-admin__company-row-name';
    name.textContent = company.name;
    row.appendChild(name);

    // Usuarios asignados a esta empresa
    const usersOfCompany = (usersCache || []).filter(u => u.company_id === company.id);
    const badge = document.createElement('span');
    badge.className = 'dc-admin__company-user-count';
    badge.textContent = `${usersOfCompany.length} usuario${usersOfCompany.length !== 1 ? 's' : ''}`;
    row.appendChild(badge);

    const spacer = document.createElement('span');
    spacer.style.flex = '1';
    row.appendChild(spacer);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn--danger btn--sm';
    deleteBtn.textContent = '🗑';
    deleteBtn.title = `Eliminar ${company.name}`;
    deleteBtn.addEventListener('click', () => {
      showConfirmModal(
        `¿Eliminar "${company.name}" y todos sus datos? Esta acción no se puede deshacer.`,
        async () => {
          const r = await deleteCompany(company.id);
          if (r.ok) { await reloadData(); }
          else showToast(r.error || 'Error al eliminar.', 'error');
        }
      );
    });
    row.appendChild(deleteBtn);
    list.appendChild(row);
  }

  container.appendChild(list);
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
      if (result.ok) { input.value = ''; await reloadData(); }
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

  const emailSpan = document.createElement('span');
  emailSpan.className = 'dc-admin__user-username';
  emailSpan.textContent = user.email;
  header.appendChild(emailSpan);

  // Empresa asignada
  const company = (companiesCache || []).find(c => c.id === user.company_id);
  const companySpan = document.createElement('span');
  companySpan.className = 'dc-admin__user-company';
  companySpan.textContent = company ? `🏢 ${company.name}` : '—';
  header.appendChild(companySpan);

  const statusBadge = document.createElement('span');
  statusBadge.className = `dc-admin__user-status dc-admin__user-status--${user.active ? 'active' : 'inactive'}`;
  statusBadge.textContent = user.active ? 'Activo' : 'Inactivo';
  header.appendChild(statusBadge);

  if (user.role === 'admin') {
    const adminBadge = document.createElement('span');
    adminBadge.className = 'dc-admin__role-badge dc-admin__role-badge--admin';
    adminBadge.textContent = '⚙ Admin';
    header.appendChild(adminBadge);
  }

  const spacer = document.createElement('span');
  spacer.style.flex = '1';
  header.appendChild(spacer);

  const actions = document.createElement('div');
  actions.className = 'dc-admin__user-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn--secondary btn--sm';
  editBtn.textContent = '✎ Editar';
  editBtn.addEventListener('click', () => showEditUserModal(user));
  actions.appendChild(editBtn);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = `btn btn--sm ${user.active ? 'btn--danger' : 'btn--primary'}`;
  toggleBtn.textContent = user.active ? 'Desactivar' : 'Activar';
  toggleBtn.addEventListener('click', () => {
    const action = user.active ? 'desactivar' : 'activar';
    showConfirmModal(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${user.name}"?`,
      async () => {
        const r = await updateUser(user.id, { active: user.active ? 0 : 1 });
        if (r.ok) await reloadData();
        else showToast(r.error || 'Error.', 'error');
      }
    );
  });
  actions.appendChild(toggleBtn);

  header.appendChild(actions);
  card.appendChild(header);
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

  const nameInput = createFormField(form, 'dc-new-name', 'Nombre completo', 'text');
  const emailInput = createFormField(form, 'dc-new-email', 'Email (@globant.com)', 'email');

  // Selector de empresa
  const companyGroup = document.createElement('div');
  companyGroup.className = 'dc-admin__field';
  const companyLabel = document.createElement('label');
  companyLabel.className = 'dc-admin__label';
  companyLabel.setAttribute('for', 'dc-new-company');
  companyLabel.textContent = 'Empresa';
  companyGroup.appendChild(companyLabel);
  const companySelect = document.createElement('select');
  companySelect.id = 'dc-new-company';
  companySelect.className = 'dc-admin__select';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '— Sin empresa asignada —';
  companySelect.appendChild(defaultOpt);
  for (const c of (companiesCache || [])) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    companySelect.appendChild(opt);
  }
  companyGroup.appendChild(companySelect);
  form.appendChild(companyGroup);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn--primary btn--sm';
  submitBtn.textContent = 'Crear Usuario';
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const companyId = companySelect.value ? Number(companySelect.value) : null;
    if (!name || !email) {
      errorEl.textContent = 'Nombre y email son requeridos.';
      errorEl.style.display = '';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';
    try {
      const result = await createUser({ name, email, companyId });
      if (result.ok) { nameInput.value = ''; emailInput.value = ''; companySelect.value = ''; await reloadData(); }
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
/*  Audit Log Tab                                                      */
/* ------------------------------------------------------------------ */

function renderAuditTab(container) {
  const section = document.createElement('div');
  section.className = 'dc-admin__audit';

  // Filtros
  const filtersRow = document.createElement('div');
  filtersRow.className = 'dc-admin__audit-filters';

  // Empresa
  const companySelect = document.createElement('select');
  companySelect.className = 'dc-admin__select';
  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = 'Todas las empresas';
  companySelect.appendChild(allOpt);
  for (const c of (companiesCache || [])) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    companySelect.appendChild(opt);
  }
  filtersRow.appendChild(companySelect);

  // Hoja
  const sheetSelect = document.createElement('select');
  sheetSelect.className = 'dc-admin__select';
  const sheets = [
    { value: '', label: 'Todas las hojas' },
    { value: 'apps', label: 'Apps' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'endpoints', label: 'Endpoints' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'it_experience', label: 'IT Experience' },
    { value: 'mst', label: 'MST' },
    { value: 'building_security', label: 'Building Security' },
  ];
  for (const s of sheets) {
    const opt = document.createElement('option');
    opt.value = s.value;
    opt.textContent = s.label;
    sheetSelect.appendChild(opt);
  }
  filtersRow.appendChild(sheetSelect);

  // Email
  const emailInput = document.createElement('input');
  emailInput.type = 'text';
  emailInput.className = 'dc-admin__input';
  emailInput.placeholder = 'Email del usuario...';
  emailInput.style.minWidth = '200px';
  filtersRow.appendChild(emailInput);

  // Desde
  const fromInput = document.createElement('input');
  fromInput.type = 'date';
  fromInput.className = 'dc-admin__input';
  fromInput.title = 'Desde';
  filtersRow.appendChild(fromInput);

  // Hasta
  const toInput = document.createElement('input');
  toInput.type = 'date';
  toInput.className = 'dc-admin__input';
  toInput.title = 'Hasta';
  filtersRow.appendChild(toInput);

  // Botón buscar
  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'btn btn--primary btn--sm';
  searchBtn.textContent = '🔍 Buscar';
  filtersRow.appendChild(searchBtn);

  section.appendChild(filtersRow);

  // Resultados
  const resultsDiv = document.createElement('div');
  resultsDiv.id = 'dc-audit-results';
  section.appendChild(resultsDiv);
  container.appendChild(section);

  // Carga inicial
  loadAuditResults(resultsDiv, {});

  searchBtn.addEventListener('click', () => {
    loadAuditResults(resultsDiv, {
      companyId: companySelect.value || undefined,
      sheetId: sheetSelect.value || undefined,
      userEmail: emailInput.value.trim() || undefined,
      from: fromInput.value || undefined,
      to: toInput.value || undefined,
    });
  });
}

async function loadAuditResults(container, filters) {
  container.textContent = '';
  const spinner = createSpinner('sm');
  container.appendChild(spinner);

  try {
    const result = await fetchAuditLog(filters);
    spinner.remove();

    if (!result.ok) {
      container.appendChild(createErrorState(result.error || 'Error al cargar el audit log.'));
      return;
    }

    const entries = result.data || [];
    if (entries.length === 0) {
      container.appendChild(createEmptyState('No hay registros para los filtros seleccionados.'));
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'dc-inventory__table-wrapper';

    const table = document.createElement('table');
    table.className = 'table dc-admin__audit-table';

    const headers = ['Fecha/Hora', 'Usuario', 'Empresa', 'Hoja', 'Acción', 'Campo', 'Valor anterior', 'Valor nuevo'];
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const h of headers) {
      const th = document.createElement('th');
      th.className = 'dc-inventory__th';
      th.textContent = h;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const entry of entries) {
      const tr = document.createElement('tr');
      tr.className = 'dc-inventory__row';

      const actionClass = entry.action === 'INSERT' ? 'audit-insert'
        : entry.action === 'DELETE' ? 'audit-delete' : 'audit-update';

      const cells = [
        new Date(entry.changed_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
        entry.user_email,
        entry.company_name || '—',
        entry.sheet_id || '—',
        entry.action,
        entry.field_name || '—',
        entry.old_value ?? '—',
        entry.new_value ?? '—',
      ];

      cells.forEach((val, i) => {
        const td = document.createElement('td');
        td.className = 'dc-inventory__td';
        if (i === 4) td.classList.add(`dc-admin__audit-action--${actionClass}`);
        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    const count = document.createElement('p');
    count.className = 'dc-admin__audit-count';
    count.textContent = `${entries.length} registro${entries.length !== 1 ? 's' : ''}`;
    container.appendChild(count);

  } catch {
    spinner.remove();
    container.appendChild(createErrorState('Error de conexión.'));
  }
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
/*  Edit User Modal                                                    */
/* ------------------------------------------------------------------ */

function showEditUserModal(user) {
  const content = document.createElement('div');
  content.className = 'dc-admin__modal-content';

  const title = document.createElement('h3');
  title.className = 'dc-admin__modal-title';
  title.textContent = `Editar: ${user.name}`;
  content.appendChild(title);

  // Nombre
  const nameGroup = document.createElement('div');
  nameGroup.className = 'dc-admin__field';
  const nameLabel = document.createElement('label');
  nameLabel.className = 'dc-admin__label';
  nameLabel.textContent = 'Nombre';
  nameGroup.appendChild(nameLabel);
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'dc-admin__input';
  nameInput.value = user.name;
  nameGroup.appendChild(nameInput);
  content.appendChild(nameGroup);

  // Empresa
  const companyGroup = document.createElement('div');
  companyGroup.className = 'dc-admin__field';
  const companyLabel = document.createElement('label');
  companyLabel.className = 'dc-admin__label';
  companyLabel.textContent = 'Empresa';
  companyGroup.appendChild(companyLabel);
  const companySelect = document.createElement('select');
  companySelect.className = 'dc-admin__select';
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = '— Sin empresa —';
  companySelect.appendChild(noneOpt);
  for (const c of (companiesCache || [])) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === user.company_id) opt.selected = true;
    companySelect.appendChild(opt);
  }
  companyGroup.appendChild(companySelect);
  content.appendChild(companyGroup);

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
    const newName = nameInput.value.trim();
    const newCompanyId = companySelect.value ? Number(companySelect.value) : null;
    if (!newName) { closeModal(); return; }
    saveBtn.disabled = true;
    try {
      const r = await updateUser(user.id, { name: newName, companyId: newCompanyId });
      if (r.ok) { await reloadData(); showToast('Usuario actualizado.', 'success'); }
      else showToast(r.error || 'Error.', 'error');
    } catch { showToast('Error de conexión.', 'error'); }
    closeModal();
  });
  actions.appendChild(saveBtn);

  content.appendChild(actions);
  showModal(content);
}

/* ------------------------------------------------------------------ */
/*  Modals                                                             */
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

  const focusable = modal.querySelector('input, button, select');
  if (focusable) focusable.focus();
}

function closeModal() {
  if (openModal) { openModal.remove(); openModal = null; }
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

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `dc-admin__toast dc-admin__toast--${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('dc-admin__toast--visible'));
  setTimeout(() => {
    toast.classList.remove('dc-admin__toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ------------------------------------------------------------------ */
/*  Reload                                                             */
/* ------------------------------------------------------------------ */

async function reloadData() {
  try {
    const [usersResult, companiesResult] = await Promise.all([fetchUsers(), fetchCompanies()]);
    if (usersResult.ok) usersCache = usersResult.data || [];
    if (companiesResult.ok) companiesCache = companiesResult.data || [];
    renderActiveTab();
  } catch { /* silent */ }
}
