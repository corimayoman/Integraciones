/**
 * Company List View — Data Collection Module
 *
 * Renders the list of companies as clickable cards.
 * Shows admin panel link for users with Rol_Admin.
 *
 * Validates: Requirements 5.2, 5.6
 *
 * @module dc/company-list-view
 */

import { fetchCompanies, getCurrentUser } from '../../data/dc-api-client.js';
import { navigate } from '../router.js';
import { createSpinner, createErrorState, createEmptyState } from '../components.js';

/**
 * Render the company list view into the given container.
 * @param {HTMLElement} container - DOM container to render into
 */
export function renderCompanyListView(container) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-company-list';

  // Header row with title and optional admin link
  const header = document.createElement('div');
  header.className = 'dc-company-list__header';

  const title = document.createElement('h2');
  title.className = 'dc-company-list__title';
  title.textContent = 'Empresas';
  header.appendChild(title);

  const user = getCurrentUser();
  if (user && user.role === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = '#/data-collection/admin';
    adminLink.className = 'btn btn--secondary dc-company-list__admin-link';
    adminLink.textContent = 'Panel de Admin';
    adminLink.setAttribute('aria-label', 'Ir al panel de administración');
    header.appendChild(adminLink);
  }

  wrapper.appendChild(header);

  // Loading spinner
  const spinnerEl = createSpinner('md');
  wrapper.appendChild(spinnerEl);
  container.appendChild(wrapper);

  // Fetch companies and render
  loadCompanies(wrapper, spinnerEl);
}

/**
 * Load companies from the API and render cards.
 * @param {HTMLElement} wrapper
 * @param {HTMLElement} spinnerEl
 */
async function loadCompanies(wrapper, spinnerEl) {
  try {
    const result = await fetchCompanies();
    spinnerEl.remove();

    if (!result.ok) {
      const error = createErrorState(
        result.error || 'Error al cargar empresas.',
        () => {
          wrapper.textContent = '';
          const header = buildHeader();
          wrapper.appendChild(header);
          const newSpinner = createSpinner('md');
          wrapper.appendChild(newSpinner);
          loadCompanies(wrapper, newSpinner);
        }
      );
      wrapper.appendChild(error);
      return;
    }

    const companies = result.data;
    if (!companies || companies.length === 0) {
      wrapper.appendChild(createEmptyState('No hay empresas asignadas.'));
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'dc-company-list__grid';
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-label', 'Lista de empresas');

    for (const company of companies) {
      const card = buildCompanyCard(company);
      grid.appendChild(card);
    }

    wrapper.appendChild(grid);
  } catch {
    spinnerEl.remove();
    const error = createErrorState('Error de conexión al cargar empresas.');
    wrapper.appendChild(error);
  }
}

/**
 * Build a clickable company card.
 * @param {{ id: number, name: string }} company
 * @returns {HTMLElement}
 */
function buildCompanyCard(company) {
  const card = document.createElement('div');
  card.className = 'card dc-company-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Empresa: ${company.name}`);

  const name = document.createElement('span');
  name.className = 'dc-company-card__name';
  name.textContent = company.name;
  card.appendChild(name);

  function goToCompany() {
    navigate(`#/data-collection/${company.id}`);
  }

  card.addEventListener('click', goToCompany);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToCompany();
    }
  });

  return card;
}

/**
 * Build the header section (used for retry).
 * @returns {HTMLElement}
 */
function buildHeader() {
  const header = document.createElement('div');
  header.className = 'dc-company-list__header';

  const title = document.createElement('h2');
  title.className = 'dc-company-list__title';
  title.textContent = 'Empresas';
  header.appendChild(title);

  const user = getCurrentUser();
  if (user && user.role === 'admin') {
    const adminLink = document.createElement('a');
    adminLink.href = '#/data-collection/admin';
    adminLink.className = 'btn btn--secondary dc-company-list__admin-link';
    adminLink.textContent = 'Panel de Admin';
    adminLink.setAttribute('aria-label', 'Ir al panel de administración');
    header.appendChild(adminLink);
  }

  return header;
}
