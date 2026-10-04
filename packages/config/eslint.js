import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const FRAMEWORKS = [
  '@nestjs/*',
  '@prisma/*',
  'prisma',
  'astro',
  'astro/*',
  'react',
  'react-dom',
  'react/*',
  '@heroui/*',
  'express',
];

const restrict = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
});

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.astro/**',
      '**/.turbo/**',
      '**/src/generated/**',
      '**/*.astro',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    files: ['packages/domain/**/*.ts'],
    rules: restrict(
      [...FRAMEWORKS, '@antrina/application', '@antrina/contracts', '@antrina/ui'],
      'El dominio es puro: no importa frameworks, infraestructura ni otras capas.',
    ),
  },
  {
    files: ['packages/application/**/*.ts'],
    rules: restrict(
      [...FRAMEWORKS, '@antrina/ui'],
      'La capa de aplicación solo depende de @antrina/domain y @antrina/contracts.',
    ),
  },
  {
    files: ['packages/contracts/**/*.ts'],
    rules: restrict(
      [...FRAMEWORKS, '@antrina/application', '@antrina/ui'],
      'Contracts solo contiene tipos/DTOs serializables.',
    ),
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    rules: restrict(
      ['@nestjs/*', '@prisma/*', 'prisma', '@antrina/application', '@antrina/domain'],
      'La UI consume @antrina/contracts, nunca el dominio ni la infraestructura.',
    ),
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: restrict(
      ['@nestjs/*', '@prisma/*', 'prisma', '@antrina/application', '@antrina/domain'],
      'El frontend habla con la API vía @antrina/contracts.',
    ),
  },
  {
    files: ['apps/admin/**/*.{ts,tsx}'],
    rules: restrict(
      [
        '@nestjs/*',
        '@prisma/*',
        'prisma',
        'astro',
        'astro/*',
        '@antrina/application',
        '@antrina/domain',
      ],
      'El panel habla con la API vía @antrina/contracts; las reglas de negocio viven en la API.',
    ),
  },
);
