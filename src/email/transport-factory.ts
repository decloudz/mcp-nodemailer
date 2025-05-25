import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { TransportConfig, EmailServerConfig } from './config-manager.js';

export class CloudflareTransportFactory {
  /**
   * Creates a nodemailer transporter based on the provided configuration
   * Adapted for Cloudflare Workers environment
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

    return nodemailer.createTransporter(transportOptions);
  }

  /**
   * Creates SMTP transport options optimized for Cloudflare Workers
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
      // Disable pooling in Cloudflare Workers by default due to execution model
      pool: false,
      debug: options.debug || false,
      logger: options.debug || false,
      // Cloudflare Workers specific optimizations
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000,
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

    return transportOptions;
  }

  /**
   * Creates Gmail transport options for Cloudflare Workers
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
      pool: false, // Disable pooling in Cloudflare Workers
      debug: options.debug || false,
      logger: options.debug || false,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    };

    return transportOptions;
  }

  /**
   * Creates SES transport options for Cloudflare Workers
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

    return transportOptions;
  }

  /**
   * Verifies that a transporter can connect and authenticate
   * With timeout handling for Cloudflare Workers
   */
  public static async verifyTransporter(transporter: Transporter): Promise<void> {
    try {
      // Set a timeout for verification in Cloudflare Workers
      const verificationPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transport verification timeout')), 25000);
      });

      await Promise.race([verificationPromise, timeoutPromise]);
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
   * Creates a test account for development/testing purposes
   * Note: This may not work reliably in Cloudflare Workers due to network restrictions
   */
  public static async createTestAccount(): Promise<{
    user: string;
    pass: string;
    smtp: { host: string; port: number; secure: boolean };
    imap: { host: string; port: number; secure: boolean };
    pop3: { host: string; port: number; secure: boolean };
    web: string;
  }> {
    try {
      return await nodemailer.createTestAccount();
    } catch (error) {
      throw new Error('Failed to create test account. This feature may not work in Cloudflare Workers environment.');
    }
  }

  /**
   * Gets the preview URL for a test message (Ethereal Email)
   */
  public static getTestMessageUrl(info: any): string | null {
    return nodemailer.getTestMessageUrl(info) || null;
  }
} 