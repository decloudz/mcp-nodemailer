import { z } from 'zod';
declare const AttachmentSchema: z.ZodEffects<z.ZodObject<{
    filename: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Buffer<ArrayBufferLike>, z.ZodTypeDef, Buffer<ArrayBufferLike>>]>>;
    path: z.ZodOptional<z.ZodString>;
    href: z.ZodOptional<z.ZodString>;
    contentType: z.ZodOptional<z.ZodString>;
    contentDisposition: z.ZodOptional<z.ZodEnum<["attachment", "inline"]>>;
    cid: z.ZodOptional<z.ZodString>;
    encoding: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    raw: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path?: string | undefined;
    filename?: string | undefined;
    content?: string | Buffer<ArrayBufferLike> | undefined;
    href?: string | undefined;
    contentType?: string | undefined;
    contentDisposition?: "attachment" | "inline" | undefined;
    cid?: string | undefined;
    encoding?: string | undefined;
    headers?: Record<string, string> | undefined;
    raw?: string | undefined;
}, {
    path?: string | undefined;
    filename?: string | undefined;
    content?: string | Buffer<ArrayBufferLike> | undefined;
    href?: string | undefined;
    contentType?: string | undefined;
    contentDisposition?: "attachment" | "inline" | undefined;
    cid?: string | undefined;
    encoding?: string | undefined;
    headers?: Record<string, string> | undefined;
    raw?: string | undefined;
}>, {
    path?: string | undefined;
    filename?: string | undefined;
    content?: string | Buffer<ArrayBufferLike> | undefined;
    href?: string | undefined;
    contentType?: string | undefined;
    contentDisposition?: "attachment" | "inline" | undefined;
    cid?: string | undefined;
    encoding?: string | undefined;
    headers?: Record<string, string> | undefined;
    raw?: string | undefined;
}, {
    path?: string | undefined;
    filename?: string | undefined;
    content?: string | Buffer<ArrayBufferLike> | undefined;
    href?: string | undefined;
    contentType?: string | undefined;
    contentDisposition?: "attachment" | "inline" | undefined;
    cid?: string | undefined;
    encoding?: string | undefined;
    headers?: Record<string, string> | undefined;
    raw?: string | undefined;
}>;
export declare const EmailDataSchema: z.ZodEffects<z.ZodObject<{
    to: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    subject: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    html: z.ZodOptional<z.ZodString>;
    cc: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    bcc: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    from: z.ZodOptional<z.ZodString>;
    replyTo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    priority: z.ZodOptional<z.ZodEnum<["high", "normal", "low"]>>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        filename: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodType<Buffer<ArrayBufferLike>, z.ZodTypeDef, Buffer<ArrayBufferLike>>]>>;
        path: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        contentType: z.ZodOptional<z.ZodString>;
        contentDisposition: z.ZodOptional<z.ZodEnum<["attachment", "inline"]>>;
        cid: z.ZodOptional<z.ZodString>;
        encoding: z.ZodOptional<z.ZodString>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        raw: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }, {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }>, {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }, {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }>, "many">>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    messageId: z.ZodOptional<z.ZodString>;
    references: z.ZodOptional<z.ZodString>;
    inReplyTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    to: string | string[];
    subject: string;
    headers?: Record<string, string> | undefined;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    from?: string | undefined;
    replyTo?: string | string[] | undefined;
    priority?: "high" | "normal" | "low" | undefined;
    attachments?: {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }[] | undefined;
    scheduledAt?: string | undefined;
    messageId?: string | undefined;
    references?: string | undefined;
    inReplyTo?: string | undefined;
}, {
    to: string | string[];
    subject: string;
    headers?: Record<string, string> | undefined;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    from?: string | undefined;
    replyTo?: string | string[] | undefined;
    priority?: "high" | "normal" | "low" | undefined;
    attachments?: {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }[] | undefined;
    scheduledAt?: string | undefined;
    messageId?: string | undefined;
    references?: string | undefined;
    inReplyTo?: string | undefined;
}>, {
    to: string | string[];
    subject: string;
    headers?: Record<string, string> | undefined;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    from?: string | undefined;
    replyTo?: string | string[] | undefined;
    priority?: "high" | "normal" | "low" | undefined;
    attachments?: {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }[] | undefined;
    scheduledAt?: string | undefined;
    messageId?: string | undefined;
    references?: string | undefined;
    inReplyTo?: string | undefined;
}, {
    to: string | string[];
    subject: string;
    headers?: Record<string, string> | undefined;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    from?: string | undefined;
    replyTo?: string | string[] | undefined;
    priority?: "high" | "normal" | "low" | undefined;
    attachments?: {
        path?: string | undefined;
        filename?: string | undefined;
        content?: string | Buffer<ArrayBufferLike> | undefined;
        href?: string | undefined;
        contentType?: string | undefined;
        contentDisposition?: "attachment" | "inline" | undefined;
        cid?: string | undefined;
        encoding?: string | undefined;
        headers?: Record<string, string> | undefined;
        raw?: string | undefined;
    }[] | undefined;
    scheduledAt?: string | undefined;
    messageId?: string | undefined;
    references?: string | undefined;
    inReplyTo?: string | undefined;
}>;
export type EmailData = z.infer<typeof EmailDataSchema>;
export declare const MCPEmailToolSchema: z.ZodObject<{
    to: z.ZodString;
    subject: z.ZodString;
    text: z.ZodString;
    html: z.ZodOptional<z.ZodString>;
    cc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    scheduledAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    to: string;
    subject: string;
    text: string;
    html?: string | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    scheduledAt?: string | undefined;
}, {
    to: string;
    subject: string;
    text: string;
    html?: string | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    scheduledAt?: string | undefined;
}>;
export type MCPEmailToolParams = z.infer<typeof MCPEmailToolSchema>;
export declare class EmailValidator {
    /**
     * Validates email data using the EmailDataSchema
     */
    static validateEmailData(data: unknown): EmailData;
    /**
     * Validates MCP tool parameters
     */
    static validateMCPParams(data: unknown, schema: z.ZodSchema): any;
    /**
     * Converts MCP tool parameters to EmailData format
     */
    static convertMCPParamsToEmailData(params: MCPEmailToolParams & {
        from?: string;
        replyTo?: string[];
    }, defaults: {
        defaultSender?: string;
        defaultReplyTo?: string[];
    }): EmailData;
    /**
     * Creates a dynamic MCP tool schema based on configuration
     */
    static createMCPToolSchema(config: {
        requireFrom: boolean;
        requireReplyTo: boolean;
    }): any;
    /**
     * Validates individual email address
     */
    static validateEmailAddress(email: string): boolean;
    /**
     * Validates array of email addresses
     */
    static validateEmailAddresses(emails: string[]): boolean;
    /**
     * Sanitizes email content to prevent injection attacks
     */
    static sanitizeEmailContent(content: string): string;
    /**
     * Validates attachment data
     */
    static validateAttachment(attachment: unknown): z.infer<typeof AttachmentSchema>;
}
export {};
//# sourceMappingURL=email-validator.d.ts.map