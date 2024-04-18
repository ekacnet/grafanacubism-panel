import { log_debug } from 'misc_utils';


export const calculateSecondOffset = (now: Date, end: number, tz: string, grafanaTZ2UTC: number): number => {
  // A positive delta will send the start and the end of the graph back in time.
  // we calculate the number of second of delta between the start of the function and the end of
  // the range this will be a positive number because we want to go back in time (potentially)
  let delta = (+now - end)/1000;

  // Now let's take timezone into account if the timezone is not the one of the browser
  // This could be positive or negative (obviously).
  // To do so we get the number of minutes between UTC and the browser (ie. -420 if you are in
  // UTC-7) and the number of minutes between UTC and the timezone defined in Grafana (ie. UTC
  // + 1 or Pacific/Marquesas UTC-9:30) and we substract this to the first number.
  // If the delta is positive it means that there is less minutes than the browser to UTC and we
  // need to go back in time and add an additional positive delta, if the number is negative it
  // means that we need to go forward in time because there is less minutes.
  if (tz !== "browser") {
    // the number of minutes !!! of delta from the TZ selected in grafana to UTC (ie. 60 if it's
    // you are in UTC+1 or -420 if you are in UTC-7
    // if tz == "browser" this information doesn't exists ...
    let browser2UTC = -now.getTimezoneOffset();
    let tzDelta = browser2UTC - grafanaTZ2UTC;
    log_debug(`Browser to UTC delta: ${browser2UTC}, utcOffset ${grafanaTZ2UTC} delta from the browser to the TZ (${tz}) in grafana: ${tzDelta}`);
    delta += (tzDelta) * 60;
  }
  return delta;
}
