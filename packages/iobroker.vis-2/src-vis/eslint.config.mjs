import config, { reactConfig } from '@iobroker/eslint-config';
import importRules from 'eslint-plugin-import';

export default [
    ...config,
    ...reactConfig,
    {
        plugins: {
            import: importRules,
        },
        rules: {
            'no-new-func': 'warn',
            'no-extend-native': 'warn',
            'no-eval': 'warn',
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                },
            ],
            'import/no-cycle': ['error', { maxDepth: 1 }],
        },
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.js', '*.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        ignores: [
            '.__mf__temp/**/*',
            'build/**/*',
            'node_modules/**/*',
            'public/**/*',
            'src/Vis/lib/can.custom.min.js',
            'modulefederation.config.js',
            'modulefederation.vis.config.js',
            'eslint.config.mjs',
        ],
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
        },
    },
];
