/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies cause unpredictable load order, memory leaks, and hard-to-debug boot crashes.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-database-importing-modules",
      severity: "error",
      comment: "Database layer must not import from business-logic modules.",
      from: { path: "^src/database" },
      to:   { path: "^src/modules" },
    },
    {
      name: "no-config-importing-app",
      severity: "error",
      comment: "Config layer must not import from app or modules.",
      from: { path: "^src/config" },
      to:   { path: "^src/(app|modules)" },
    },
    {
      name: "no-modules-importing-middleware",
      severity: "warn",
      comment: "Business modules should not depend on HTTP middleware.",
      from: { path: "^src/modules" },
      to:   { path: "^src/middleware" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Orphan modules are unreachable dead code.",
      from: {
        orphan: true,
        pathNot: ["\\.d\\.ts$", "(^|/)\\..*\\.(js|cjs|mjs|json)$"],
      },
      to: {},
    },
    {
      name: "no-deprecated-core",
      severity: "warn",
      comment: "Avoid deprecated Node.js built-ins.",
      from: {},
      to: {
        dependencyTypes: ["core"],
        path: "^(punycode|domain|constants|sys|_linklist|_stream_wrap)$",
      },
    },
    {
      name: "no-test-imports-in-production",
      severity: "error",
      comment: "Production source must never import test files.",
      from: { pathNot: "(__tests__|test|spec|_tests_)" },
      to:   { path: "(__tests__|test|spec|_tests_)" },
    },
  ],

  options: {
    doNotFollow: {
      path: "node_modules",
      dependencyTypes: ["npm","npm-dev","npm-optional","npm-peer","npm-bundled","npm-no-pkg"],
    },
    moduleSystems: ["es6", "cjs"],
  },
};