import { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

const isPrettyLoggingEnabled = (): boolean =>
  process.env.LOG_PRETTY !== 'false' && process.env.NODE_ENV !== 'production';

export const createLoggingModule = (serviceName: string): DynamicModule =>
  LoggerModule.forRoot({
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? 'info',
      base: {
        service: serviceName,
      },
      messageKey: 'message',
      transport: isPrettyLoggingEnabled()
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: false,
            },
          }
        : undefined,
    },
    renameContext: 'context',
  });
