import { z } from "zod";
import { experimental_PaidMcpAgent as PaidMcpAgent } from "@stripe/agent-toolkit/cloudflare";

interface AnalyticsToolConfig {
  BASE_URL: string;
}

export function emailAnalyticsTool(agent: PaidMcpAgent<Env, any, any>) {
  const server = agent.server;

  // Free analytics tool (basic metrics)
  server.tool(
    "email-analytics",
    "View email sending analytics and metrics. Track sent emails, success rates, and basic statistics.",
    {
      action: z.enum(['summary', 'daily', 'weekly', 'monthly', 'reset']).describe('Type of analytics to retrieve'),
      startDate: z.string().optional().describe('Start date for date range queries (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date for date range queries (YYYY-MM-DD)'),
    },
    async (params: any) => {
      try {
        const env = agent.env;
        const { action, startDate, endDate } = params;

        // Analytics are stored in KV with keys like "analytics:YYYY-MM-DD"
        const today = new Date().toISOString().split('T')[0];

        switch (action) {
          case 'summary':
            // Get overall summary statistics
            const summaryKey = 'analytics:summary';
            const summaryData = await env.EMAIL_TEMPLATES_KV.get(summaryKey, { type: 'json' });
            
            const summary = summaryData || {
              totalSent: 0,
              totalSuccess: 0,
              totalFailed: 0,
              lastUpdated: new Date().toISOString(),
            };

            const successRate = summary.totalSent > 0 
              ? ((summary.totalSuccess / summary.totalSent) * 100).toFixed(2)
              : '0.00';

            let summaryText = `📊 Email Analytics Summary\n\n`;
            summaryText += `📧 Total Emails Sent: ${summary.totalSent}\n`;
            summaryText += `✅ Successful: ${summary.totalSuccess}\n`;
            summaryText += `❌ Failed: ${summary.totalFailed}\n`;
            summaryText += `📈 Success Rate: ${successRate}%\n`;
            summaryText += `🔄 Last Updated: ${new Date(summary.lastUpdated).toLocaleString()}\n`;

            return {
              content: [
                {
                  type: "text" as const,
                  text: summaryText,
                },
              ],
            };

          case 'daily':
            // Get today's statistics
            const dailyKey = `analytics:${today}`;
            const dailyData = await env.EMAIL_TEMPLATES_KV.get(dailyKey, { type: 'json' });
            
            const daily = dailyData || {
              date: today,
              sent: 0,
              success: 0,
              failed: 0,
              templates: {},
              transports: {},
            };

            const dailySuccessRate = daily.sent > 0 
              ? ((daily.success / daily.sent) * 100).toFixed(2)
              : '0.00';

            let dailyText = `📅 Daily Analytics - ${today}\n\n`;
            dailyText += `📧 Emails Sent: ${daily.sent}\n`;
            dailyText += `✅ Successful: ${daily.success}\n`;
            dailyText += `❌ Failed: ${daily.failed}\n`;
            dailyText += `📈 Success Rate: ${dailySuccessRate}%\n\n`;

            if (Object.keys(daily.templates).length > 0) {
              dailyText += `📄 Templates Used:\n`;
              for (const [template, count] of Object.entries(daily.templates)) {
                dailyText += `  • ${template}: ${count}\n`;
              }
              dailyText += `\n`;
            }

            if (Object.keys(daily.transports).length > 0) {
              dailyText += `🚀 Transports Used:\n`;
              for (const [transport, count] of Object.entries(daily.transports)) {
                dailyText += `  • ${transport}: ${count}\n`;
              }
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: dailyText,
                },
              ],
            };

          case 'weekly':
            // Get last 7 days of statistics
            const weeklyData = [];
            for (let i = 6; i >= 0; i--) {
              const date = new Date();
              date.setDate(date.getDate() - i);
              const dateStr = date.toISOString().split('T')[0];
              
              const dayKey = `analytics:${dateStr}`;
              const dayData = await env.EMAIL_TEMPLATES_KV.get(dayKey, { type: 'json' });
              
              weeklyData.push({
                date: dateStr,
                data: dayData || { sent: 0, success: 0, failed: 0 },
              });
            }

            let weeklyText = `📊 Weekly Analytics (Last 7 Days)\n\n`;
            let weeklyTotal = { sent: 0, success: 0, failed: 0 };

            for (const day of weeklyData) {
              const daySuccessRate = day.data.sent > 0 
                ? ((day.data.success / day.data.sent) * 100).toFixed(1)
                : '0.0';
              
              weeklyText += `📅 ${day.date}: ${day.data.sent} sent (${daySuccessRate}% success)\n`;
              
              weeklyTotal.sent += day.data.sent;
              weeklyTotal.success += day.data.success;
              weeklyTotal.failed += day.data.failed;
            }

            const weeklySuccessRate = weeklyTotal.sent > 0 
              ? ((weeklyTotal.success / weeklyTotal.sent) * 100).toFixed(2)
              : '0.00';

            weeklyText += `\n📈 Weekly Totals:\n`;
            weeklyText += `📧 Total Sent: ${weeklyTotal.sent}\n`;
            weeklyText += `✅ Successful: ${weeklyTotal.success}\n`;
            weeklyText += `❌ Failed: ${weeklyTotal.failed}\n`;
            weeklyText += `📊 Success Rate: ${weeklySuccessRate}%\n`;

            return {
              content: [
                {
                  type: "text" as const,
                  text: weeklyText,
                },
              ],
            };

          case 'monthly':
            // Get current month statistics
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            const monthlyData = [];
            for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              const dayKey = `analytics:${dateStr}`;
              const dayData = await env.EMAIL_TEMPLATES_KV.get(dayKey, { type: 'json' });
              
              if (dayData && dayData.sent > 0) {
                monthlyData.push({
                  date: dateStr,
                  data: dayData,
                });
              }
            }

            let monthlyText = `📊 Monthly Analytics - ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}\n\n`;
            let monthlyTotal = { sent: 0, success: 0, failed: 0 };

            if (monthlyData.length === 0) {
              monthlyText += `📭 No email activity this month.\n`;
            } else {
              monthlyText += `📅 Active Days: ${monthlyData.length}\n\n`;
              
              for (const day of monthlyData) {
                const daySuccessRate = day.data.sent > 0 
                  ? ((day.data.success / day.data.sent) * 100).toFixed(1)
                  : '0.0';
                
                monthlyText += `${day.date}: ${day.data.sent} sent (${daySuccessRate}% success)\n`;
                
                monthlyTotal.sent += day.data.sent;
                monthlyTotal.success += day.data.success;
                monthlyTotal.failed += day.data.failed;
              }

              const monthlySuccessRate = monthlyTotal.sent > 0 
                ? ((monthlyTotal.success / monthlyTotal.sent) * 100).toFixed(2)
                : '0.00';

              monthlyText += `\n📈 Monthly Totals:\n`;
              monthlyText += `📧 Total Sent: ${monthlyTotal.sent}\n`;
              monthlyText += `✅ Successful: ${monthlyTotal.success}\n`;
              monthlyText += `❌ Failed: ${monthlyTotal.failed}\n`;
              monthlyText += `📊 Success Rate: ${monthlySuccessRate}%\n`;
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: monthlyText,
                },
              ],
            };

          case 'reset':
            // Reset all analytics (admin function)
            const listResult = await env.EMAIL_TEMPLATES_KV.list({ prefix: 'analytics:' });
            
            let deletedCount = 0;
            for (const key of listResult.keys) {
              await env.EMAIL_TEMPLATES_KV.delete(key.name);
              deletedCount++;
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: `🗑️ Analytics reset completed!\n\nDeleted ${deletedCount} analytics records.\nAll email statistics have been cleared.`,
                },
              ],
            };

          default:
            throw new Error(`Unknown analytics action: ${action}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Analytics retrieval failed: ${errorMessage}`);
        
        throw new Error(`❌ Analytics failed: ${errorMessage}`);
      }
    }
  );
}

