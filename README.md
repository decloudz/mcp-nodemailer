# Nodemailer MCP Server 📧

A flexible, provider-agnostic email sending MCP server using [nodemailer](https://nodemailer.com/) that supports multiple SMTP providers and authentication methods.

Built with:
- [Nodemailer](https://nodemailer.com/) - Universal email sending library
- [Anthropic MCP](https://docs.anthropic.com/en/docs/agents-and-tools/mcp) - Model Context Protocol
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development

## Features

- 🌐 **Universal SMTP Support** - Works with any SMTP provider
- 📧 **Multiple Transport Types** - SMTP, Gmail, AWS SES support
- 🔐 **Flexible Authentication** - Basic auth, OAuth2, API keys
- 🏊 **Connection Pooling** - Efficient connection management
- 📎 **Rich Email Features** - HTML content, attachments, CC/BCC
- 🛡️ **Type Safety** - Full TypeScript support with validation
- 🔧 **Easy Configuration** - CLI arguments and environment variables
- 🐛 **Debug Support** - Comprehensive logging and error handling

## Quick Start

### Option 1: Local Build

```bash
git clone <repository>
cd mcp-nodemailer
npm install
npm run build
```

### Option 2: Docker

```bash
# Build Docker image
docker build -t mcp-nodemailer .

# Run with SES SMTP
docker run --rm \
  -e SMTP_HOST="email-smtp.us-east-1.amazonaws.com" \
  -e SMTP_USER="AKIA256X4BH57AV2ZCHM" \
  -e SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o" \
  -e DEBUG="true" \
  mcp-nodemailer
```

### 2. Basic Configuration

#### Local Execution
```bash
# Using Gmail SMTP
./build/index.js --service gmail --user your-email@gmail.com --pass your-app-password

# Using AWS SES SMTP (tested configuration)
./build/index.js --host email-smtp.us-east-1.amazonaws.com --port 587 --user AKIA256X4BH57AV2ZCHM --pass BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o

# Using AWS SES API
./build/index.js --service ses --access-key-id AKIA... --secret-access-key secret...
```

#### Docker Execution
```bash
# Using Docker with SES SMTP
docker run --rm \
  -e SMTP_HOST="email-smtp.us-east-1.amazonaws.com" \
  -e SMTP_USER="AKIA256X4BH57AV2ZCHM" \
  -e SMTP_PASS="BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o" \
  mcp-nodemailer

# Using Docker Compose
docker-compose --profile ses-smtp up
```

### 3. Add to Cursor or Claude Desktop

#### Cursor Configuration

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "nodemailer": {
      "type": "command",
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-nodemailer/build/index.js",
        "--service", "gmail",
        "--user", "your-email@gmail.com",
        "--pass", "your-app-password"
      ]
    }
  }
}
```

#### Claude Desktop Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "nodemailer": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-nodemailer/build/index.js"
      ],
      "env": {
        "EMAIL_SERVICE": "gmail",
        "GMAIL_USER": "your-email@gmail.com",
        "GMAIL_PASS": "your-app-password"
      }
    }
  }
}
```

## Configuration Options

### Transport Types

#### SMTP (Universal)
```bash
--service smtp
--host smtp.example.com
--port 587
--secure                    # Use TLS (port 465)
--user username
--pass password
```

#### Gmail
```bash
--service gmail
--user your-email@gmail.com
--pass your-app-password    # Use App Password, not regular password
```

#### AWS SES
```bash
--service ses
--region us-east-1
--access-key-id AKIA...
--secret-access-key secret...
```

### General Options

```bash
--sender email@example.com          # Default sender address
--reply-to email@example.com        # Default reply-to address
--debug                             # Enable debug logging
--pool                              # Enable connection pooling
--max-connections 5                 # Max pool connections
--max-messages 100                  # Max messages per connection
--help                              # Show help
```

### Environment Variables

All CLI options can be set via environment variables:

```bash
# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=username
SMTP_PASS=password

# Gmail Configuration
EMAIL_SERVICE=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# AWS SES Configuration
EMAIL_SERVICE=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...

# General Configuration
SENDER_EMAIL_ADDRESS=default@example.com
REPLY_TO_EMAIL_ADDRESSES=reply1@example.com,reply2@example.com
DEBUG=true
SMTP_POOL=true
SMTP_MAX_CONNECTIONS=5
SMTP_MAX_MESSAGES=100
```

## Usage Examples

### Basic Email
```
Send an email to user@example.com with subject "Hello" and text "Hello World!"
```

