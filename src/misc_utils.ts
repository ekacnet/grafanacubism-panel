export function log_debug(message?: any, ...optionalParams: any[]): void {
  // Set it to true to enable debugging
  let debug = false;
  if (debug) {
    return console.log(message, optionalParams);
  }
}

