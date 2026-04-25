const OFF = 0;
const WARN = 1;
const ERROR = 2;

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:perfectionist/recommended-natural-legacy',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'canonical', 'react', '@typescript-eslint', 'jsx-a11y', 'import', 
    'perfectionist'],
  rules: {
		'brace-style': [ERROR, '1tbs'],
		'canonical/destructuring-property-newline': OFF,
		'canonical/export-specifier-newline': OFF,
		'canonical/filename-match-exported': OFF,
		'canonical/filename-match-regex': OFF,
		'canonical/filename-no-index': OFF,
		'canonical/id-match': OFF,
		'canonical/import-specifier-newline': OFF,
		'canonical/no-restricted-strings': OFF,
		'canonical/no-use-extend-native': OFF,
		'canonical/prefer-import-alias': OFF,
		'canonical/prefer-inline-type-import': OFF,
		'canonical/prefer-use-mount': OFF,
		'sort-keys': [ERROR, 'asc'],
		curly: [ERROR, 'all'],
		'import/no-extraneous-dependencies': [
			ERROR,
			{
				devDependencies: true,
				optionalDependencies: false,
				peerDependencies: false,
			},
		],
		'import/order': OFF,
		'jsx-a11y/alt-text': OFF,
		'jsx-a11y/click-events-have-key-events': OFF,
		'jsx-a11y/control-has-associated-label': OFF,
		'jsx-a11y/html-has-lang': OFF,
		'jsx-a11y/iframe-has-title': OFF,
		'jsx-a11y/label-has-associated-label': OFF,
		'jsx-a11y/media-has-caption': OFF,
		'jsx-a11y/no-autofocus': OFF,
		'jsx-a11y/no-noninteractive-tabindex': OFF,
		'jsx-a11y/no-static-element-interactions': OFF,
		'max-len': [
			ERROR,
			{
				code: 120,
				ignoreTemplateLiterals: true,
				tabWidth: 4,
			},
		],
		'no-console': OFF,
		'no-tabs': OFF,
		radix: [ERROR, 'as-needed'],
		'react-hooks/exhaustive-deps': ERROR,
		'react-hooks/rules-of-hooks': ERROR,
		'react/forbid-prop-types': [
			ERROR,
			{
				forbid: ['any', 'array'],
			},
		],
		'react/function-component-definition': [
			ERROR,
			{
				namedComponents: 'arrow-function',
			},
		],
		'react/jsx-curly-brace-presence': [
			ERROR,
			{
				children: 'ignore',
				props: 'never',
			},
		],
		'react/jsx-filename-extension': OFF,
		'react/jsx-key': [
			ERROR,
			{
				checkFragmentShorthand: true,
				checkKeyMustBeforeSpread: true,
				warnOnDuplicates: true,
			},
		],
		'react/jsx-props-no-spreading': OFF,
		'react/jsx-sort-props': [
			ERROR,
			{
				callbacksLast: false,
				ignoreCase: false,
				noSortAlphabetically: false,
				reservedFirst: false,
				shorthandFirst: false,
				shorthandLast: false,
			},
		],
		'react/no-danger': OFF,
		'react/no-unknown-property': [
			ERROR,
			{
				ignore: ['object'],
			},
		],
		'react/sort-comp': OFF,
		// Handled by generic sort object keys rule
		'react/state-in-constructor': OFF,
		'react/static-property-placement': OFF,
		// Handled by canonical/sort-keys rule above, as that is --fix able
		'sort-keys': OFF,
    'react/react-in-jsx-scope': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
