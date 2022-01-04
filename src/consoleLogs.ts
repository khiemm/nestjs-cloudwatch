import { transports, format } from 'winston';
import { ConsoleTransportInstance } from 'winston/lib/winston/transports';
import { Format } from 'logform';
import { setCslFormat, levelFormat, maskFormat } from './helpers/formats';
const { combine, timestamp, colorize, splat } = format;

export default class ConsoleLogs {
  public Transport: ConsoleTransportInstance;

  constructor(maskConfidential: boolean = false, maskKeys?: string[]) {
    this.Transport = this.setTransport(maskConfidential, maskKeys);
  }

  setTransport(
    maskConfidential: boolean = false,
    maskKeys?: string[],
  ): ConsoleTransportInstance {
    return new transports.Console({
      format: this.setFormat(maskConfidential, maskKeys),
    });
  }

  private setFormat(maskConfidential: boolean, maskKeys?: string[]): Format {
    return combine(
      timestamp(),
      maskFormat({ maskConfidential, maskKeys }),
      levelFormat(),
      splat(),
      colorize({ all: true }),
      setCslFormat,
    );
  }
}
