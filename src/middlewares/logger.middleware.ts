import { NestMiddleware } from '@nestjs/common';
import * as httpContext from 'express-http-context';
import CentralizedLogger from 'src/lib-logger';
import { ICentralizedLoggerConfigs } from 'src/lib-loggers.interface';
import { v4 as uuidV4 } from 'uuid';

const coreLoggerConfig: ICentralizedLoggerConfigs = {
  name: 'myLogger', //default: Main
  maskConfidential: true, //default: true, masking custom keys
  maskKeys: ['pin', 'password'], //default: [] - empty, keys for trigger masking
  exitOnError: false, //default: false
  enableConsole: true, //default: true - Console Logging
  enableCwl: true, //default: false, AWS Cloudwatch Logs - If no enable, will not logging
  enableLogzio: true, //default: false, Logzio - If no enable, will not logging
  //AWS Cloudwatch Logs Config - If no configure, will not logging
  cwl: {
    logGroupName: process.env.AWS_LOG_GROUP, //required
    //AWS Credentials
    awsConfig: {
      accessKeyId: process.env.AWS_ACCESS_KEY, //if no set, will auto retrieve from AWS instance - IAM role
      secretAccessKey: process.env.AWS_SECRET_KEY, //if no set, will auto retrieve from AWS instance - IAM role
      region: process.env.AWS_REGION, //default: ap-southeast-1 - Singapore region
    },
    submissionInterval: 2000, //default: 2000 milliseconds
    submissionRetryCount: 1, //default: 1
    batchSize: 20, //default: 20 log events per batch
  },
};

const CoreLogger = new CentralizedLogger(coreLoggerConfig);

export class LoggerMiddleware implements NestMiddleware {
  use(req, res, next) {
    CoreLogger.httpRequestLog(req, res, next);
    // CoreLogger.httpResponseLog(req, res, next);
  }
}

export function setCorrelationId(req, _, next) {
  req.timestamp = Date.now();
  const correlationId = uuidV4();
  req.correlationId = correlationId;
  httpContext.set('correlationId', correlationId);
  next();
}

export function getCorrelationId() {
  let correlationId = httpContext.get('correlationId');
  if (!correlationId) {
    correlationId = uuidV4();
    httpContext.set('correlationId', correlationId);
  }
  return correlationId;
}
