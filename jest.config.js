// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const path = require('path');
const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');
// Array of known package dependencies that only bundle an ESM version
let ESModules = ['d3', 'd3-array', 'd3-.*', 'internmap', 'robust-predicates', 'delaunator', ...grafanaESModules];

let ignoredModules = [nodeModulesToTransform(ESModules)];
exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  setupFiles: ['jest-canvas-mock'],
  coverageDirectory: 'coverage/jest',
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.json',
      useESM: true,
    },
    TextEncoder: require('util').TextEncoder,
    TextDecoder: require('util').TextDecoder,
  },
  moduleNameMapper: {
    '^cubism-es$': path.resolve(__dirname, 'node_modules', 'cubism-es', 'dist', 'cubism-es.esm.js'),
  },
  transformIgnorePatterns: ignoredModules,
};

exports.coveragePathIgnorePatterns = [
  '.config/jest-setup.js',
  '3rdparty/cubism-es/dist/cubism-es.esm.js',
  '.config/jest/mocks',
];
module.exports = exports;
