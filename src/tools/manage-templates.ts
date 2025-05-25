import { z } from "zod";
import { experimental_PaidMcpAgent as PaidMcpAgent } from "@stripe/agent-toolkit/cloudflare";

interface TemplateToolConfig {
  BASE_URL: string;
}

export function manageEmailTemplatesTool(agent: PaidMcpAgent<Env, any, any>) {
  const server = agent.server;

  // Free template management tool
  server.tool(
    "manage-email-templates",
    "Manage email templates stored in Cloudflare KV. Create, update, list, and delete email templates.",
    {
      action: z.enum(['create', 'update', 'get', 'list', 'delete']).describe('Action to perform on templates'),
      templateId: z.string().optional().describe('Template ID (required for create, update, get, delete)'),
      content: z.string().optional().describe('Template content (required for create, update). Format: subject on first line, then HTML content'),
      description: z.string().optional().describe('Template description (optional for create, update)'),
    },
    async (params: any) => {
      try {
        const env = agent.env;
        const { action, templateId, content, description } = params;

        switch (action) {
          case 'create':
          case 'update':
            if (!templateId) {
              throw new Error('Template ID is required for create/update operations');
            }
            if (!content) {
              throw new Error('Template content is required for create/update operations');
            }

            // Validate template content format
            const lines = content.split('\n');
            if (lines.length < 2) {
              throw new Error('Template content must have subject on first line, then HTML content');
            }

            // Store template in KV
            const templateData = {
              content,
              description: description || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await env.EMAIL_TEMPLATES_KV.put(templateId, content, {
              metadata: templateData,
            });

            return {
              content: [
                {
                  type: "text" as const,
                  text: `✅ Template '${templateId}' ${action === 'create' ? 'created' : 'updated'} successfully!\n\nTemplate ID: ${templateId}\nDescription: ${description || 'No description'}\nSubject: ${lines[0]}\nContent length: ${content.length} characters`,
                },
              ],
            };

          case 'get':
            if (!templateId) {
              throw new Error('Template ID is required for get operation');
            }

            const templateContent = await env.EMAIL_TEMPLATES_KV.get(templateId, { type: 'text' });
            const templateMetadata = await env.EMAIL_TEMPLATES_KV.getWithMetadata(templateId);

            if (!templateContent) {
              throw new Error(`Template '${templateId}' not found`);
            }

            const templateLines = templateContent.split('\n');
            const subject = templateLines[0] || 'No subject';
            const htmlContent = templateLines.slice(1).join('\n');

            let responseText = `📄 Template: ${templateId}\n\n`;
            responseText += `📝 Subject: ${subject}\n`;
            responseText += `📊 Content length: ${templateContent.length} characters\n`;
            
            if (templateMetadata.metadata) {
              const metadata = templateMetadata.metadata as any;
              responseText += `📅 Created: ${metadata.createdAt || 'Unknown'}\n`;
              responseText += `🔄 Updated: ${metadata.updatedAt || 'Unknown'}\n`;
              if (metadata.description) {
                responseText += `📋 Description: ${metadata.description}\n`;
              }
            }

            responseText += `\n📧 HTML Content:\n${htmlContent}`;

            return {
              content: [
                {
                  type: "text" as const,
                  text: responseText,
                },
              ],
            };

          case 'list':
            const listResult = await env.EMAIL_TEMPLATES_KV.list();
            
            if (listResult.keys.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "📭 No email templates found.",
                  },
                ],
              };
            }

            let listText = `📚 Email Templates (${listResult.keys.length} found):\n\n`;
            
            for (const key of listResult.keys) {
              const keyContent = await env.EMAIL_TEMPLATES_KV.get(key.name, { type: 'text' });
              const keyMetadata = key.metadata as any;
              
              const keyLines = keyContent?.split('\n') || [];
              const keySubject = keyLines[0] || 'No subject';
              
              listText += `📄 ${key.name}\n`;
              listText += `   📝 Subject: ${keySubject}\n`;
              if (keyMetadata?.description) {
                listText += `   📋 Description: ${keyMetadata.description}\n`;
              }
              if (keyMetadata?.updatedAt) {
                listText += `   🔄 Updated: ${keyMetadata.updatedAt}\n`;
              }
              listText += `\n`;
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: listText,
                },
              ],
            };

          case 'delete':
            if (!templateId) {
              throw new Error('Template ID is required for delete operation');
            }

            // Check if template exists
            const existingTemplate = await env.EMAIL_TEMPLATES_KV.get(templateId);
            if (!existingTemplate) {
              throw new Error(`Template '${templateId}' not found`);
            }

            // Delete template
            await env.EMAIL_TEMPLATES_KV.delete(templateId);

            return {
              content: [
                {
                  type: "text" as const,
                  text: `🗑️ Template '${templateId}' deleted successfully!`,
                },
              ],
            };

          default:
            throw new Error(`Unknown action: ${action}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Template management failed: ${errorMessage}`);
        
        throw new Error(`❌ Template management failed: ${errorMessage}`);
      }
    }
  );
} 