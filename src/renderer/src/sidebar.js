/** Sidebar: file tree (left tab) and document outline (right tab). */

function buildTreeNodes(nodes, onOpenFile) {
  const list = document.createElement('ul');
  list.className = 'tree-list';
  for (const node of nodes) {
    const item = document.createElement('li');
    if (node.type === 'dir') {
      const label = document.createElement('button');
      label.className = 'tree-dir';
      label.textContent = node.name;
      label.addEventListener('click', () => item.classList.toggle('collapsed'));
      item.appendChild(label);
      item.appendChild(buildTreeNodes(node.children, onOpenFile));
    } else {
      const label = document.createElement('button');
      label.className = 'tree-file';
      label.textContent = node.name;
      label.dataset.path = node.path;
      label.addEventListener('click', () => onOpenFile(node.path));
      item.appendChild(label);
    }
    list.appendChild(item);
  }
  return list;
}

/**
 * Extract headings from markdown source, skipping fenced code blocks.
 * Returns [{ level, text, line }] with 1-based line numbers.
 */
export function extractHeadings(source) {
  const headings = [];
  let inFence = false;
  source.split('\n').forEach((line, i) => {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      headings.push({ level: match[1].length, text: match[2], line: i + 1 });
    }
  });
  return headings;
}

export function createSidebar({ onOpenFile, onGoToLine }) {
  const sidebar = document.getElementById('sidebar');
  const fileTreeEl = document.getElementById('file-tree');
  const outlineEl = document.getElementById('outline');
  const tabs = {
    files: { tab: document.getElementById('tab-files'), panel: document.getElementById('panel-files') },
    outline: { tab: document.getElementById('tab-outline'), panel: document.getElementById('panel-outline') },
  };

  for (const [name, { tab }] of Object.entries(tabs)) {
    tab.addEventListener('click', () => {
      for (const entry of Object.values(tabs)) {
        entry.tab.classList.remove('active');
        entry.panel.classList.remove('active');
      }
      tabs[name].tab.classList.add('active');
      tabs[name].panel.classList.add('active');
    });
  }

  return {
    toggle() {
      sidebar.classList.toggle('collapsed');
    },

    showFolder(tree) {
      fileTreeEl.innerHTML = '';
      if (!tree || tree.length === 0) {
        fileTreeEl.innerHTML = '<div class="sidebar-empty"><p>No markdown files found</p></div>';
        return;
      }
      fileTreeEl.appendChild(buildTreeNodes(tree, onOpenFile));
      sidebar.classList.remove('collapsed');
    },

    markActiveFile(path) {
      for (const el of fileTreeEl.querySelectorAll('.tree-file.active')) {
        el.classList.remove('active');
      }
      const active = fileTreeEl.querySelector(`.tree-file[data-path="${CSS.escape(path || '')}"]`);
      active?.classList.add('active');
    },

    updateOutline(source) {
      const headings = extractHeadings(source);
      outlineEl.innerHTML = '';
      if (headings.length === 0) {
        outlineEl.innerHTML = '<div class="sidebar-empty"><p>No headings yet</p></div>';
        return;
      }
      const list = document.createElement('ul');
      list.className = 'outline-list';
      for (const heading of headings) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.className = `outline-item level-${heading.level}`;
        button.textContent = heading.text;
        button.title = heading.text;
        button.addEventListener('click', () => onGoToLine(heading.line));
        item.appendChild(button);
        list.appendChild(item);
      }
      outlineEl.appendChild(list);
    },
  };
}
