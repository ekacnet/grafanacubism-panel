// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  coverageDirectory: 'coverage/jest',
};
exports.coveragePathIgnorePatterns = ['.config/jest-setup.js'];
module.exports = exports;
