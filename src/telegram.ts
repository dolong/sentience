import { OpenAPIRoute } from "@cloudflare/itty-router-openapi";

const cors = {
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow all origins
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  } 

export class telegram_webhook extends OpenAPIRoute {
    static schema = {
        tags: ['telegram'],
        summary: 'Webhook endpoint',
        requestBody: { input: String },
        responses: {
            '200': {
                description: "Successful response",
                schema: {
                    success: Boolean,
                    result: {
                    }
                },
            },
            '400': {
                description: "Error",
                schema: {
                    success: Boolean,
                    error: String
                },
            },
        },
    };


    async handle(request: Request, env: any, context: any, data: Record<string, any>) {
        const body = data.body;
    
        // Create a new response with CORS headers
        const response = new Response(JSON.stringify({ input: body }), cors);
    
        return response;
    }
  }
