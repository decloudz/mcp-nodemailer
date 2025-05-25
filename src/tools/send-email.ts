import { z } from "zod";
import { experimental_PaidMcpAgent as PaidMcpAgent } from "@stripe/agent-toolkit/cloudflare";
import { CloudflareEmailConfigManager } from "../email/config-manager.js";
import { CloudflareTransportFactory } from "../email/transport-factory.js";
import { CloudflareEmailValidator } from "../email/validator.js";
import { EmailConfigManager } from "../email/config.js";
import { EmailTransportFactory } from "../email/transport.js";
import { EmailValidator, MCPEmailToolSchema } from "../email/validator.js";

interface EmailToolConfig {
  BASE_URL: string;
}

export function sendEmailTool(agent: PaidMcpAgent<Env, any, any>) {
  const server = agent.server;
  
  // @ts-ignore
  server.tool(
    "send-email",
    "Send an email using nodemailer with flexible SMTP transport support. This is a free tool that requires user authentication.",
    MCPEmailToolSchema,
    async (params: any) => {
      try {
        // Get email configuration from environment
        const configManager = new EmailConfigManager(agent.env);
        const emailConfig = configManager.buildConfiguration();
        
        // Validate configuration
        configManager.validateConfig(emailConfig);
        
        // Create transporter
        const transporter = EmailTransportFactory.createTransporter(emailConfig);
        
        // Validate parameters
        const validatedParams = EmailValidator.validateMCPParams(params, z.object(MCPEmailToolSchema.shape));
        
        // Convert to email data format
        const emailData = EmailValidator.convertMCPParamsToEmailData(validatedParams, {
          defaultSender: emailConfig.defaultSender,
          defaultReplyTo: emailConfig.defaultReplyTo,
        });

        // Log email request (for debugging)
        if (emailConfig.debug) {
          console.log(`Email request: ${JSON.stringify({
            to: emailData.to,
            subject: emailData.subject,
            from: emailData.from,
            hasHtml: !!emailData.html,
            hasAttachments: !!emailData.attachments?.length,
          })}`);
        }

        // Send email
        const info = await transporter.sendMail(emailData);

        // Check for test message URL (Ethereal Email)
        const testUrl = EmailTransportFactory.getTestMessageUrl(info);
        
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
              type: "text" as const,
              text: responseMessage,
            },
          ],
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Email sending failed: ${errorMessage}`);
        
        throw new Error(`Email failed to send: ${errorMessage}`);
      }
    }
  );
}

export function sendEmailWithTemplatesTool(agent: PaidMcpAgent<Env, any, any>, config: EmailToolConfig) {
  const server = agent.server;

  // Paid email tool with templates support
  server.tool(
    "send-email-with-templates",
    "Send an email using pre-defined templates stored in Cloudflare KV. Supports template variables and advanced formatting. Requires subscription.",
    CloudflareEmailValidator.createMCPToolSchema({
      requireFrom: false,
      requireReplyTo: false,
      enableTemplates: true,
    }),
    async (params: any) => {
      try {
        // Get environment from agent
        const env = agent.env;
        
        // Initialize email configuration
        const configManager = new CloudflareEmailConfigManager(env);
        configManager.validateConfig();
        const emailConfig = configManager.getConfig();

        // Create transporter
        const transporter = CloudflareTransportFactory.createTransporter(emailConfig);

        // Validate parameters
        const validatedParams = CloudflareEmailValidator.validateMCPParams(
          params, 
          z.object(CloudflareEmailValidator.createMCPToolSchema({
            requireFrom: !emailConfig.defaultSender,
            requireReplyTo: false,
            enableTemplates: true,
          }))
        );

        let emailData: any;

        // Handle template processing if templateId is provided
        if (validatedParams.templateId) {
          try {
            // Get template from KV storage
            const templateContent = await env.EMAIL_TEMPLATES_KV.get(validatedParams.templateId);
            
            if (!templateContent) {
              throw new Error(`Template '${validatedParams.templateId}' not found`);
            }

            // Process template with data
            const processedTemplate = await CloudflareEmailValidator.processTemplate(
              templateContent,
              validatedParams.templateData || {}
            );

            // Create email data from template
            emailData = {
              to: validatedParams.to,
              subject: processedTemplate.subject,
              html: processedTemplate.html,
              text: processedTemplate.text,
            };

            // Add optional fields
            if (validatedParams.cc) emailData.cc = validatedParams.cc;
            if (validatedParams.bcc) emailData.bcc = validatedParams.bcc;

          } catch (templateError) {
            throw new Error(`Template processing failed: ${templateError instanceof Error ? templateError.message : 'Unknown template error'}`);
          }
        } else {
          // Convert regular parameters to email data format
          emailData = CloudflareEmailValidator.convertMCPParamsToEmailData(validatedParams, {
            defaultSender: emailConfig.defaultSender,
            defaultReplyTo: emailConfig.defaultReplyTo,
          });
        }

        // Add sender and reply-to from defaults
        if (!emailData.from && emailConfig.defaultSender) {
          emailData.from = emailConfig.defaultSender;
        }
        if (!emailData.replyTo && emailConfig.defaultReplyTo) {
          emailData.replyTo = emailConfig.defaultReplyTo.join(', ');
        }

        // Sanitize content
        if (emailData.html) {
          emailData.html = CloudflareEmailValidator.sanitizeEmailContent(emailData.html);
        }

        console.log(`Sending templated email via ${configManager.getTransportInfo()}`);

        // Send email
        const info = await transporter.sendMail(emailData);

        // Get test message URL if available
        const testUrl = CloudflareTransportFactory.getTestMessageUrl(info);
        
        let responseMessage = `✅ Email sent successfully using ${validatedParams.templateId ? `template '${validatedParams.templateId}'` : 'custom content'}!\n\nMessage ID: ${info.messageId}`;
        
        if (testUrl) {
          responseMessage += `\n🔗 Preview URL: ${testUrl}`;
        }
        
        if (info.response) {
          responseMessage += `\n📡 Server response: ${info.response}`;
        }

        responseMessage += `\n\n📊 Transport: ${configManager.getTransportInfo()}`;

        if (validatedParams.templateId) {
          responseMessage += `\n📄 Template: ${validatedParams.templateId}`;
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
        console.error(`Templated email sending failed: ${errorMessage}`);
        
        throw new Error(`❌ Templated email failed to send: ${errorMessage}`);
      }
    }
  );
}

export function sendBulkEmailTool(agent: PaidMcpAgent<Env, any, any>, config: EmailToolConfig) {
  // Paid bulk email tool with metered billing
  agent.paidTool(
    "send-bulk-email",
    "Send emails to multiple recipients with advanced features like personalization and analytics. Metered billing per email sent.",
    {
      recipients: z.array(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        data: z.record(z.any()).optional(),
      })).describe("Array of recipients with optional personalization data"),
      subject: z.string().describe("Email subject line"),
      templateId: z.string().optional().describe("Optional template ID from KV storage"),
      html: z.string().optional().describe("HTML content (if not using template)"),
      text: z.string().optional().describe("Plain text content (if not using template)"),
      batchSize: z.number().min(1).max(100).default(10).describe("Number of emails to send per batch"),
    },
    {
      paymentReason: "Bulk email sending requires payment per email sent. You will be charged based on the number of recipients.",
      meterEvent: "bulk_email_sent",
      successUrl: `${config.BASE_URL}/payment/success`,
    },
    async (params: any) => {
      try {
        // Get environment from agent
        const env = agent.env;
        
        // Initialize email configuration
        const configManager = new CloudflareEmailConfigManager(env);
        configManager.validateConfig();
        const emailConfig = configManager.getConfig();

        // Create transporter
        const transporter = CloudflareTransportFactory.createTransporter(emailConfig);

        const results = [];
        const batchSize = params.batchSize || 10;
        
        // Process recipients in batches
        for (let i = 0; i < params.recipients.length; i += batchSize) {
          const batch = params.recipients.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (recipient: any) => {
            try {
              let emailData: any;

              // Handle template processing if templateId is provided
              if (params.templateId) {
                const templateContent = await env.EMAIL_TEMPLATES_KV.get(params.templateId);
                
                if (!templateContent) {
                  throw new Error(`Template '${params.templateId}' not found`);
                }

                // Process template with recipient-specific data
                const processedTemplate = await CloudflareEmailValidator.processTemplate(
                  templateContent,
                  { ...recipient.data, recipientName: recipient.name, recipientEmail: recipient.email }
                );

                emailData = {
                  to: recipient.email,
                  subject: processedTemplate.subject,
                  html: processedTemplate.html,
                  text: processedTemplate.text,
                };
              } else {
                // Use provided content
                emailData = {
                  to: recipient.email,
                  subject: params.subject,
                  html: params.html,
                  text: params.text,
                };
              }

              // Add sender from defaults
              if (emailConfig.defaultSender) {
                emailData.from = emailConfig.defaultSender;
              }
              if (emailConfig.defaultReplyTo) {
                emailData.replyTo = emailConfig.defaultReplyTo.join(', ');
              }

              // Sanitize content
              if (emailData.html) {
                emailData.html = CloudflareEmailValidator.sanitizeEmailContent(emailData.html);
              }

              // Send email
              const info = await transporter.sendMail(emailData);
              
              return {
                recipient: recipient.email,
                success: true,
                messageId: info.messageId,
              };
            } catch (error) {
              return {
                recipient: recipient.email,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);

          // Small delay between batches to avoid overwhelming the SMTP server
          if (i + batchSize < params.recipients.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        let responseMessage = `📧 Bulk email campaign completed!\n\n`;
        responseMessage += `✅ Successful: ${successful}\n`;
        responseMessage += `❌ Failed: ${failed}\n`;
        responseMessage += `📊 Total: ${results.length}\n\n`;
        responseMessage += `🚀 Transport: ${configManager.getTransportInfo()}\n`;

        if (params.templateId) {
          responseMessage += `📄 Template: ${params.templateId}\n`;
        }

        if (failed > 0) {
          responseMessage += `\n❌ Failed recipients:\n`;
          results.filter(r => !r.success).forEach(r => {
            responseMessage += `  • ${r.recipient}: ${r.error}\n`;
          });
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
        console.error(`Bulk email sending failed: ${errorMessage}`);
        
        throw new Error(`❌ Bulk email failed: ${errorMessage}`);
      }
    }
  );
} 