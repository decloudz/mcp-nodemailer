import { z } from 'zod';

// Configuration schemas
const SMTPConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  auth: z.object({
    user: z.string().min(1, 'SMTP username is required'),
    pass: z.string().min(1, 'SMTP password is required'),
  }).optional(),
  service: z.string().optional(), // For well-known services like 'gmail'
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

export class EmailConfigManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  public buildConfiguration(): EmailServerConfig {
    // Determine transport type
    const transportType = this.getTransportType();
    
    let transport: TransportConfig;
    
    switch (transportType) {
      case 'gmail':
        transport = this.buildGmailConfig();
        break;
      case 'ses':
        transport = this.buildSESConfig();
        break;
      case 'smtp':
      default:
        transport = this.buildSMTPConfig();
        break;
    }

    return {
      transport,
      defaultSender: this.env.DEFAULT_SENDER_EMAIL,
      defaultReplyTo: this.parseReplyToAddresses(),
      debug: this.env.DEBUG_EMAIL === 'true',
      pool: this.env.SMTP_POOL === 'true',
      maxConnections: this.parseNumber(this.env.SMTP_MAX_CONNECTIONS, 5),
      maxMessages: this.parseNumber(this.env.SMTP_MAX_MESSAGES, 100),
    };
  }

  private getTransportType(): string {
    if (this.env.EMAIL_SERVICE === 'gmail') {
      return 'gmail';
    }
    if (this.env.EMAIL_SERVICE === 'ses') {
      return 'ses';
    }
    return 'smtp';
  }

  private buildSMTPConfig(): TransportConfig {
    const host = this.env.SMTP_HOST;
    const port = this.parseNumber(this.env.SMTP_PORT, 587);
    const secure = this.env.SMTP_SECURE === 'true';
    const user = this.env.SMTP_USER;
    const pass = this.env.SMTP_PASS;
    const service = this.env.SMTP_SERVICE;

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

  private buildGmailConfig(): TransportConfig {
    const user = this.env.GMAIL_USER;
    const pass = this.env.GMAIL_PASS;

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

  private buildSESConfig(): TransportConfig {
    const region = this.env.AWS_REGION || 'us-east-1';
    const accessKeyId = this.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = this.env.AWS_SECRET_ACCESS_KEY;

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

  private parseReplyToAddresses(): string[] {
    if (this.env.DEFAULT_REPLY_TO_EMAILS) {
      return this.env.DEFAULT_REPLY_TO_EMAILS.split(',').map(addr => addr.trim());
    }
    return [];
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  public validateConfig(config: EmailServerConfig): void {
    try {
      TransportConfigSchema.parse(config.transport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
      }
      throw error;
    }
  }
} 