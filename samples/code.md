# Code

Syntax highlighting in the editor *and* the preview, for 30+ languages.
Hover a block in the preview to copy it.

[[toc]]

## TypeScript

```ts
interface Tab {
  id: number;
  path: string | null;
  dirty: boolean;
}

export function unsaved(tabs: Tab[]): string[] {
  return tabs
    .filter((t) => t.dirty)
    .map((t) => t.path ?? 'Untitled');
}
```

## Python

```python
from pathlib import Path

def word_count(folder: str) -> dict[str, int]:
    """Count words in every Markdown file under a folder."""
    return {
        p.name: len(p.read_text(encoding="utf-8").split())
        for p in Path(folder).rglob("*.md")
    }
```

## Rust

```rust
fn fuzzy_score(query: &str, candidate: &str) -> usize {
    let mut chars = candidate.chars();
    let mut score = 0;
    for q in query.chars() {
        score += chars.by_ref().take_while(|&c| c != q).count();
    }
    score
}
```

## Shell

```bash
npm install
npm run dev      # hot reload
npm run dist     # build a notarized .dmg
```

## A diff

```diff
- if (!url.startsWith('file:')) event.preventDefault();
+ event.preventDefault();
+ if (url.startsWith('file:')) deliverFile(fileURLToPath(url));
```

Inline code like `markdown-it` and `⌘E` works too.
