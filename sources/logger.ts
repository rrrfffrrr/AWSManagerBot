import winston from 'winston';
import winston_daily from 'winston-daily-rotate-file'
import path from 'path'

// logger
export function CreateLogger(dir: string) {
    let logger = winston.createLogger({
        level: 'info',
        transports: [
            new winston.transports.DailyRotateFile({
                filename: path.join(dir, 'log-%DATE%.log'),
                maxFiles: '15d'
            })
        ]
    });

    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston.transports.Console({ format: winston.format.simple() }));
    }

    return logger;
}