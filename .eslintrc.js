module.exports = {
  extends: eslintExtends(),
  parser: '@typescript-eslint/parser',
  plugins: eslintPlugins(),
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    commonjs: true,
    es6: true,
    es2022: true,
  },
  globals: {
    window: true,
    module: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    parser: '@typescript-eslint/parser',
    requireConfigFile: false,
  },
  ignorePatterns: ['/build/*', 'craco.config.js', 'src/vendor/**/*.js'],
  rules: eslintRules(),
};

function eslintPlugins() {
  return ['react', 'react-hooks', '@typescript-eslint'];
}

function eslintExtends() {
  return [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
  ];
}

function eslintRules() {
  return {
    'no-extra-boolean-cast': ['warn', { enforceForLogicalOperands: true }],
    'no-useless-escape': 'error',
    'react/prop-types': 'error',
    'no-mixed-spaces-and-tabs': 'error',
    'no-case-declarations': 'error',
    'react/no-unescaped-entities': 'error',
    'react/react-in-jsx-scope': 'off',
    'no-console': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-no-undef': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/rules-of-hooks': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'prettier/prettier': [
      'warn',
      {
        endOfLine: 'auto',
      },
    ],
  };
}
