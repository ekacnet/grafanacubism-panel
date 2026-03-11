// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';

// jsdom does not provide TextEncoder/TextDecoder; react-dom/server
// (pulled in transitively via @grafana/ui) needs them at import time.
// Node's built-in implementations are sufficient for tests.
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

SVGElement.prototype.getComputedTextLength = function () {
  return 10;
};
