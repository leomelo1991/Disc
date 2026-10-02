# @disc/config

Presets de TypeScript compartilhados. Cada pacote os estende:

| Preset                | Uso                                                              |
| --------------------- | ---------------------------------------------------------------- |
| `tsconfig.base.json`  | Rigor comum (`strict`, `noUncheckedIndexedAccess`), sem módulo.  |
| `tsconfig.node.json`  | Pacotes Node/ESM (`@disc/core`, `@disc/contracts`): NodeNext.    |
| `tsconfig.nest.json`  | Backend NestJS: Node + decorators e metadata (necessários à DI). |
| `tsconfig.react.json` | Frontend Vite: ESNext/Bundler, JSX, DOM, sem emissão.            |

Exemplo: `{ "extends": "@disc/config/tsconfig.node.json" }`.

Prettier e ESLint ficam na raiz (`.prettierrc.json`, `eslint.config.mjs`), uma única configuração para todo o repositório.
