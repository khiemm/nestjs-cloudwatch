import { LogLevel } from './helpers/logLevels';

export interface ICloudWatchConfig {
  logGroupName: string;
  logStreamPrefix?: string;
  createLogGroup?: boolean;
  createLogStream?: boolean;
  awsConfig?: IAWSConfig;
  submissionInterval?: number;
  submissionRetryCount?: number;
  batchSize?: number;
  formatLog?: (logObject: ILogObject | any) => any;
}

export interface ILogObject {
  level: LogLevel;
  message?: string;
  meta?: any;
  [key: string]: any;
}

export interface IAWSConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  httpOptions?: IHttpOptions;
}

export interface IHttpOptions {
  timeout?: number;
}

export interface ICloudWatchLogsFormat {
  timestamp: string;
  message: string;
}
