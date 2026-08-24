import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ContractEffortTornadoChart, { normalizeContractComparisonProjects } from './ContractEffortTornadoChart';
import { I18nProvider } from '../i18n/I18nProvider';

test('keeps only contract projects and sorts them by contract amount', () => {
  expect(normalizeContractComparisonProjects([
    { projectId: 2, name: 'Бета', contractAmountExVatRub: 200, lifetimeHours: 20 },
    { projectId: 1, name: 'Альфа', code: 'A1', contractAmountExVatRub: 500, lifetimeHours: 50 },
    { projectId: 3, name: 'Без договора', contractAmountExVatRub: 0, lifetimeHours: 10 },
  ])).toEqual([
    { projectId: 1, name: 'Альфа', code: 'A1', contractAmountExVatRub: 500, lifetimeHours: 50 },
    { projectId: 2, name: 'Бета', code: '', contractAmountExVatRub: 200, lifetimeHours: 20 },
  ]);
});

test('renders tornado labels and row description in English', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('locale', 'en');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<I18nProvider><ContractEffortTornadoChart projects={[{ projectId: 1, code: 'A1', name: 'Alpha', contractAmountExVatRub: 500, lifetimeHours: 20 }]} /></I18nProvider>);
  });

  expect(host.textContent).toContain('Contracts and effort');
  expect(host.textContent).toContain('Contract, RUB');
  expect(host.textContent).toContain('Effort, h');
  expect(host.querySelector('[data-contract-tornado-row="1"]').getAttribute('aria-label')).toContain('Contract:');

  act(() => root.unmount());
  host.remove();
  localStorage.setItem('locale', 'ru');
  delete window.IS_REACT_ACT_ENVIRONMENT;
});
