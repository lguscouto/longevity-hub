import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useScrollActiveIntoView } from './useScrollActiveIntoView';

interface TestNavProps {
  activeTab: string;
}

const TestNav: React.FC<TestNavProps> = ({ activeTab }) => {
  const activeRef = useScrollActiveIntoView<HTMLButtonElement>({
    activeKey: activeTab,
    behavior: 'smooth',
    inline: 'nearest',
    block: 'nearest',
  });

  const tabs = ['tab-1', 'tab-2', 'tab-3'];

  return (
    <div style={{ overflowX: 'auto', display: 'flex', width: '200px' }}>
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            ref={isActive ? activeRef : undefined}
            data-testid={tab}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};

describe('useScrollActiveIntoView', () => {
  beforeEach(() => {
    // JSDOM does not implement scrollIntoView by default
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('calls scrollIntoView on the active element upon mount', () => {
    render(<TestNav activeTab="tab-1" />);

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  });

  it('calls scrollIntoView when the active key changes', () => {
    const { rerender } = render(<TestNav activeTab="tab-1" />);
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    rerender(<TestNav activeTab="tab-2" />);
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(2);

    rerender(<TestNav activeTab="tab-3" />);
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it('handles empty or missing ref gracefully without throwing', () => {
    const ComponentWithoutRef: React.FC<{ activeKey: string }> = ({ activeKey }) => {
      useScrollActiveIntoView({ activeKey });
      return <div>No element attached</div>;
    };

    expect(() => {
      const { rerender } = render(<ComponentWithoutRef activeKey="a" />);
      rerender(<ComponentWithoutRef activeKey="b" />);
    }).not.toThrow();
  });
});
