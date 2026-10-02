/**
 * Fronteiras de arquitetura (ADR-004). Rode com `pnpm deps:check`.
 *
 * Camadas do backend (nos módulos que as têm: delivery, identity):
 *   domain  → não depende de nada fora de domain
 *   application → não depende de infra, presentation, ORM nem de HTTP/JWT
 *   presentation → não depende de infra
 * Módulos de leitura/CRUD enxutos (reporting, invitations, tenancy) usam o PrismaService direto no controller,
 * por escolha explícita (CQRS leve); ainda assim são isolados entre si.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Dependências circulares escondem acoplamento.',
      from: {},
      to: { circular: true },
    },

    // ---------- backend ----------
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment: 'domain só pode importar de domain (sem framework, ORM nem outras camadas).',
      from: { path: '^backend/src/modules/[^/]+/domain/' },
      to: { pathNot: '^backend/src/modules/[^/]+/domain/' },
    },
    {
      name: 'application-no-outer-layers',
      severity: 'error',
      comment: 'application não conhece infra nem presentation.',
      from: { path: '^backend/src/modules/[^/]+/application/' },
      to: { path: ['^backend/src/modules/[^/]+/(infra|presentation)/', '^backend/src/infra/'] },
    },
    {
      name: 'application-no-framework-detail',
      severity: 'error',
      comment: 'application não usa ORM, Express, JWT nem HTTP (só @nestjs/common para @Injectable).',
      from: { path: '^backend/src/modules/[^/]+/application/' },
      to: {
        path: ['node_modules/(@prisma|express|pg)/', 'node_modules/@nestjs/(?!common/)'],
      },
    },
    {
      name: 'presentation-no-infra',
      severity: 'error',
      comment: 'controllers de módulos em camadas falam com application, nunca com infra.',
      from: { path: '^backend/src/modules/(delivery|identity)/presentation/' },
      to: { path: ['^backend/src/modules/[^/]+/infra/', '^backend/src/infra/'] },
    },
    {
      name: 'shared-kernel-is-independent',
      severity: 'error',
      from: { path: '^backend/src/shared/' },
      to: { path: '^backend/src/(modules|infra)/' },
    },
    {
      name: 'modules-are-isolated',
      severity: 'error',
      comment:
        'Um módulo só pode importar de si mesmo, do kernel e do módulo identity (guard e tipos de autenticação).',
      from: { path: '^backend/src/modules/([^/]+)/' },
      to: { path: '^backend/src/modules/', pathNot: ['^backend/src/modules/$1/', '^backend/src/modules/identity/'] },
    },

    // ---------- frontend ----------
    {
      name: 'frontend-shared-is-independent',
      severity: 'error',
      from: { path: '^frontend/src/shared/' },
      to: { path: '^frontend/src/(features|app)/' },
    },
    {
      name: 'frontend-features-are-isolated',
      severity: 'error',
      comment: 'candidate e admin não se importam (bundles e responsabilidades separados).',
      from: { path: '^frontend/src/features/([^/]+)/' },
      to: { path: '^frontend/src/features/', pathNot: '^frontend/src/features/$1/' },
    },
    {
      name: 'frontend-features-no-app',
      severity: 'error',
      from: { path: '^frontend/src/features/' },
      to: { path: '^frontend/src/app/' },
    },

    // ---------- pacotes ----------
    {
      name: 'disc-core-is-pure',
      severity: 'error',
      comment: 'O cálculo DISC não depende de nada externo.',
      from: { path: '^packages/disc-core/src/', pathNot: '\\.test\\.ts$' },
      to: { pathNot: '^packages/disc-core/src/' },
    },
    {
      name: 'no-cross-app',
      severity: 'error',
      comment: 'frontend e backend só se falam por HTTP e por packages/contracts.',
      from: { path: '^frontend/' },
      to: { path: '^backend/' },
    },
    { name: 'no-cross-app-reverse', severity: 'error', from: { path: '^backend/' }, to: { path: '^frontend/' } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['/generated/', '\\.d\\.ts$', 'dist/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
