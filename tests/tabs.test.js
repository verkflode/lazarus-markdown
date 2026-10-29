import { describe, it, expect } from 'vitest';
import { createTabs } from '../src/renderer/src/tabs.js';

function makeTabs(overrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const calls = { adds: [], closes: [] };
  const tabs = createTabs(container, {
    onSwitch: () => {},
    canClose: () => true,
    onAdd: (t) => calls.adds.push(t.id),
    onClose: (t) => calls.closes.push(t.id),
    ...overrides,
  });
  return { tabs, calls, container };
}

describe('tabs', () => {
  it('gives untitled tabs distinct names', () => {
    const { tabs } = makeTabs();
    const a = tabs.add({});
    const b = tabs.add({});
    tabs.add({ path: '/x.md', name: 'x.md', content: '' });
    const d = tabs.add({});
    expect(a.name).toBe('Untitled');
    expect(b.name).toBe('Untitled 2');
    expect(d.name).toBe('Untitled 3');
  });

  it('awaits canClose before closing and reports onAdd/onClose', async () => {
    const { tabs, calls } = makeTabs({ canClose: async (t) => !t.dirty });
    const a = tabs.add({});
    const b = tabs.add({});
    b.dirty = true;
    expect(await tabs.close(b.id)).toBe(false);
    expect(tabs.list()).toHaveLength(2);
    expect(await tabs.close(a.id)).toBe(true);
    expect(calls.closes).toEqual([a.id]);
    expect(calls.adds).toEqual([a.id, b.id]);
  });

  it('marks externally-changed tabs in the strip', () => {
    const { tabs, container } = makeTabs();
    const tab = tabs.add({ path: '/x.md', name: 'x.md' });
    tab.externalChange = true;
    tabs.render();
    expect(container.querySelector('.tab.external')).toBeTruthy();
  });

  it('orchestrator opens a fresh tab when the last one closes', async () => {
    let tabs;
    const container = document.createElement('div');
    document.body.appendChild(container);
    tabs = createTabs(container, {
      onSwitch: (oldTab, newTab) => {
        if (!newTab) tabs.add({}); // same contract the orchestrator implements
      },
      canClose: () => true,
    });
    const a = tabs.add({});
    expect(await tabs.close(a.id)).toBe(true);
    expect(tabs.list()).toHaveLength(1);
    expect(tabs.active().name).toBe('Untitled'); // strip is empty again, so numbering restarts
  });
});
