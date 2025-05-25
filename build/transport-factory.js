import nodemailer from 'nodemailer';
export class TransportFactory {
    /**
     * Creates a nodemailer transporter based on the provided configuration
     */
    static createTransporter(config) {
        const { transport, debug, pool, maxConnections, maxMessages } = config;
        let transportOptions;
        switch (transport.type) {
            case 'smtp':
                transportOptions = this.createSMTPOptions(transport.config, {
                    debug,
                    pool,
                    maxConnections,
                    maxMessages,
                });
                break;
            case 'gmail':
                transportOptions = this.createGmailOptions(transport.config, {
                    debug,
                    pool,
                    maxConnections,
                    maxMessages,
                });
                break;
            case 'ses':
                transportOptions = this.createSESOptions(transport.config, {
                    debug,
                    pool,
                    maxConnections,
                    maxMessages,
                });
                break;
            default:
                throw new Error(`Unsupported transport type: ${transport.type}`);
        }
        return nodemailer.createTransport(transportOptions);
    }
    /**
     * Creates SMTP transport options
     */
    static createSMTPOptions(config, options) {
        const transportOptions = {
            host: config.host,
            port: config.port,
            secure: config.secure,
            pool: options.pool || false,
            debug: options.debug || false,
            logger: options.debug || false,
        };
        // Add service if specified (for well-known services)
        if (config.service) {
            transportOptions.service = config.service;
            // When using a service, host and port are typically not needed
            delete transportOptions.host;
            delete transportOptions.port;
        }
        // Add authentication if provided
        if (config.auth) {
            transportOptions.auth = {
                user: config.auth.user,
                pass: config.auth.pass,
            };
        }
        // Add pooling options if enabled
        if (options.pool) {
            transportOptions.maxConnections = options.maxConnections || 5;
            transportOptions.maxMessages = options.maxMessages || 100;
        }
        return transportOptions;
    }
    /**
     * Creates Gmail transport options using the gmail service
     */
    static createGmailOptions(config, options) {
        const transportOptions = {
            service: 'gmail',
            auth: {
                user: config.auth.user,
                pass: config.auth.pass,
            },
            pool: options.pool || false,
            debug: options.debug || false,
            logger: options.debug || false,
        };
        // Add pooling options if enabled
        if (options.pool) {
            transportOptions.maxConnections = options.maxConnections || 5;
            transportOptions.maxMessages = options.maxMessages || 100;
        }
        return transportOptions;
    }
    /**
     * Creates SES transport options
     */
    static createSESOptions(config, options) {
        const transportOptions = {
            SES: {
                region: config.region,
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            debug: options.debug || false,
            logger: options.debug || false,
        };
        // Note: SES transport doesn't support pooling in the same way as SMTP
        // The AWS SDK handles connection pooling internally
        return transportOptions;
    }
    /**
     * Verifies that a transporter can connect and authenticate
     */
    static async verifyTransporter(transporter) {
        try {
            await transporter.verify();
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Transport verification failed: ${error.message}`);
            }
            throw new Error('Transport verification failed with unknown error');
        }
    }
    /**
     * Gets information about the transport configuration for logging
     */
    static getTransportInfo(config) {
        switch (config.type) {
            case 'smtp':
                const smtpInfo = config.config.service
                    ? `${config.config.service} service`
                    : `${config.config.host}:${config.config.port}`;
                return `SMTP (${smtpInfo})`;
            case 'gmail':
                return `Gmail (${config.config.auth.user})`;
            case 'ses':
                return `AWS SES (${config.config.region})`;
            default:
                return 'Unknown transport';
        }
    }
    /**
     * Creates a test account for development/testing purposes
     */
    static async createTestAccount() {
        try {
            return await nodemailer.createTestAccount();
        }
        catch (error) {
            throw new Error('Failed to create test account. This feature requires internet connectivity.');
        }
    }
    /**
     * Gets the preview URL for a test message (Ethereal Email)
     */
    static getTestMessageUrl(info) {
        return nodemailer.getTestMessageUrl(info) || null;
    }
}
//# sourceMappingURL=transport-factory.js.map