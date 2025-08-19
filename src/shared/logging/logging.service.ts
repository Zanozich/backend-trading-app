import { Injectable, Logger } from '@nestjs/common';

type Meta = Record<string, unknown>;

@Injectable()
export class LoggingService {
  private readonly base = new Logger('App');
  private context?: string;

  setContext(ctx: string) {
    this.context = ctx;
  }

  private fmt(meta?: Meta) {
    return meta ? ` | ${JSON.stringify(meta)}` : '';
  }

  debug(msg: string, meta?: Meta) {
    this.base.debug(
      this.context
        ? `[${this.context}] ${msg}${this.fmt(meta)}`
        : `${msg}${this.fmt(meta)}`,
    );
  }
  log(msg: string, meta?: Meta) {
    this.base.log(
      this.context
        ? `[${this.context}] ${msg}${this.fmt(meta)}`
        : `${msg}${this.fmt(meta)}`,
    );
  }
  warn(msg: string, meta?: Meta) {
    this.base.warn(
      this.context
        ? `[${this.context}] ${msg}${this.fmt(meta)}`
        : `${msg}${this.fmt(meta)}`,
    );
  }
  error(msg: string, err?: unknown, meta?: Meta) {
    const errMsg =
      err instanceof Error ? `: ${err.message}` : err ? `: ${String(err)}` : '';
    this.base.error(
      this.context
        ? `[${this.context}] ${msg}${errMsg}${this.fmt(meta)}`
        : `${msg}${errMsg}${this.fmt(meta)}`,
    );
  }
}
