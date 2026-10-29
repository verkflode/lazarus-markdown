# Math & Diagrams

## Math with KaTeX

Euler's identity, $e^{i\pi} + 1 = 0$, sits comfortably inline. Display math
gets its own line:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

The quadratic formula solves $ax^2 + bx + c = 0$:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

And a little linear algebra:

$$
\begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}
\begin{pmatrix} x \\ y \end{pmatrix}
=
\begin{pmatrix} x\cos\theta - y\sin\theta \\ x\sin\theta + y\cos\theta \end{pmatrix}
$$

## Diagrams with Mermaid

How a keystroke becomes a preview:

```mermaid
flowchart LR
    A[Keystroke] --> B{Debounce}
    B --> C[markdown-it]
    C --> D[Sanitize]
    D --> E[Live preview]
```

Opening a file:

```mermaid
sequenceDiagram
    participant U as You
    participant R as Renderer
    participant M as Main process
    U->>R: ⌘P → "notes"
    R->>M: readFile(path)
    M-->>R: content + encoding
    R->>R: open tab, render preview
    M-->>R: file changed on disk
    R->>R: reload (if no unsaved edits)
```

A release, as a timeline:

```mermaid
gantt
    dateFormat YYYY-MM-DD
    title Road to v1.0
    section Build
    Session restore   :done,    2026-10-01, 10d
    Linked files      :done,    2026-10-12, 7d
    section Ship
    Public beta       :active,  2026-11-01, 14d
    v1.0              :         2026-11-15, 7d
```
