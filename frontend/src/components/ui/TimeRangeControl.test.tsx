import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeRangeControl, TimeRangeOption } from './TimeRangeControl';

describe('TimeRangeControl', () => {
  const options: TimeRangeOption<number>[] = [
    { value: 7, label: '7 dias', shortLabel: '7d', ariaLabel: 'Últimos 7 dias' },
    { value: 30, label: '30 dias', shortLabel: '30d', ariaLabel: 'Últimos 30 dias' },
    { value: 90, label: '90 dias', shortLabel: '90d', ariaLabel: 'Últimos 90 dias' },
  ];

  it('renders a radiogroup with all options', () => {
    render(<TimeRangeControl value={30} onChange={vi.fn()} options={options} label="Período" />);

    const group = screen.getByRole('radiogroup', { name: 'Período' });
    expect(group).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);

    // Selected option has aria-checked="true" and tabIndex=0
    const option30 = screen.getByRole('radio', { name: 'Últimos 30 dias' });
    expect(option30).toHaveAttribute('aria-checked', 'true');
    expect(option30).toHaveAttribute('tabindex', '0');

    // Unselected options have aria-checked="false" and tabIndex=-1
    const option7 = screen.getByRole('radio', { name: 'Últimos 7 dias' });
    expect(option7).toHaveAttribute('aria-checked', 'false');
    expect(option7).toHaveAttribute('tabindex', '-1');
  });

  it('fires onChange when an option is clicked', () => {
    const handleChange = vi.fn();
    render(<TimeRangeControl value={7} onChange={handleChange} options={options} />);

    const option90 = screen.getByRole('radio', { name: 'Últimos 90 dias' });
    fireEvent.click(option90);

    expect(handleChange).toHaveBeenCalledWith(90);
  });

  it('navigates with ArrowRight and ArrowLeft keys', () => {
    function Controlled() {
      const [val, setVal] = useState(7);
      return <TimeRangeControl value={val} onChange={setVal} options={options} />;
    }

    render(<Controlled />);

    const option7 = screen.getByRole('radio', { name: 'Últimos 7 dias' });
    option7.focus();

    // ArrowRight moves to 30
    fireEvent.keyDown(option7, { key: 'ArrowRight' });
    const option30 = screen.getByRole('radio', { name: 'Últimos 30 dias' });
    expect(option30).toHaveAttribute('aria-checked', 'true');

    // ArrowRight moves to 90
    fireEvent.keyDown(option30, { key: 'ArrowRight' });
    const option90 = screen.getByRole('radio', { name: 'Últimos 90 dias' });
    expect(option90).toHaveAttribute('aria-checked', 'true');

    // ArrowRight wraps to 7
    fireEvent.keyDown(option90, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Últimos 7 dias' })).toHaveAttribute('aria-checked', 'true');

    // ArrowLeft wraps back to 90
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Últimos 7 dias' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: 'Últimos 90 dias' })).toHaveAttribute('aria-checked', 'true');
  });

  it('handles Home and End keys correctly', () => {
    function Controlled() {
      const [val, setVal] = useState(30);
      return <TimeRangeControl value={val} onChange={setVal} options={options} />;
    }

    render(<Controlled />);

    const option30 = screen.getByRole('radio', { name: 'Últimos 30 dias' });
    option30.focus();

    // Home jumps to 7
    fireEvent.keyDown(option30, { key: 'Home' });
    expect(screen.getByRole('radio', { name: 'Últimos 7 dias' })).toHaveAttribute('aria-checked', 'true');

    // End jumps to 90
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Últimos 7 dias' }), { key: 'End' });
    expect(screen.getByRole('radio', { name: 'Últimos 90 dias' })).toHaveAttribute('aria-checked', 'true');
  });

  it('skips disabled options during keyboard navigation and prevents click', () => {
    const disabledOptions: TimeRangeOption<string>[] = [
      { value: '1', label: 'Opção 1' },
      { value: '2', label: 'Opção 2', disabled: true },
      { value: '3', label: 'Opção 3' },
    ];

    const handleChange = vi.fn();
    render(<TimeRangeControl value="1" onChange={handleChange} options={disabledOptions} />);

    const opt2 = screen.getByRole('radio', { name: 'Opção 2' });
    expect(opt2).toBeDisabled();

    fireEvent.click(opt2);
    expect(handleChange).not.toHaveBeenCalled();

    const opt1 = screen.getByRole('radio', { name: 'Opção 1' });
    opt1.focus();
    fireEvent.keyDown(opt1, { key: 'ArrowRight' });

    // Should skip option 2 and go straight to option 3
    expect(handleChange).toHaveBeenCalledWith('3');
  });

  it('applies indigo active color theme when specified', () => {
    render(
      <TimeRangeControl
        value={30}
        onChange={vi.fn()}
        options={options}
        activeColor="indigo"
      />
    );

    const activeRadio = screen.getByRole('radio', { name: 'Últimos 30 dias' });
    expect(activeRadio.className).toContain('bg-indigo-600');
  });
});
