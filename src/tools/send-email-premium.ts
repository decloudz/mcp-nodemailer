import { z } from "zod";
import { experimental_PaidMcpAgent as PaidMcpAgent } from "@stripe/agent-toolkit/cloudflare";
import { EmailConfigManager } from "../email/config.js";
import { EmailTransportFactory } from "../email/transport.js";
import { EmailValidator, MCPEmailToolSchema } from "../email/validator.js";
import { REUSABLE_PAYMENT_REASON } from "../helpers/constants.js";

interface PremiumEmailToolConfig {
  STRIPE_SUBSCRIPTION_PRICE_ID: string;
  BASE_URL: string;
}

// Extended schema for premium features
const PremiumEmailSchema = MCPEmailToolSchema.extend({
  priority: z.enum(['high', 'normal', 'low']).optional().describe('Email priority level'),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string().describe('Base64 encoded content'),
    contentType: z.string().optional(),
  })).optional().describe('Email attachments'),
  headers: z.record(z.string()).optional().describe('Custom email headers'),
  trackOpens: z.boolean().optional().describe('Track email opens (premium feature)'),
  trackClicks: z.boolean().optional().describe('Track link clicks (premium feature)'),
});

export function sendEmailPremiumTool(agent: PaidMcpAgent<Env, any, any>, config: PremiumEmailToolConfig) {
  const server = agent.server;
  
  // Premium email tool with advanced features
  agent.paidTool(
    "send-email-premium",
    "Send emails with premium features including attachments, priority settings, tracking, and custom headers. Requires an active subscription.",
    PremiumEmailSchema,
    {
      paymentReason: REUSABLE_PAYMENT_REASON,
      priceId: config.STRIPE_SUBSCRIPTION_PRICE_ID,
      successUrl: `${config.BASE_URL}/payment/success`,
    },
    async (params: any) => {
      try {
        // Get email configuration from environment
        const configManager = new EmailConfigManager(agent.env);
        const emailConfig = configManager.buildConfiguration();
        
        // Validate configuration
        configManager.validateConfig(emailConfig);
        
        // Create transporter
        const transporter = EmailTransportFactory.createTransporter(emailConfig);
        
        // Validate parameters with premium schema
        const validatedParams = EmailValidator.validateMCPParams(params, PremiumEmailSchema);
        
        // Convert to email data format
        const emailData = EmailValidator.convertMCPParamsToEmailData(validatedParams, {
          defaultSender: emailConfig.defaultSender,
          defaultReplyTo: emailConfig.defaultReplyTo,
        });

        // Add premium features
        if (validatedParams.priority) {
          emailData.priority = validatedParams.priority;
        }

        if (validatedParams.headers) {
          emailData.headers = validatedParams.headers;
        }

        // Process attachments
        if (validatedParams.attachments && validatedParams.attachments.length > 0) {
          emailData.attachments = validatedParams.attachments.map((attachment: any) => ({
            filename: attachment.filename,
            content: Buffer.from(attachment.content, 'base64'),
            contentType: attachment.contentType || 'application/octet-stream',
          }));
        }

        // Add tracking headers if requested (premium feature)
        if (validatedParams.trackOpens || validatedParams.trackClicks) {
          emailData.headers = emailData.headers || {};
          
          if (validatedParams.trackOpens) {
            emailData.headers['X-Track-Opens'] = 'true';
          }
          
          if (validatedParams.trackClicks) {
            emailData.headers['X-Track-Clicks'] = 'true';
          }
        }

        // Log email request (for debugging)
        if (emailConfig.debug) {
          console.log(`Premium email request: ${JSON.stringify({
            to: emailData.to,
            subject: emailData.subject,
            from: emailData.from,
            priority: emailData.priority,
            hasHtml: !!emailData.html,
            attachmentCount: emailData.attachments?.length || 0,
            hasTracking: !!(validatedParams.trackOpens || validatedParams.trackClicks),
          })}`);
        }

        // Send email
        const info = await transporter.sendMail(emailData);

        // Check for test message URL (Ethereal Email)
        const testUrl = EmailTransportFactory.getTestMessageUrl(info);
        
        let responseMessage = `✨ Premium email sent successfully!\n\nMessage ID: ${info.messageId}`;
        
        if (validatedParams.priority) {
          responseMessage += `\nPriority: ${validatedParams.priority}`;
        }
        
        if (emailData.attachments?.length) {
          responseMessage += `\nAttachments: ${emailData.attachments.length} file(s)`;
        }
        
        if (validatedParams.trackOpens || validatedParams.trackClicks) {
          responseMessage += `\nTracking: ${[
            validatedParams.trackOpens && 'Opens',
            validatedParams.trackClicks && 'Clicks'
          ].filter(Boolean).join(', ')}`;
        }
        
        if (testUrl) {
          responseMessage += `\n🔗 Preview URL: ${testUrl}`;
        }
        
        if (info.response) {
          responseMessage += `\nServer response: ${info.response}`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: responseMessage,
            },
          ],
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Premium email sending failed: ${errorMessage}`);
        
        throw new Error(`Premium email failed to send: ${errorMessage}`);
      }
    }
  );
} 