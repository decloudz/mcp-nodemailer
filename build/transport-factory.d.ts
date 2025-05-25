import type { Transporter } from 'nodemailer';
import type { TransportConfig, ServerConfig } from './config-manager.js';
export declare class TransportFactory {
    /**
     * Creates a nodemailer transporter based on the provided configuration
     */
    static createTransporter(config: ServerConfig): Transporter;
    /**
     * Creates SMTP transport options
     */
    private static createSMTPOptions;
    /**
     * Creates Gmail transport options using the gmail service
     */
    private static createGmailOptions;
    /**
     * Creates SES transport options
     */
    private static createSESOptions;
    /**
     * Verifies that a transporter can connect and authenticate
     */
    static verifyTransporter(transporter: Transporter): Promise<void>;
    /**
     * Gets information about the transport configuration for logging
     */
    static getTransportInfo(config: TransportConfig): string;
    /**
     * Creates a test account for development/testing purposes
     */
    static createTestAccount(): Promise<{
        user: string;
        pass: string;
        smtp: {
            host: string;
            port: number;
            secure: boolean;
        };
        imap: {
            host: string;
            port: number;
            secure: boolean;
        };
        pop3: {
            host: string;
            port: number;
            secure: boolean;
        };
        web: string;
    }>;
    /**
     * Gets the preview URL for a test message (Ethereal Email)
     */
    static getTestMessageUrl(info: any): string | null;
}
//# sourceMappingURL=transport-factory.d.ts.map