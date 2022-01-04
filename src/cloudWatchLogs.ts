import { createHash } from 'crypto';
import { format } from 'winston';
import { setCwlFormat } from './helpers/formats';
import { ILogObject, ICloudWatchConfig } from './cloudWatchLogs.interface';
import { LogLevel } from './helpers/logLevels';
// import WinstonCloudWatch from 'winston-cloudwatch';
const WinstonCloudWatch = require('winston-cloudwatch');
const { combine, json } = format;

export default class CloudWatchLogs {
  private readonly DEFAULT_CWL_OPTIONS: ICloudWatchConfig = {
    logGroupName: 'Main',
    // logStreamPrefix: 'Main-',
    createLogGroup: true,
    createLogStream: true,
    submissionInterval: 2000,
    submissionRetryCount: 1,
    batchSize: 20,
    awsConfig: {
      region: 'ap-southeast-1',
      httpOptions: {
        timeout: 1000,
      },
    },
    formatLog: (logObject: ILogObject | any) => setCwlFormat(logObject),
  };

  setLogStreamName(logStreamPrefix: string = ''): string {
    // Give ourselves a randomized (time-based) hash to append to our stream name
    // so multiple instances of the server running don't log to the same
    // date-separated stream.
    const startTime = new Date().toISOString();

    // Spread log streams across dates as the server stays up
    const date = new Date().toISOString().split('T')[0];
    return `${logStreamPrefix}${date}-${createHash('md5')
      .update(startTime)
      .digest('hex')}`;
  }

  setTransport(name: string, cwlConfig: ICloudWatchConfig): any {
    const config = { ...this.DEFAULT_CWL_OPTIONS, ...cwlConfig };
    const logStreamName = this.setLogStreamName(config.logStreamPrefix);
    return new WinstonCloudWatch({
      name,
      level: LogLevel.Debug,
      logGroupName: config.logGroupName, // REQUIRED
      logStreamName, // REQUIRED
      awsOptions: config.awsConfig,
      jsonMessage: true,
      messageFormatter: config.formatLog,
      uploadRate: config.submissionInterval,
    });
  }
}
