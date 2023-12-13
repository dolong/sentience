import { OpenAPIRoute } from "@cloudflare/itty-router-openapi";

export class RollDice extends OpenAPIRoute {
    static schema = {
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
    return {
      rolls: diceRolls
        }
    }
  }
