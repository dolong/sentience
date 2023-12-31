import { OpenAPIRoute } from "@cloudflare/itty-router-openapi";

const cors = {
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow all origins
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  } 

export class RollDice extends OpenAPIRoute {
    static schema = {
        tags: ['Game Utility'],
        summary: 'Roll Dice',
        requestBody: { dice: Number },
        responses: {
            '200': {
                description: "Successful response",
                schema: {
                    success: Boolean,
                    result: {
                        user: {
                            email: String,
                            name: String
                        }
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
        const diceRolls = [];
        const diceNum = data.body.dice;
        for (let i = 0; i < diceNum; i++) {
            const roll = Math.floor(Math.random() * 6) + 1; // Random number between 1 and 6
            diceRolls.push(roll);
        }
    
        // Create a new response with CORS headers
        const response = new Response(JSON.stringify({ rolls: diceRolls }), cors);
    
        return response;
    }
  }
