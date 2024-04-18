let debug = false;
export function enableDebug(): void {
  debug = true;
}
export function log_debug(message?: any, ...optionalParams: any[]): void {
  // Set it to true to enable debugging
  if (debug) {
    if (optionalParams.length > 0) {
      return console.log(message, optionalParams.join(' '));
    } else {
      return console.log(message);
    }
  }
}
