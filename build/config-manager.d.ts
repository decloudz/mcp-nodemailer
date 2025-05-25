import { z } from 'zod';
declare const SMTPConfigSchema: z.ZodObject<{
    host: z.ZodString;
    port: z.ZodDefault<z.ZodNumber>;
    secure: z.ZodDefault<z.ZodBoolean>;
    auth: z.ZodOptional<z.ZodObject<{
        user: z.ZodString;
        pass: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: string;
        pass: string;
    }, {
        user: string;
        pass: string;
    }>>;
    service: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
        user: string;
        pass: string;
    } | undefined;
    service?: string | undefined;
}, {
    host: string;
    port?: number | undefined;
    secure?: boolean | undefined;
    auth?: {
        user: string;
        pass: string;
    } | undefined;
    service?: string | undefined;
}>;
declare const TransportConfigSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"smtp">;
    config: z.ZodObject<{
        host: z.ZodString;
        port: z.ZodDefault<z.ZodNumber>;
        secure: z.ZodDefault<z.ZodBoolean>;
        auth: z.ZodOptional<z.ZodObject<{
            user: z.ZodString;
            pass: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            user: string;
            pass: string;
        }, {
            user: string;
            pass: string;
        }>>;
        service: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        secure: boolean;
        auth?: {
            user: string;
            pass: string;
        } | undefined;
        service?: string | undefined;
    }, {
        host: string;
        port?: number | undefined;
        secure?: boolean | undefined;
        auth?: {
            user: string;
            pass: string;
        } | undefined;
        service?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "smtp";
    config: {
        host: string;
        port: number;
        secure: boolean;
        auth?: {
            user: string;
            pass: string;
        } | undefined;
        service?: string | undefined;
    };
}, {
    type: "smtp";
    config: {
        host: string;
        port?: number | undefined;
        secure?: boolean | undefined;
        auth?: {
            user: string;
            pass: string;
        } | undefined;
        service?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"gmail">;
    config: z.ZodObject<{
        auth: z.ZodObject<{
            user: z.ZodString;
            pass: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            user: string;
            pass: string;
        }, {
            user: string;
            pass: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        auth: {
            user: string;
            pass: string;
        };
    }, {
        auth: {
            user: string;
            pass: string;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    type: "gmail";
    config: {
        auth: {
            user: string;
            pass: string;
        };
    };
}, {
    type: "gmail";
    config: {
        auth: {
            user: string;
            pass: string;
        };
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"ses">;
    config: z.ZodObject<{
        region: z.ZodDefault<z.ZodString>;
        accessKeyId: z.ZodString;
        secretAccessKey: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
    }, {
        accessKeyId: string;
        secretAccessKey: string;
        region?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ses";
    config: {
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
    };
}, {
    type: "ses";
    config: {
        accessKeyId: string;
        secretAccessKey: string;
        region?: string | undefined;
    };
}>]>;
export type TransportConfig = z.infer<typeof TransportConfigSchema>;
export type SMTPConfig = z.infer<typeof SMTPConfigSchema>;
export interface ServerConfig {
    transport: TransportConfig;
    defaultSender?: string;
    defaultReplyTo?: string[];
    debug?: boolean;
    pool?: boolean;
    maxConnections?: number;
    maxMessages?: number;
}
export declare class ConfigurationManager {
    private argv;
    private config;
    constructor(args?: string[]);
    private buildConfiguration;
    private getTransportType;
    private buildSMTPConfig;
    private buildGmailConfig;
    private buildSESConfig;
    private parseReplyToAddresses;
    private parseNumber;
    getConfig(): ServerConfig;
    validateConfig(): void;
    printUsage(): void;
}
export {};
//# sourceMappingURL=config-manager.d.ts.map