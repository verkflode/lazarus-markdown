/**
 * Tab model + strip rendering. Each tab carries its own EditorState
 * (undo history, cursor, selection), scroll position, and dirty flag.
 * The orchestrator owns what happens on switch/close via callbacks.
 */
let nextId = 1;

export function createTabs(container, { onSwitch, canClose, onAdd, onClose }) {
  const tabs = [];
  let activeId = null;

  const byId = (id) => tabs.find((t) => t.id === id);
  const active = () => byId(activeId);

  function renderStrip() {
    container.innerHTML = '';
    container.classList.toggle('single', tabs.length <= 1);
    for (const tab of tabs) {
      const el = document.createElement('div');
      el.className =
        'tab' +
        (tab.id === activeId ? ' active' : '') +
        (tab.externalChange ? ' external' : '');
      el.title = tab.path || tab.name;

      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab.name;
      el.appendChild(label);

      const close = document.createElement('button');
      close.className = 'tab-close' + (tab.dirty ? ' dirty' : '');
      close.setAttribute('aria-label', `Close ${tab.name}`);
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(tab.id);
      });
      el.appendChild(close);

      el.addEventListener('click', () => activate(tab.id));
      el.addEventListener('auxclick', (event) => {
        if (event.button === 1) closeTab(tab.id);
      });
      container.appendChild(el);
    }
  }

  function activate(id) {
    if (id === activeId) return;
    const previous = active();
    activeId = id;
    onSwitch(previous, byId(id));
    renderStrip();
  }

  function add({ path = null, name = 'Untitled', content = '' }) {
    // Untitled tabs get distinct names so they're distinguishable in the strip
    if (!path && name === 'Untitled') {
      const used = new Set(tabs.map((t) => t.name));
      let n = 1;
      while (used.has(n === 1 ? 'Untitled' : `Untitled ${n}`)) n += 1;
      name = n === 1 ? 'Untitled' : `Untitled ${n}`;
    }
    const tab = {
      id: nextId++,
      path,
      name,
      savedContent: content,
      state: null, // EditorState, filled by the orchestrator on first switch away
      scrollTop: 0,
      dirty: false,
      externalChange: false, // file changed on disk while the tab is dirty
      content, // last known content, kept fresh by the orchestrator
    };
    tabs.push(tab);
    activate(tab.id);
    onAdd?.(tab);
    return tab;
  }

  async function closeTab(id) {
    const tab = byId(id);
    if (!tab) return false;
    if (!(await canClose(tab))) return false;
    const index = tabs.indexOf(tab);
    tabs.splice(index, 1);
    onClose?.(tab);
    if (id === activeId) {
      activeId = null;
      const neighbor = tabs[index] || tabs[index - 1];
      if (neighbor) {
        activate(neighbor.id);
        return true; // activate re-renders
      }
      onSwitch(null, null); // no tabs left; orchestrator opens a fresh one
    }
    renderStrip();
    return true;
  }

  function step(direction) {
    if (tabs.length < 2) return;
    const index = tabs.findIndex((t) => t.id === activeId);
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    activate(next.id);
  }

  return {
    add,
    activate,
    close: closeTab,
    closeActive: () => closeTab(activeId),
    next: () => step(1),
    prev: () => step(-1),
    active,
    findByPath: (path) => tabs.find((t) => t.path === path),
    list: () => [...tabs],
    anyDirty: () => tabs.some((t) => t.dirty),
    render: renderStrip,
  };
}