// Helper function to record email analytics
export async function recordEmailAnalytics(
  env: Env,
  success: boolean,
  templateId?: string,
  transport?: string
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `analytics:${today}`;
    const summaryKey = 'analytics:summary';

    // Get existing daily data
    const dailyData = await env.EMAIL_TEMPLATES_KV.get(dailyKey, { type: 'json' }) || {
      date: today,
      sent: 0,
      success: 0,
      failed: 0,
      templates: {},
      transports: {},
    };

    // Get existing summary data
    const summaryData = await env.EMAIL_TEMPLATES_KV.get(summaryKey, { type: 'json' }) || {
      totalSent: 0,
      totalSuccess: 0,
      totalFailed: 0,
      lastUpdated: new Date().toISOString(),
    };

    // Update daily statistics
    dailyData.sent += 1;
    if (success) {
      dailyData.success += 1;
    } else {
      dailyData.failed += 1;
    }

    // Track template usage
    if (templateId) {
      dailyData.templates[templateId] = (dailyData.templates[templateId] || 0) + 1;
    }

    // Track transport usage
    if (transport) {
      dailyData.transports[transport] = (dailyData.transports[transport] || 0) + 1;
    }

    // Update summary statistics
    summaryData.totalSent += 1;
    if (success) {
      summaryData.totalSuccess += 1;
    } else {
      summaryData.totalFailed += 1;
    }
    summaryData.lastUpdated = new Date().toISOString();

    // Save updated data
    await Promise.all([
      env.EMAIL_TEMPLATES_KV.put(dailyKey, JSON.stringify(dailyData)),
      env.EMAIL_TEMPLATES_KV.put(summaryKey, JSON.stringify(summaryData)),
    ]);

  } catch (error) {
    console.error('Failed to record email analytics:', error);
    // Don't throw error to avoid breaking email sending
  }
} 