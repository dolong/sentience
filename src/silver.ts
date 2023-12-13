import {OpenAPIRoute} from '@cloudflare/itty-router-openapi';


export class getSilver extends OpenAPIRoute {
    static schema = {
        summary: 'Get User Silver',
        requestBody: {
            username: String,
        },
        responses: {
            '200': {
                description: "Successful response",
                schema: {
                    success: Boolean,
                    result: {
                        session: {
                            token: String,
                            expires_at: String
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
        const user = await context.qb.fetchOne({
            tableName: 'users',
            fields: '*',
            where: {
                conditions: [
                    'username = ?1'
                ],
                params: [
                    data.body.username
                ]
            },
        }).execute()

        if (!user.results) {
            return new Response(JSON.stringify({
                success: false,
                errors: "Unknown user"
            }), {
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                },
                status: 400,
            })
        }
        return {
            success: true,
            result: {
                user_silver: user.results.silver
            }
        }
    }
}


export class setSilver extends OpenAPIRoute {
    static schema = {
        summary: 'Get User Silver',
        requestBody: {
            username: String,
            silver: Number
        },
        responses: {
            '200': {
                description: "Successful response",
                schema: {
                    success: Boolean,
                    result: {
                        session: {
                            token: String,
                            expires_at: String
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
        const user = await context.qb.fetchOne({
            tableName: 'users',
            fields: '*',
            where: {
                conditions: [
                    'username = ?1'
                ],
                params: [
                    data.body.username
                ]
            },
        }).execute()

        if (!user.results) {
            return new Response(JSON.stringify({
                success: false,
                errors: "Unknown user"
            }), {
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                },
                status: 400,
            })
        } else {
            console.log("setting silver", data.body.username, user.results.silver, data.body.silver)
            // Ensure that both values are numbers
            const currentSilver = Number(user.results.silver);
            const additionalSilver = Number(data.body.silver);
            const newSilverTotal = currentSilver + additionalSilver;
                
            await context.qb.update({
                tableName: 'users',
                data: {
                    silver: newSilverTotal,
                },
                where: {
                    conditions: [
                        'username = ?1'
                    ],
                    params: [
                        data.body.username
                    ]
                },
            }).execute()
            
            return {
                success: true,
                result: {
                    user_silver: newSilverTotal
                }
            }
        }
    }
}