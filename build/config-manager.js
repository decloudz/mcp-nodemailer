import minimist from 'minimist';
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
export class ConfigurationManager {
    argv;
    config;
    constructor(args = process.argv.slice(2)) {
        this.argv = minimist(args);
        // Only build configuration if not showing help
        if (!args.includes('--help') && !args.includes('-h')) {
            this.config = this.buildConfiguration();
        }
        else {
            // Dummy config for help display
            this.config = {};
        }
    }
    buildConfiguration() {
        // Determine transport type
        const transportType = this.getTransportType();
        let transport;
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
            defaultSender: this.argv.sender || process.env.SENDER_EMAIL_ADDRESS,
            defaultReplyTo: this.parseReplyToAddresses(),
            debug: this.argv.debug || process.env.DEBUG === 'true',
            pool: this.argv.pool || process.env.SMTP_POOL === 'true',
            maxConnections: this.parseNumber(this.argv['max-connections'] || process.env.SMTP_MAX_CONNECTIONS, 5),
            maxMessages: this.parseNumber(this.argv['max-messages'] || process.env.SMTP_MAX_MESSAGES, 100),
        };
    }
    getTransportType() {
        if (this.argv.service === 'gmail' || process.env.EMAIL_SERVICE === 'gmail') {
            return 'gmail';
        }
        if (this.argv.service === 'ses' || process.env.EMAIL_SERVICE === 'ses') {
            return 'ses';
        }
        return 'smtp';
    }
    buildSMTPConfig() {
        const host = this.argv.host || process.env.SMTP_HOST;
        const port = this.parseNumber(this.argv.port || process.env.SMTP_PORT, 587);
        const secure = this.argv.secure || process.env.SMTP_SECURE === 'true';
        const user = this.argv.user || process.env.SMTP_USER;
        const pass = this.argv.pass || this.argv.password || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
        const service = this.argv.service || process.env.SMTP_SERVICE;
        if (!host) {
            throw new Error('SMTP host is required. Use --host argument or SMTP_HOST environment variable.');
        }
        const config = {
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
    buildGmailConfig() {
        const user = this.argv.user || process.env.GMAIL_USER;
        const pass = this.argv.pass || this.argv.password || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
        if (!user || !pass) {
            throw new Error('Gmail credentials required. Use --user and --pass arguments or GMAIL_USER and GMAIL_PASS environment variables.');
        }
        return {
            type: 'gmail',
            config: {
                auth: { user, pass },
            },
        };
    }
    buildSESConfig() {
        const region = this.argv.region || process.env.AWS_REGION || 'us-east-1';
        const accessKeyId = this.argv['access-key-id'] || process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = this.argv['secret-access-key'] || process.env.AWS_SECRET_ACCESS_KEY;
        if (!accessKeyId || !secretAccessKey) {
            throw new Error('AWS credentials required. Use --access-key-id and --secret-access-key arguments or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
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
    parseReplyToAddresses() {
        let addresses = [];
        if (Array.isArray(this.argv['reply-to'])) {
            addresses = this.argv['reply-to'];
        }
        else if (typeof this.argv['reply-to'] === 'string') {
            addresses = [this.argv['reply-to']];
        }
        else if (process.env.REPLY_TO_EMAIL_ADDRESSES) {
            addresses = process.env.REPLY_TO_EMAIL_ADDRESSES.split(',').map(addr => addr.trim());
        }
        return addresses;
    }
    parseNumber(value, defaultValue) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    getConfig() {
        return this.config;
    }
    validateConfig() {
        try {
            TransportConfigSchema.parse(this.config.transport);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
            }
            throw error;
        }
    }
    printUsage() {
        console.log(`
Usage: mcp-nodemailer [options]

Transport Options:
  --service <service>        Email service: smtp, gmail, ses (default: smtp)
  
SMTP Options:
  --host <host>             SMTP server hostname
  --port <port>             SMTP server port (default: 587)
  --secure                  Use secure connection (TLS)
  --user <username>         SMTP username
  --pass <password>         SMTP password

Gmail Options:
  --user <email>            Gmail email address
  --pass <password>         Gmail password or app password

SES Options:
  --region <region>         AWS region (default: us-east-1)
  --access-key-id <key>     AWS Access Key ID
  --secret-access-key <key> AWS Secret Access Key

General Options:
  --sender <email>          Default sender email address
  --reply-to <email>        Default reply-to email address(es)
  --debug                   Enable debug logging
  --pool                    Enable connection pooling
  --max-connections <num>   Maximum pool connections (default: 5)
  --max-messages <num>      Maximum messages per connection (default: 100)

Environment Variables:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  GMAIL_USER, GMAIL_PASS
  AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  SENDER_EMAIL_ADDRESS, REPLY_TO_EMAIL_ADDRESSES
  DEBUG, SMTP_POOL, SMTP_MAX_CONNECTIONS, SMTP_MAX_MESSAGES

Examples:
  # SMTP
  mcp-nodemailer --host smtp.gmail.com --port 587 --user user@gmail.com --pass password

  # Gmail
  mcp-nodemailer --service gmail --user user@gmail.com --pass app-password

  # SES
  mcp-nodemailer --service ses --access-key-id AKIA... --secret-access-key secret...
`);
    }
}
//# sourceMappingURL=config-manager.js.map