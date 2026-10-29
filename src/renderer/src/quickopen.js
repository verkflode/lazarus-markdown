/**
 * Quick open: fuzzy file switcher over the open folder (⌘P).
 * fuzzyMatch is pure and unit-tested.
 */

/**
 * Subsequence match of query against text. Returns a score (higher = better)
 * or -1 for no match. Bonuses for word-boundary hits and compactness.
 */
export function fuzzyMatch(query, text) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let ti = 0;
  let lastHit = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return -1;
    const boundary = found === 0 || /[\s\-_./]/.test(t[found - 1]);
    score += boundary ? 10 : 1;
    if (found === lastHit + 1) score += 5; // consecutive run
    lastHit = found;
    ti = found + 1;
  }
  return score - Math.floor(t.length / 10); // mild penalty for long paths
}

export function rankFiles(query, files, limit = 12) {
  return files
    .map((file) => ({ file, score: fuzzyMatch(query, file.name) * 2 + fuzzyMatch(query, file.path) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.file);
}

export function flattenTree(nodes, out = []) {
  for (const node of nodes || []) {
    if (node.type === 'file') out.push(node);
    else if (node.children) flattenTree(node.children, out);
  }
  return out;
}

export function createQuickOpen({ getFiles, onPick }) {
  const overlay = document.createElement('div');
  overlay.id = 'quick-open';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="qo-panel">
      <input class="qo-input" type="text" placeholder="Jump to file…" spellcheck="false" />
      <ul class="qo-results"></ul>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.qo-input');
  const results = overlay.querySelector('.qo-results');
  let matches = [];
  let selected = 0;

  function renderResults() {
    results.innerHTML = '';
    matches.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = index === selected ? 'selected' : '';
      const name = document.createElement('span');
      name.className = 'qo-name';
      name.textContent = file.name;
      const path = document.createElement('span');
      path.className = 'qo-path';
      path.textContent = file.path;
      li.append(name, path);
      li.addEventListener('click', () => pick(index));
      results.appendChild(li);
    });
    if (matches.length === 0 && input.value) {
      results.innerHTML = '<li class="qo-empty">No matching files</li>';
    }
  }

  function refresh() {
    matches = rankFiles(input.value, getFiles());
    selected = 0;
    renderResults();
  }

  function pick(index) {
    const file = matches[index];
    hide();
    if (file) onPick(file.path);
  }

  function show() {
    if (getFiles().length === 0) return;
    overlay.hidden = false;
    input.value = '';
    refresh();
    input.focus();
  }

  function hide() {
    overlay.hidden = true;
  }

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      selected = Math.min(selected + 1, matches.length - 1);
      renderResults();
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      selected = Math.max(selected - 1, 0);
      renderResults();
      event.preventDefault();
    } else if (event.key === 'Enter') {
      pick(selected);
    } else if (event.key === 'Escape') {
      hide();
    }
  });
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) hide();
  });

  return { show, hide };
}
