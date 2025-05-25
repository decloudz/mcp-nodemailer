import { z } from 'zod';
// Email address validation schema
const EmailSchema = z.string().email('Invalid email address');
// Email address array schema
const EmailArraySchema = z.array(EmailSchema).min(1, 'At least one email address required');
// Attachment schema
const AttachmentSchema = z.object({
    filename: z.string().optional(),
    content: z.union([z.string(), z.instanceof(Buffer)]).optional(),
    path: z.string().optional(),
    href: z.string().url().optional(),
    contentType: z.string().optional(),
    contentDisposition: z.enum(['attachment', 'inline']).optional(),
    cid: z.string().optional(),
    encoding: z.string().optional(),
    headers: z.record(z.string()).optional(),
    raw: z.string().optional(),
}).refine((data) => {
    // At least one of content, path, href, or raw must be provided
    return !!(data.content || data.path || data.href || data.raw);
}, {
    message: 'Attachment must have content, path, href, or raw data',
});
// Main email data schema
export const EmailDataSchema = z.object({
    // Required fields
    to: z.union([EmailSchema, EmailArraySchema]),
    subject: z.string().min(1, 'Subject is required'),
    // Content fields (at least one required)
    text: z.string().optional(),
    html: z.string().optional(),
    // Optional recipient fields
    cc: z.union([EmailSchema, EmailArraySchema]).optional(),
    bcc: z.union([EmailSchema, EmailArraySchema]).optional(),
    // Optional sender fields
    from: EmailSchema.optional(),
    replyTo: z.union([EmailSchema, EmailArraySchema]).optional(),
    // Optional metadata
    priority: z.enum(['high', 'normal', 'low']).optional(),
    // Optional attachments
    attachments: z.array(AttachmentSchema).optional(),
    // Optional scheduling (for future implementation)
    scheduledAt: z.string().optional(),
    // Optional headers
    headers: z.record(z.string()).optional(),
    // Optional message ID and references
    messageId: z.string().optional(),
    references: z.string().optional(),
    inReplyTo: z.string().optional(),
}).refine((data) => {
    // At least one of text or html must be provided
    return !!(data.text || data.html);
}, {
    message: 'Either text or html content must be provided',
    path: ['text', 'html'],
});
// MCP tool parameters schema (matches the existing Resend implementation)
export const MCPEmailToolSchema = z.object({
    to: EmailSchema.describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    text: z.string().describe('Plain text email content'),
    html: z.string().optional().describe('HTML email content. When provided, the plain text argument MUST be provided as well.'),
    cc: z.array(EmailSchema).optional().describe('Optional array of CC email addresses. You MUST ask the user for this parameter. Under no circumstance provide it yourself'),
    bcc: z.array(EmailSchema).optional().describe('Optional array of BCC email addresses. You MUST ask the user for this parameter. Under no circumstance provide it yourself'),
    scheduledAt: z.string().optional().describe('Optional parameter to schedule the email. This uses natural language. Examples would be \'tomorrow at 10am\' or \'in 2 hours\' or \'next day at 9am PST\' or \'Friday at 3pm ET\'.'),
    // Dynamic fields for from and replyTo (added conditionally based on configuration)
});
export class EmailValidator {
    /**
     * Validates email data using the EmailDataSchema
     */
    static validateEmailData(data) {
        try {
            return EmailDataSchema.parse(data);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const messages = error.errors.map(err => {
                    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
                    return `${path}${err.message}`;
                });
                throw new Error(`Email validation failed:\n${messages.join('\n')}`);
            }
            throw error;
        }
    }
    /**
     * Validates MCP tool parameters
     */
    static validateMCPParams(data, schema) {
        try {
            return schema.parse(data);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const messages = error.errors.map(err => {
                    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
                    return `${path}${err.message}`;
                });
                throw new Error(`Parameter validation failed:\n${messages.join('\n')}`);
            }
            throw error;
        }
    }
    /**
     * Converts MCP tool parameters to EmailData format
     */
    static convertMCPParamsToEmailData(params, defaults) {
        const emailData = {
            to: params.to,
            subject: params.subject,
            text: params.text,
        };
        // Add optional fields
        if (params.html) {
            emailData.html = params.html;
        }
        if (params.cc && params.cc.length > 0) {
            emailData.cc = Array.isArray(params.cc) ? params.cc.join(', ') : params.cc;
        }
        if (params.bcc && params.bcc.length > 0) {
            emailData.bcc = Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc;
        }
        // Handle sender
        const fromAddress = params.from || defaults.defaultSender;
        if (fromAddress) {
            emailData.from = fromAddress;
        }
        // Handle reply-to
        const replyToAddresses = params.replyTo || defaults.defaultReplyTo;
        if (replyToAddresses && replyToAddresses.length > 0) {
            emailData.replyTo = Array.isArray(replyToAddresses) ? replyToAddresses.join(', ') : replyToAddresses;
        }
        // Handle scheduling (for future implementation)
        if (params.scheduledAt) {
            emailData.scheduledAt = params.scheduledAt;
        }
        return emailData;
    }
    /**
     * Creates a dynamic MCP tool schema based on configuration
     */
    static createMCPToolSchema(config) {
        let schemaShape = { ...MCPEmailToolSchema.shape };
        // Add conditional fields
        if (config.requireFrom) {
            schemaShape.from = EmailSchema
                .nonempty()
                .describe('Sender email address. You MUST ask the user for this parameter. Under no circumstance provide it yourself');
        }
        if (config.requireReplyTo) {
            schemaShape.replyTo = z.array(EmailSchema)
                .optional()
                .describe('Optional email addresses for the email readers to reply to. You MUST ask the user for this parameter. Under no circumstance provide it yourself');
        }
        return schemaShape;
    }
    /**
     * Validates individual email address
     */
    static validateEmailAddress(email) {
        try {
            EmailSchema.parse(email);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Validates array of email addresses
     */
    static validateEmailAddresses(emails) {
        try {
            EmailArraySchema.parse(emails);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Sanitizes email content to prevent injection attacks
     */
    static sanitizeEmailContent(content) {
        // Basic sanitization - remove potentially dangerous content
        return content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: protocols
            .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }
    /**
     * Validates attachment data
     */
    static validateAttachment(attachment) {
        try {
            return AttachmentSchema.parse(attachment);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                throw new Error(`Attachment validation failed:\n${messages.join('\n')}`);
            }
            throw error;
        }
    }
}
//# sourceMappingURL=email-validator.js.map