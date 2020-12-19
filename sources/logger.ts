import winston from 'winston';
import winston_daily from 'winston-daily-rotate-file'
import path from 'path'

// logger
export function CreateLogger(dir: string) {
    let logger = winston.createLogger({
        level: 'info'
    });

    logger.add(
        new winston_daily({
            filename: path.join(dir, 'log-%DATE%.log'),
            maxFiles: '15d'
        })
    );
    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston.transports.Console({ format: winston.format.simple() }));
    }

    return logger;
}