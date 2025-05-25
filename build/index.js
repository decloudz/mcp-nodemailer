#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConfigurationManager } from './config-manager.js';
import { TransportFactory } from './transport-factory.js';
import { EmailValidator } from './email-validator.js';
import { z } from 'zod';
class NodemailerMCPServer {
    server;
    configManager;
    transporter;
    constructor() {
        this.server = new McpServer({
            name: 'nodemailer-email-service',
            version: '1.0.0',
        });
        this.configManager = new ConfigurationManager();
        this.setupServer();
    }
    setupServer() {
        try {
            // Validate configuration
            this.configManager.validateConfig();
            const config = this.configManager.getConfig();
            // Create transporter
            this.transporter = TransportFactory.createTransporter(config);
            // Log transport info
            const transportInfo = TransportFactory.getTransportInfo(config.transport);
            console.error(`Nodemailer MCP Server initialized with ${transportInfo}`);
            if (config.debug) {
                console.error('Debug mode enabled');
            }
            if (config.pool) {
                console.error(`Connection pooling enabled (max connections: ${config.maxConnections}, max messages: ${config.maxMessages})`);
            }
            // Setup MCP tool
            this.setupEmailTool();
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(`Configuration error: ${error.message}`);
                this.configManager.printUsage();
                process.exit(1);
            }
            throw error;
        }
    }
    setupEmailTool() {
        const config = this.configManager.getConfig();
        // Determine if we need to require from/replyTo parameters
        const requireFrom = !config.defaultSender;
        const requireReplyTo = !config.defaultReplyTo || config.defaultReplyTo.length === 0;
        // Create dynamic schema based on configuration
        const toolSchema = EmailValidator.createMCPToolSchema({
            requireFrom,
            requireReplyTo,
        });
        this.server.tool('send-email', 'Send an email using Nodemailer with flexible transport support', toolSchema, async (params) => {
            try {
                console.error(`Debug - Sending email with transport: ${TransportFactory.getTransportInfo(config.transport)}`);
                // Validate parameters
                const validatedParams = EmailValidator.validateMCPParams(params, z.object(toolSchema));
                // Convert to email data format
                const emailData = EmailValidator.convertMCPParamsToEmailData(validatedParams, {
                    defaultSender: config.defaultSender,
                    defaultReplyTo: config.defaultReplyTo,
                });
                console.error(`Email request: ${JSON.stringify({
                    to: emailData.to,
                    subject: emailData.subject,
                    from: emailData.from,
                    hasHtml: !!emailData.html,
                    hasAttachments: !!emailData.attachments?.length,
                })}`);
                // Send email
                const info = await this.transporter.sendMail(emailData);
                // Check for test message URL (Ethereal Email)
                const testUrl = TransportFactory.getTestMessageUrl(info);
                let responseMessage = `Email sent successfully! Message ID: ${info.messageId}`;
                if (testUrl) {
                    responseMessage += `\nPreview URL: ${testUrl}`;
                }
                if (info.response) {
                    responseMessage += `\nServer response: ${info.response}`;
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: responseMessage,
                        },
                    ],
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error(`Email sending failed: ${errorMessage}`);
                throw new Error(`Email failed to send: ${errorMessage}`);
            }
        });
    }
    async start() {
        try {
            // Verify transporter connection
            console.error('Verifying transport connection...');
            await TransportFactory.verifyTransporter(this.transporter);
            console.error('Transport verification successful');
            // Start MCP server
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            console.error('Nodemailer MCP Server running on stdio');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to start server: ${errorMessage}`);
            // If verification fails, provide helpful error message
            if (errorMessage.includes('verification failed')) {
                console.error('\nTransport verification failed. Please check your configuration:');
                console.error('- Verify SMTP host, port, and credentials');
                console.error('- Check network connectivity');
                console.error('- Ensure authentication method is correct');
                console.error('- For Gmail, use App Passwords instead of regular passwords');
                console.error('\nUse --debug flag for more detailed error information');
            }
            process.exit(1);
        }
    }
    async shutdown() {
        try {
            if (this.transporter) {
                // Close transporter connections
                this.transporter.close();
                console.error('Transporter connections closed');
            }
        }
        catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
}
// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.error('\nReceived SIGINT, shutting down gracefully...');
    if (server) {
        await server.shutdown();
    }
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.error('\nReceived SIGTERM, shutting down gracefully...');
    if (server) {
        await server.shutdown();
    }
    process.exit(0);
});
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Check for help flag first
if (process.argv.includes('--help') || process.argv.includes('-h')) {
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
    process.exit(0);
}
// Main execution
const server = new NodemailerMCPServer();
async function main() {
    try {
        await server.start();
    }
    catch (error) {
        console.error('Fatal error in main():', error);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map