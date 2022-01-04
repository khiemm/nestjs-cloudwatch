import {format} from 'winston';
import {Format, FormatWrap} from 'logform';
import {LogLevel} from './logLevels';
import {ICloudWatchLogsFormat, ILogObject} from '../cloudWatchLogs.interface';
const stringifySafe = require('json-stringify-safe');
const MaskJson = require('mask-json');
const {printf} = format;

const hasOwnProperty = Object.prototype.hasOwnProperty;

export const levelFormat: FormatWrap = format(info => {
  info.level = info.level.toUpperCase();

  const meta = Object.assign({}, info, {});
  delete meta.level;
  delete meta.message;
  delete meta.timestamp;
  info.meta = safeToString(meta);
  if (isEmpty(meta)) {
    info.meta = null;
  } else {
    info.meta = safeToString(meta);
    if (info.meta === '{}') {
      info.meta = '';
    }
  }
  return info;
});

export const setCslFormat: Format = printf(info => {
  let meta: string = '';
  if (info.meta) {
    if (typeof info.meta === 'object') {
      return safeToString(info.meta);
    } else if (typeof info.meta === 'string') {
      return info.meta;
    }
  }

  return meta;
});

export const maskFormat: FormatWrap = format((info, opts) => {
  if (!opts.maskConfidential) {
    return info;
  }

  try {
    const mask = MaskJson(opts.maskKeys, {ignoreCase: true, replacement: '********'});
    info = mask(info);
    return info;
  } catch (error) {
    return info;
  }
});

export function isEmpty(obj: any): boolean {
  // null and undefined are "empty"
  if (obj == null) return true;

  // Assume if it has a length property with a non-zero value
  // that that property is correct.
  if (obj.length > 0) return false;
  if (obj.length === 0) return true;

  // If it isn't an object at this point
  // it is empty, but it can't be anything *but* empty
  // Is it empty?  Depends on your application.
  if (typeof obj !== 'object') return true;

  // Otherwise, does it have any properties of its own?
  // Note that this doesn't handle
  // toString and valueOf enumeration bugs in IE < 9
  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) return false;
  }

  return true;
}

export function tryParseJsonString(str: string): any {
  try {
    const jsonObj = JSON.parse(str);
    return jsonObj;
  } catch (e) {
    return str;
  }
}

export function safeToString(json: any, space?: number): string {
  try {
    return JSON.stringify(json, null, space);
  } catch (ex) {
    return stringifySafe(json, null, null, () => {});
  }
}

export function setCwlFormat(logObject: ILogObject | any): ICloudWatchLogsFormat {
  const log: ICloudWatchLogsFormat = {
    timestamp: logObject.date,
    message: '',
  };
  const level = logObject.level.toUpperCase();
  const timestamp = new Date(logObject.date).toISOString();
  const defaultMessage = `${timestamp}|[${level}]|${logObject.message}`;

  switch (logObject.level) {
    case LogLevel.Error:
    case LogLevel.Debug:
      if (logObject.meta) {
        logObject.meta.timestamp = logObject.meta.timestamp ? logObject.meta.timestamp : timestamp;
        logObject.meta.level = level;
        logObject.meta.message = logObject.meta.message ? logObject.meta.message : logObject.message;
        log.message = `${safeToString(logObject.meta, 2)}`;
        return log;
      } else {
        log.message = `${defaultMessage}|${safeToString(logObject.meta)}`;
        break;
      }
    default:
      log.message = logObject.meta ? `${defaultMessage}|${safeToString(logObject.meta)}` : defaultMessage;
      break;
  }

  return log;
}
