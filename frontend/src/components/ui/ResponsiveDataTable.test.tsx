import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ResponsiveDataTable, DataColumn } from './ResponsiveDataTable';

interface Row {
  id: string;
  date: string;
  marker: string;
  value: string;
  source: string;
}

const rows: Row[] = [
  { id: 'a', date: '18/08/2026', marker: 'ApoB', value: '62 mg/dL', source: 'Laudo' },
  { id: 'b', date: '17/08/2026', marker: 'HbA1c', value: '5.1 %', source: 'Importado' },
];

const columns: DataColumn<Row>[] = [
  { key: 'date', header: 'Data', priority: 'primary', render: (r) => r.date },
  { key: 'marker', header: 'Biomarcador', render: (r) => r.marker },
  { key: 'value', header: 'Valor', render: (r) => r.value },
  { key: 'source', header: 'Fonte', priority: 'detail', render: (r) => r.source },
  {
    key: 'actions',
    header: 'Ações',
    priority: 'action',
    align: 'right',
    render: (r) => <button type="button">Abrir {r.marker}</button>,
  },
];

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('ResponsiveDataTable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a semantic table with caption and scoped headers on desktop (default without matchMedia)', () => {
    render(
      <ResponsiveDataTable caption="Exames do paciente" columns={columns} rows={rows} getRowKey={(r) => r.id} />,
    );

    const table = screen.getByRole('table', { name: 'Exames do paciente' });
    const colHeaders = within(table).getAllByRole('columnheader');
    expect(colHeaders).toHaveLength(5);
    colHeaders.forEach((th) => expect(th).toHaveAttribute('scope', 'col'));

    const rowHeaders = within(table).getAllByRole('rowheader');
    expect(rowHeaders.map((h) => h.textContent)).toEqual(['18/08/2026', '17/08/2026']);
    rowHeaders.forEach((th) => expect(th).toHaveAttribute('scope', 'row'));

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders Row Cards with the same data on mobile and no table', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <ResponsiveDataTable
        caption="Exames do paciente"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        getRowLabel={(r) => `${r.marker} em ${r.date}`}
      />,
    );

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Exames do paciente' });
    const cards = within(list).getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAccessibleName('ApoB em 18/08/2026');

    // Campos prioritários visíveis com rótulo
    const first = within(cards[0]);
    expect(first.getByText('18/08/2026')).toBeInTheDocument();
    expect(first.getByText('Biomarcador')).toBeInTheDocument();
    expect(first.getByText('62 mg/dL')).toBeInTheDocument();

    // Colunas `detail` não somem: ficam em disclosure
    const summary = first.getByText('Mais detalhes (1)');
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(first.getByText('Laudo')).toBeInTheDocument();

    // Ações no rodapé do card
    expect(first.getByRole('button', { name: 'Abrir ApoB' })).toBeInTheDocument();
  });

  it('invokes onRowClick from both layouts but not from action cells', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(
      <ResponsiveDataTable
        caption="Exames"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        onRowClick={onRowClick}
        layout="table"
      />,
    );

    await user.click(screen.getByText('HbA1c'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);

    onRowClick.mockClear();
    await user.click(screen.getByRole('button', { name: 'Abrir ApoB' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('honors forced cards layout regardless of viewport', () => {
    mockMatchMedia(true);
    render(
      <ResponsiveDataTable caption="Exames" columns={columns} rows={rows} getRowKey={(r) => r.id} layout="cards" />,
    );
    expect(screen.getByRole('list', { name: 'Exames' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('triggers onRowClick via keyboard (Enter and Space) on desktop table rows (U22-P1-31)', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(
      <ResponsiveDataTable
        caption="Exames"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        getRowLabel={(r) => `Exame ${r.marker}`}
        onRowClick={onRowClick}
        layout="table"
      />,
    );

    const clickableRows = screen.getAllByRole('button');
    // Deve haver 2 botões de ação nas células + 2 linhas com role="button"
    const tableRowButtons = clickableRows.filter((el) => el.tagName === 'TR');
    expect(tableRowButtons).toHaveLength(2);
    expect(tableRowButtons[0]).toHaveAttribute('tabindex', '0');
    expect(tableRowButtons[0]).toHaveAttribute('aria-label', 'Exame ApoB');

    // Testar ativação por Enter
    tableRowButtons[0].focus();
    expect(tableRowButtons[0]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);

    // Testar ativação por Space
    onRowClick.mockClear();
    tableRowButtons[1].focus();
    await user.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it('does not assign button role or tabIndex to rows when onRowClick is omitted', () => {
    render(
      <ResponsiveDataTable
        caption="Exames"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        layout="table"
      />,
    );

    const table = screen.getByRole('table');
    const trElements = within(table).getAllByRole('row');
    // O tr header + 2 trs de dados
    expect(trElements).toHaveLength(3);
    // Nenhuma TR deve ser role="button"
    trElements.forEach((tr) => {
      expect(tr).not.toHaveAttribute('role', 'button');
      expect(tr).not.toHaveAttribute('tabindex');
    });
  });

  it('renders an accessible button header in mobile Row Cards when onRowClick is provided', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(
      <ResponsiveDataTable
        caption="Exames"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        getRowLabel={(r) => `Exame ${r.marker}`}
        onRowClick={onRowClick}
        layout="cards"
      />,
    );

    const cardButton = screen.getByRole('button', { name: 'Exame ApoB' });
    expect(cardButton).toBeInTheDocument();
    expect(cardButton.tagName).toBe('BUTTON');

    await user.click(cardButton);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});

