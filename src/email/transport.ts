import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { TransportConfig, EmailServerConfig } from './config.js';

export class EmailTransportFactory {
  /**
   * Creates a nodemailer transporter based on the provided configuration
   */
  public static createTransporter(config: EmailServerConfig): Transporter {
    const { transport, debug, pool, maxConnections, maxMessages } = config;

    let transportOptions: any;

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
        throw new Error(`Unsupported transport type: ${(transport as any).type}`);
    }

    return nodemailer.createTransport(transportOptions);
  }

  /**
   * Creates SMTP transport options
   */
  private static createSMTPOptions(
    config: any,
    options: {
      debug?: boolean;
      pool?: boolean;
      maxConnections?: number;
      maxMessages?: number;
    }
  ) {
    const transportOptions: any = {
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
  private static createGmailOptions(
    config: any,
    options: {
      debug?: boolean;
      pool?: boolean;
      maxConnections?: number;
      maxMessages?: number;
    }
  ) {
    const transportOptions: any = {
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
  private static createSESOptions(
    config: any,
    options: {
      debug?: boolean;
      pool?: boolean;
      maxConnections?: number;
      maxMessages?: number;
    }
  ) {
    const transportOptions: any = {
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
  public static async verifyTransporter(transporter: Transporter): Promise<void> {
    try {
      await transporter.verify();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transport verification failed: ${error.message}`);
      }
      throw new Error('Transport verification failed with unknown error');
    }
  }

  /**
   * Gets information about the transport configuration for logging
   */
  public static getTransportInfo(config: TransportConfig): string {
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
   * Gets the preview URL for a test message (Ethereal Email)
   */
  public static getTestMessageUrl(info: any): string | null {
    return nodemailer.getTestMessageUrl(info) || null;
  }
} 