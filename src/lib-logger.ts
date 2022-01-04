import { loggers, Logger, LoggerOptions, format } from 'winston';
import * as Transport from 'winston-transport';
import { MetadataService } from 'aws-sdk';
import { ICentralizedLoggerConfigs, ILogEntry } from './lib-loggers.interface';
import ConsoleLogs from './consoleLogs';
import CloudWatchLogs from './cloudWatchLogs';
import { LoggerLevels, LogLevel } from './helpers/logLevels';
import { maskFormat, tryParseJsonString } from './helpers/formats';

const { combine } = format;
const CWL = new CloudWatchLogs();

export default class CentralizedLogger extends Transport {
  private DEFAULT_LOGGER_OPTIONS: ICentralizedLoggerConfigs = {
    name: 'Main',
    maskConfidential: true,
    exitOnError: false,
    enableConsole: true,
    enableCwl: false,
    enableLogzio: false,
  };

  private meta = new MetadataService({
    httpOptions: {
      timeout: 1000,
    },
  });

  public Console: Logger;

  public Cloudwatchlogs: Logger | undefined;

  public Logzio: Logger | undefined;

  public Container: Logger;

  constructor(
    configs: ICentralizedLoggerConfigs,
    opts?: Transport.TransportStreamOptions,
  ) {
    super(opts);
    const LoggerConfigs = { ...this.DEFAULT_LOGGER_OPTIONS, ...configs };

    const CSL = new ConsoleLogs(
      LoggerConfigs.maskConfidential,
      LoggerConfigs.maskKeys,
    );
    this.Console = this.addConsoleLogger(
      CSL.Transport,
      LoggerConfigs.exitOnError,
    );

    const cwlLoggerConfig = {
      ...LoggerConfigs,
      enableCwl: true,
      enableLogzio: false,
      enableConsole: false,
    };
    if (cwlLoggerConfig.enableCwl && cwlLoggerConfig.cwl) {
      const cwlTransport = CWL.setTransport(
        `cwl-${cwlLoggerConfig.name}`,
        cwlLoggerConfig.cwl,
      );
      this.Cloudwatchlogs = this.addCustomLogger(
        'main-cloudwatchlogs',
        cwlTransport,
        cwlLoggerConfig,
      );
    }

    this.Container = this.addLoggers(LoggerConfigs, CSL.Transport);
  }

  private addCustomLogger(
    name: string,
    customTransport: Transport,
    configs: ICentralizedLoggerConfigs,
  ): Logger {
    const loggerOptions: LoggerOptions = {
      level: LogLevel.Debug,
      levels: LoggerLevels,
      exitOnError: configs.exitOnError,
      format: combine(
        maskFormat({
          maskConfidential: configs.maskConfidential,
          maskKeys: configs.maskKeys,
        }),
      ),
      transports: [customTransport],
    };
    return loggers.add(name, loggerOptions);
  }

  private addConsoleLogger(
    consoleTransport: Transport,
    exitOnError: boolean = false,
  ): Logger {
    const loggerOptions: LoggerOptions = {
      level: LogLevel.Debug,
      levels: LoggerLevels,
      exitOnError,
      transports: [consoleTransport],
    };
    return loggers.add('main-console', loggerOptions);
  }

  addLoggers(
    configs: ICentralizedLoggerConfigs,
    consoleTransport: Transport,
  ): Logger {
    const transports: Transport[] = [];

    if (configs.enableConsole) {
      transports.push(consoleTransport);
    }

    if (configs.enableCwl && configs.cwl) {
      const cwlTransport = CWL.setTransport(configs.name, configs.cwl);
      transports.push(cwlTransport);
    }

    const loggerOptions: LoggerOptions = {
      level: LogLevel.Debug,
      levels: LoggerLevels,
      exitOnError: configs.exitOnError,
      format: combine(
        maskFormat({
          maskConfidential: configs.maskConfidential,
          maskKeys: configs.maskKeys,
        }),
      ),
      transports,
    };

    return loggers.add(configs.name, loggerOptions);
  }

  end() {
    this.Container.end(() => this.Container.close());
    if (this.Cloudwatchlogs) {
      this.Cloudwatchlogs.end(() => {
        if (this.Cloudwatchlogs) {
          this.Cloudwatchlogs.close();
        }
      });
    }

    if (this.Logzio) {
      this.Logzio.end(() => {
        if (this.Logzio) {
          this.Logzio.close();
        }
      });
    }
  }

  httpRequestLog(req: any, res?: any, next?: any) {
    const requestLog = {
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      level: LogLevel.Debug,
      clientIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      method: req.method,
      originalUri: req.originalUrl,
      uri: req.url,
      referer: req.headers.referer || '',
      userAgent: req.headers['user-agent'],
      message: `HTTP Request - ${req.correlationId}`,
      request: {
        body: tryParseJsonString({ ...req.body }),
        headers: req.headers,
      },
    };
    res.setHeader('x-request-id', req.correlationId || '');

    this.log(requestLog);
    next();
  }

  httpResponseLog(req: any, res: any, next: any) {
    const rawResponse = res.write;
    const rawResponseEnd = res.end;
    const chunks: any[] = [];
    res.write = (...restArgs: any[]) => {
      chunks.push(new Buffer(restArgs[0]));
      rawResponse.apply(res, restArgs);
    };
    res.end = (...restArgs: any[]) => {
      if (restArgs[0]) {
        chunks.push(new Buffer(restArgs[0]));
      }
      const body = Buffer.concat(chunks).toString('utf8');
      const responseLog = {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        level: LogLevel.Debug,
        statusCode: res.statusCode,
        clientIP:
          req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        method: req.method,
        originalUri: req.originalUrl,
        uri: req.url,
        referer: req.headers.referer || '',
        userAgent: req.headers['user-agent'],
        message: `HTTP Response - ${req.correlationId}`,
        request: {
          body: req.body,
          headers: req.headers,
        },
        response: {
          body: tryParseJsonString(body),
          headers: res.getHeaders(),
        },
      };

      this.log(responseLog);
      rawResponseEnd.apply(res, restArgs);
    };

    next();
  }

  log(logEntry: ILogEntry) {
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString();
    }

    this.Container.log(logEntry);
  }

  info(message: string, data?: any) {
    this.log({
      level: LogLevel.Info,
      message,
      data,
    });
  }
}
