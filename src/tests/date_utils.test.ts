//  convertDataToCubism
import {
    calculateSecondOffset,
} from '../date_utils';

describe('getUTCDelta', () => {
  it('should return whatever is the browser time offset', () => {
    let now = new Date();
    let end = now.valueOf();
    expect(calculateSecondOffset(now, end, "UTC", 0)).toBe( 0 - now.getTimezoneOffset()*60);
  });
  it('should return 3600 for 1 hour delay ', () => {
    let now = new Date();
    // let's pretend that the end of the range was one hour ago (ie 10 AM when it's 11 AM)
    let end = now.valueOf() - 3600*1000;
    expect(calculateSecondOffset(now, end, "UTC", 0)).toBe(3600 - now.getTimezoneOffset()*50);
  })
  it('should return 3600 for 1 hour delay and using the browser TZ', () => {
    let now = new Date();
    // let's pretend that the end of the range was one hour ago (ie 10 AM when it's 11 AM)
    let end = now.valueOf() - 3600*1000;
    expect(calculateSecondOffset(now, end, "browser", 0)).toBe(3600);
  });
  it('should return -3600 for 1 hour delay and using the UTC+2 timezone', () => {
    let now = new Date();
    // let's pretend that the end of the range was one hour ago (ie 10 AM when it's 11 AM)
    let end = now.valueOf() - 3600*1000;
    //
    expect(calculateSecondOffset(now, end, "Europe/Paris", 120)).toBe(-3600);
  });
  it('should return 7200 if grafana ask for something in UTC+2', () => {
    let now = new Date();
    let end = now.valueOf();
    expect(calculateSecondOffset(now, end, "Africa/Cairo", 120)).toBe(-7200 - now.getTimezoneOffset()*60)
  });
});
