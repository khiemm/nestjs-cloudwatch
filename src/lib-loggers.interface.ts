import { ICloudWatchConfig } from './cloudWatchLogs.interface';
import { LogLevel } from './helpers/logLevels';

export interface ICentralizedLoggerConfigs {
  name: string;
  maskConfidential?: boolean;
  maskKeys?: string[];
  exitOnError?: boolean;
  enableConsole?: boolean;
  enableCwl?: boolean;
  enableLogzio?: boolean;
  cwl?: ICloudWatchConfig;
}

export interface ILogEntry {
  timestamp?: string;
  level: LogLevel;
  message: string;
  [optionName: string]: any;
}
