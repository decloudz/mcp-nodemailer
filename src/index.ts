import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { GoogleHandler } from "./auth/google-handler.js";
import { Props } from "./auth/oauth.js";
import {
	PaymentState,
	experimental_PaidMcpAgent as PaidMcpAgent,
} from '@stripe/agent-toolkit/cloudflare';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import stripeWebhookHandler from "./webhooks/stripe.js";
import * as tools from './tools/index.js';
import { CloudflareEmailConfigManager } from "./email/config-manager.js";
import { CloudflareTransportFactory } from "./email/transport-factory.js";

type State = PaymentState & {};

type AgentProps = Props & {
	STRIPE_SUBSCRIPTION_PRICE_ID: string;
	STRIPE_METERED_PRICE_ID: string;
	BASE_URL: string;
};

export interface Env {
  // OAuth Configuration
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  HOSTED_DOMAIN?: string;
  COOKIE_ENCRYPTION_KEY?: string;

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_ONE_TIME_PRICE_ID?: string;
  STRIPE_SUBSCRIPTION_PRICE_ID?: string;
  STRIPE_METERED_PRICE_ID?: string;

  // Base URL
  BASE_URL?: string;

  // Email Service Configuration
  EMAIL_SERVICE?: string;

  // SMTP Configuration
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SERVICE?: string;
  SMTP_POOL?: string;
  SMTP_MAX_CONNECTIONS?: string;
  SMTP_MAX_MESSAGES?: string;

  // Gmail Configuration
  GMAIL_USER?: string;
  GMAIL_PASS?: string;

  // AWS SES Configuration
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;

  // Default Email Settings
  DEFAULT_SENDER_EMAIL?: string;
  DEFAULT_REPLY_TO_EMAILS?: string;
  DEBUG_EMAIL?: string;

  // Bindings
  OAUTH_KV: KVNamespace;
  EMAIL_TEMPLATES_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
}

// Define our Nodemailer MCP agent with email tools
export class NodemailerMCP extends PaidMcpAgent<Env, State, AgentProps> {
	server = new McpServer({
		name: "Nodemailer MCP Server",
		version: "1.0.0",
	});

	async init() {
		try {
			// Validate email configuration on startup
			const configManager = new CloudflareEmailConfigManager(this.env);
			configManager.validateConfig();
			const config = configManager.getConfig();

			console.log(`🚀 Initializing Nodemailer MCP Server`);
			console.log(`📧 Email Transport: ${configManager.getTransportInfo()}`);

			// Verify transport connection (with timeout for Cloudflare Workers)
			try {
				const transporter = CloudflareTransportFactory.createTransporter(config);
				await CloudflareTransportFactory.verifyTransporter(transporter);
				console.log(`✅ Email transport verified successfully`);
			} catch (verificationError) {
				console.warn(`⚠️ Email transport verification failed: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`);
				console.warn(`📧 Email sending may not work properly. Please check your configuration.`);
			}

			// Register free email tools
			tools.sendEmailTool(this);
			tools.manageEmailTemplatesTool(this);
			tools.emailAnalyticsTool(this);

			// Register paid email tools with templates
			tools.sendEmailWithTemplatesTool(this, {
				BASE_URL: this.env.BASE_URL
			});

			// Register paid bulk email tool with metered billing
			tools.sendBulkEmailTool(this, {
				BASE_URL: this.env.BASE_URL
			});

			console.log(`🎯 MCP Server initialized with ${this.server.tools.size} tools`);

		} catch (error) {
			console.error(`❌ Failed to initialize Nodemailer MCP Server:`, error);
			throw error;
		}
	}
}

// Create an OAuth provider instance for auth routes
const oauthProvider = new OAuthProvider({
	apiRoute: "/sse",
	apiHandler: NodemailerMCP.mount("/sse") as any,
	defaultHandler: GoogleHandler as any,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		
		// Handle homepage
		if (path === "/" || path === "") {
			// @ts-ignore
			const homePage = await import('./pages/index.html');
			return new Response(homePage.default, {
				headers: { "Content-Type": "text/html" },
			});
		}

		// Handle payment success page
		if (path === "/payment/success") {
			// @ts-ignore
			const successPage = await import('./pages/payment-success.html');
			return new Response(successPage.default, {
				headers: { "Content-Type": "text/html" },
			});
		}

		// Handle email configuration info page
		if (path === "/config") {
			try {
				const configManager = new CloudflareEmailConfigManager(env);
				configManager.validateConfig();
				const config = configManager.getConfig();

				const configInfo = {
					transport: configManager.getTransportInfo(),
					defaultSender: config.defaultSender || 'Not configured',
					defaultReplyTo: config.defaultReplyTo || [],
					debug: config.debug || false,
					timestamp: new Date().toISOString(),
				};

				return new Response(JSON.stringify(configInfo, null, 2), {
					headers: { 
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});
			} catch (error) {
				return new Response(JSON.stringify({
					error: error instanceof Error ? error.message : 'Configuration error',
					timestamp: new Date().toISOString(),
				}), {
					status: 500,
					headers: { 
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});
			}
		}

		// Handle health check
		if (path === "/health") {
			try {
				const configManager = new CloudflareEmailConfigManager(env);
				configManager.validateConfig();
				
				return new Response(JSON.stringify({
					status: 'healthy',
					service: 'Nodemailer MCP Server',
					version: '1.0.0',
					transport: configManager.getTransportInfo(),
					timestamp: new Date().toISOString(),
				}), {
					headers: { 
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});
			} catch (error) {
				return new Response(JSON.stringify({
					status: 'unhealthy',
					error: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString(),
				}), {
					status: 500,
					headers: { 
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});
			}
		}
		
		// Handle webhook
		if (path === "/webhooks/stripe") {
			return stripeWebhookHandler.fetch(request, env);
		}
		
		// All other routes go to OAuth provider
		return oauthProvider.fetch(request, env, ctx);
	},
}; 