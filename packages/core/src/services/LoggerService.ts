import { type LoggerConfig, type LogLevel, LogLevels } from '@/types/sdk'

/** Simple leveled logger with configurable minimum level and prefix. */
export class Logger {
	private config: LoggerConfig

	constructor(config?: Partial<LoggerConfig>) {
		this.config = {
			minLevel: LogLevels.INFO,
			prefix: '[ParaPortSDK]',
			...config,
		}
	}

	/** Logs a debug-level message. */
	debug(message: string, data?: unknown): void {
		this.log(LogLevels.DEBUG, message, data)
	}

	/** Logs an info-level message. */
	info(message: string, data?: unknown): void {
		this.log(LogLevels.INFO, message, data)
	}

	/** Logs a warn-level message. */
	warn(message: string, data?: unknown): void {
		this.log(LogLevels.WARN, message, data)
	}

	/** Logs an error-level message. */
	error(message: string, error?: unknown): void {
		this.log(LogLevels.ERROR, message, error)
	}

	/**
	 * Internal logging handler.
	 * @param level - Log level
	 * @param message - Message to log
	 * @param data - Optional metadata or error
	 */
	private log(level: LogLevel, message: string, data?: unknown): void {
		if (this.shouldLog(level)) {
			const prefix = this.config.prefix ? `[${this.config.prefix}] ` : ''
			const formattedMsg = `${level} ${prefix}${message}`

			switch (level) {
				case LogLevels.ERROR:
					console.error(formattedMsg, data || '')
					break
				case LogLevels.WARN:
					console.warn(formattedMsg, data || '')
					break
				case LogLevels.INFO:
					console.info(formattedMsg, data || '')
					break
				case LogLevels.DEBUG:
					console.debug(formattedMsg, data || '')
					break
			}
		}
	}

	/**
	 * Determines whether a given level should be logged.
	 * @param level - Level to check
	 * @returns True when level >= configured minLevel
	 */
	private shouldLog(level: LogLevel): boolean {
		const levels = [
			LogLevels.DEBUG,
			LogLevels.INFO,
			LogLevels.WARN,
			LogLevels.ERROR,
		]
		return levels.indexOf(level) >= levels.indexOf(this.config.minLevel)
	}
}
