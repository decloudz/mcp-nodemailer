import { z } from 'zod';

// Configuration schemas adapted for Cloudflare Workers environment
const SMTPConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  auth: z.object({
    user: z.string().min(1, 'SMTP username is required'),
    pass: z.string().min(1, 'SMTP password is required'),
  }).optional(),
  service: z.string().optional(),
});

const TransportConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('smtp'),
    config: SMTPConfigSchema,
  }),
  z.object({
    type: z.literal('gmail'),
    config: z.object({
      auth: z.object({
        user: z.string().email('Valid Gmail address required'),
        pass: z.string().min(1, 'Gmail password/app password required'),
      }),
    }),
  }),
  z.object({
    type: z.literal('ses'),
    config: z.object({
      region: z.string().default('us-east-1'),
      accessKeyId: z.string().min(1, 'AWS Access Key ID required'),
      secretAccessKey: z.string().min(1, 'AWS Secret Access Key required'),
    }),
  }),
]);

export type TransportConfig = z.infer<typeof TransportConfigSchema>;
export type SMTPConfig = z.infer<typeof SMTPConfigSchema>;

export interface EmailServerConfig {
  transport: TransportConfig;
  defaultSender?: string;
  defaultReplyTo?: string[];
  debug?: boolean;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
}

export class CloudflareEmailConfigManager {
  private config: EmailServerConfig;

  constructor(env: Env) {
    this.config = this.buildConfiguration(env);
  }

  private buildConfiguration(env: Env): EmailServerConfig {
    // Determine transport type from environment
    const transportType = this.getTransportType(env);
    
    let transport: TransportConfig;
    
    switch (transportType) {
      case 'gmail':
        transport = this.buildGmailConfig(env);
        break;
      case 'ses':
        transport = this.buildSESConfig(env);
        break;
      case 'smtp':
      default:
        transport = this.buildSMTPConfig(env);
        break;
    }

    return {
      transport,
      defaultSender: env.DEFAULT_SENDER_EMAIL,
      defaultReplyTo: this.parseReplyToAddresses(env.DEFAULT_REPLY_TO_EMAILS),
      debug: env.DEBUG_EMAIL === 'true',
      pool: env.SMTP_POOL === 'true',
      maxConnections: this.parseNumber(env.SMTP_MAX_CONNECTIONS, 5),
      maxMessages: this.parseNumber(env.SMTP_MAX_MESSAGES, 100),
    };
  }

  private getTransportType(env: Env): string {
    if (env.EMAIL_SERVICE === 'gmail') {
      return 'gmail';
    }
    if (env.EMAIL_SERVICE === 'ses') {
      return 'ses';
    }
    return 'smtp';
  }

  private buildSMTPConfig(env: Env): TransportConfig {
    const host = env.SMTP_HOST;
    const port = this.parseNumber(env.SMTP_PORT, 587);
    const secure = env.SMTP_SECURE === 'true';
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;
    const service = env.SMTP_SERVICE;

    if (!host) {
      throw new Error('SMTP host is required. Set SMTP_HOST environment variable.');
    }

    const config: SMTPConfig = {
      host,
      port,
      secure,
      service,
    };

    if (user && pass) {
      config.auth = { user, pass };
    }

    return {
      type: 'smtp',
      config,
    };
  }

  private buildGmailConfig(env: Env): TransportConfig {
    const user = env.GMAIL_USER;
    const pass = env.GMAIL_PASS;

    if (!user || !pass) {
      throw new Error('Gmail credentials required. Set GMAIL_USER and GMAIL_PASS environment variables.');
    }

    return {
      type: 'gmail',
      config: {
        auth: { user, pass },
      },
    };
  }

  private buildSESConfig(env: Env): TransportConfig {
    const region = env.AWS_REGION || 'us-east-1';
    const accessKeyId = env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials required. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }

    return {
      type: 'ses',
      config: {
        region,
        accessKeyId,
        secretAccessKey,
      },
    };
  }

  private parseReplyToAddresses(addresses?: string): string[] {
    if (!addresses) return [];
    return addresses.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
  }

  private parseNumber(value: any, defaultValue: number): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  public getConfig(): EmailServerConfig {
    return this.config;
  }

  public validateConfig(): void {
    try {
      TransportConfigSchema.parse(this.config.transport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Email configuration validation failed:\n${messages.join('\n')}`);
      }
      throw error;
    }
  }

  public getTransportInfo(): string {
    const config = this.config.transport;
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
} 