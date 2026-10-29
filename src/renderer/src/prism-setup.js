// Prism core must execute before any language component: the components
// extend the Prism instance that core registers on the global scope.
// Everything is statically imported so the bundle is self-contained —
// no dynamic loading, no CSP games, no load-order surprises.
import Prism from 'prismjs';

import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-graphql';

// We call Prism.highlight ourselves; never let it scan the DOM on load.
Prism.manual = true;

const ALIASES = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  'c++': 'cpp',
  cs: 'csharp',
  golang: 'go',
  rs: 'rust',
  kt: 'kotlin',
  md: 'markdown',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  dockerfile: 'docker',
};

export function resolveLanguage(lang) {
  if (!lang) return null;
  const normalized = ALIASES[lang.toLowerCase()] || lang.toLowerCase();
  return Prism.languages[normalized] ? normalized : null;
}

export default Prism;
