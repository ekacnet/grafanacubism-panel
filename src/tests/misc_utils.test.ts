//  convertDataToCubism
import { enableDebug, log_debug } from '../misc_utils';

describe('misc utils', () => {
  it('should not log when debug is not enabled', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    log_debug('let met log something');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
  it('should log when debug is not enabled', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    enableDebug();
    log_debug('let met log something');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
  it('should log when debug is not enabled even with parameters', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    enableDebug();
    let v = 1;
    log_debug('let met log something', v);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });
});