### HTML Email
```
Send an HTML email to user@example.com with subject "Newsletter" and HTML content "<h1>Welcome!</h1><p>Thanks for subscribing!</p>"
```

### Email with CC/BCC
```
Send an email to user@example.com, CC manager@example.com, BCC archive@example.com with subject "Meeting Notes"
```

## Provider-Specific Setup

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use App Password** (not your regular password)

```bash
./build/index.js --service gmail --user your-email@gmail.com --pass your-16-char-app-password
```

### AWS SES Setup

1. **Create IAM User** with SES permissions
2. **Verify Domain/Email** in SES console
3. **Get Access Keys** from IAM

```bash
./build/index.js --service ses --region us-east-1 --access-key-id AKIA... --secret-access-key secret...
```

### Custom SMTP Setup

Works with any SMTP provider (Mailgun, SendGrid, Postmark, etc.):

```bash
# Mailgun
./build/index.js --host smtp.mailgun.org --port 587 --user postmaster@your-domain.com --pass your-api-key

# SendGrid
./build/index.js --host smtp.sendgrid.net --port 587 --user apikey --pass your-api-key

# Postmark
./build/index.js --host smtp.postmarkapp.com --port 587 --user your-server-token --pass your-server-token
```

## Advanced Features

### Connection Pooling

Enable connection pooling for better performance:

```bash
./build/index.js --pool --max-connections 10 --max-messages 500 --host smtp.example.com --user username --pass password
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
./build/index.js --debug --host smtp.example.com --user username --pass password
```

### Test Account (Development)

For development/testing, nodemailer can create test accounts automatically:

```bash
# No configuration needed - creates Ethereal test account
./build/index.js
```

## Troubleshooting

### Common Issues

#### Gmail Authentication Errors
- Use App Passwords, not regular passwords
- Enable 2-Factor Authentication first
- Check for "Less secure app access" (deprecated)

#### SMTP Connection Timeouts
- Check firewall settings
- Verify host and port
- Try different ports (25, 465, 587, 2525)

#### TLS/SSL Errors
- Use `--secure` for port 465
- Don't use `--secure` for port 587 (uses STARTTLS)
- Check certificate validity

#### DNS Resolution Issues
- Use IP address instead of hostname
- Check network connectivity
- Verify DNS settings

### Debug Information

Run with `--debug` flag to see detailed connection information:

```bash
./build/index.js --debug --host smtp.gmail.com --port 587 --user user@gmail.com --pass app-password
```

### Verification

The server automatically verifies the transport connection on startup. If verification fails, check:

1. **Credentials** - Username and password
2. **Network** - Connectivity to SMTP server
3. **Firewall** - Port access (25, 465, 587, 2525)
4. **Authentication** - Method and requirements

## Development

### Project Structure

```
mcp-nodemailer/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── config-manager.ts     # Configuration handling
│   ├── transport-factory.ts  # Transport creation
│   └── email-validator.ts    # Email validation
├── build/                    # Compiled JavaScript
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile                # Docker image definition
├── DOCKER.md                 # Docker documentation
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
# Local build
npm run build      # Build TypeScript
npm run dev        # Watch mode
npm start          # Run built server

# Docker build
npm run docker:build          # Build Docker image
npm run docker:run            # Run Docker container
npm run docker:compose-ses    # Run with SES configuration
```

### Testing

```bash
# Local testing
./build/index.js --help                    # Show help
./test-ses.sh                              # Test SES configuration

# Docker testing
docker run --rm mcp-nodemailer --help      # Show help in container
docker-compose --profile test up           # Test with Ethereal Email

# Test with real SES SMTP
./build/index.js --debug --host email-smtp.us-east-1.amazonaws.com --user AKIA256X4BH57AV2ZCHM --pass BEByPtg3+uQU3QVdUvpy7EZKlidtPTYenNWYcFcP3s4o
```

## Comparison with Resend MCP

| Feature | Nodemailer MCP | Resend MCP |
|---------|----------------|------------|
| **Providers** | Any SMTP provider | Resend only |
| **Authentication** | Multiple methods | API key only |
| **Cost** | Provider-dependent | Resend pricing |
| **Setup** | More configuration | Simpler setup |
| **Flexibility** | High | Limited |
| **Features** | Full SMTP features | Resend features |

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- 📖 [Nodemailer Documentation](https://nodemailer.com/)
- 🔧 [MCP Documentation](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- 🐛 [Report Issues](https://github.com/your-repo/issues) 