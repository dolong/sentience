import {Email, OpenAPIRoute} from '@cloudflare/itty-router-openapi';
import {z} from 'zod'
import Web3 from 'web3';

const web3 = new Web3();

const cors = {
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow all origins
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  } 

async function hashPassword(password: string, salt: string): Promise<string> {
    const utf8 = new TextEncoder().encode(`${salt}:${password}`);

    const hashBuffer = await crypto.subtle.digest({name: 'SHA-256'}, utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .map((bytes) => bytes.toString(16).padStart(2, '0'))
        .join('');
}

export class CreateWallet extends OpenAPIRoute {
    static schema = {
        tags: ['Wallet'],
        summary: 'Create a wallet for a user',
        requestBody: {
            username: String,
        },
        responses: {
            '200': {
                description: "Wallet created successfully",
                schema: {
                    success: Boolean,
                    wallet: {
                        address: String,
                        privateKey: String
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
        const username = data.body.username;
        const wallet = web3.eth.accounts.create();


        try {
            await context.qb.update({
                tableName: 'users',
                data: {
                    sentience_wallet: wallet.address,
                    sentience_passkey: wallet.privateKey,
                },
                where: {
                    conditions: ['username = ?1'],
                    params: [username],
                },
            }).execute();

            return new Response(JSON.stringify({
                success: true,
                wallet: {
                    address: wallet.address,
                    privateKey: wallet.privateKey
                }
            }), cors);
        } catch (e) {
            return new Response(JSON.stringify({
                success: false,
                error: "Failed to create wallet"
            }), cors);
        }
    }
}
export class CreateOrGetWallet extends OpenAPIRoute {
    static schema = {
        tags: ['Wallet'],
        summary: 'Create or get a wallet for a user',
        requestBody: {
            username: String,
        },
        responses: {
            '200': {
                description: "Wallet processed successfully",
                schema: {
                    success: Boolean,
                    wallet: {
                        address: String,
                        // Do not return privateKey here for security reasons
                    },
                    isNew: Boolean // Indicates if the wallet was created or existing
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
        const username = data.body.username;
        
        try {
            // Check if user already has a wallet
            let user = await context.qb.fetchOne({
                tableName: 'users',
                fields: ['sentience_wallet', 'sentience_passkey'],
                where: {
                    conditions: ['username = ?1'],
                    params: [username],
                },
            }).execute();

            // If user already has a wallet, return it
            if (user.results && user.results.sentience_wallet) {
                return new Response(JSON.stringify({
                    success: true,
                    wallet: {
                        address: user.results.sentience_wallet,
                        passkey: user.results.sentience_passkey
                    },
                    isNew: false
                }), cors);
            } else {
                // If user doesn't have a wallet, create one
                const wallet = web3.eth.accounts.create();

                // Update user record with new wallet details
                await context.qb.update({
                    tableName: 'users',
                    data: {
                        sentience_wallet: wallet.address,
                        sentience_passkey: wallet.privateKey,
                    },
                    where: {
                        conditions: ['username = ?1'],
                        params: [username],
                    },
                }).execute();

                return new Response(JSON.stringify({
                    success: true,
                    wallet: {
                        address: wallet.address,
                        passkey: wallet.privateKey
                    },
                    isNew: true
                }), cors);
            }
        } catch (e) {
            return new Response(JSON.stringify({
                success: false,
                error: "Failed to process wallet"
            }), cors);
        }
    }
}

export class AuthRegister extends OpenAPIRoute {
    static schema = {
        tags: ['Auth'],
        summary: 'Register user',
        requestBody: {
            username: String,
            email: new Email(),
            silver: Number,
            password: z.string().min(8).max(16),
        },
        responses: {
            '200': {
                description: "Successful response",
                schema: {
                    success: Boolean,
                    result: {
                        user: {
                            username: String
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
        let user
        try {
            user = await context.qb.insert({
                tableName: 'users',
                data: {
                    username: data.body.username,
                    email: data.body.email,
                    silver: data.body.silver,
                    password: await hashPassword(data.body.password, env.SALT_TOKEN),
                },
                returning: '*'
            }).execute()
        } catch (e) {
            return new Response(JSON.stringify({
                success: false,
                errors: "User with that username already exists"
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // Allow all origins
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                status: 400,
            })
        }


        return new Response(JSON.stringify({
            success: true,
            result: {
                user: {
                    username: user.results.username
                }
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Allow all origins
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            status: 200,
        })

    }
}



export class AuthOrRegister extends OpenAPIRoute {
    static schema = {
        tags: ['Auth'],
        summary: 'Register user',
        requestBody: {
            username: String,
            email: z.string().email().optional(), // Making the email field optional
            password: z.string().min(8).max(16),
        },
        responses: {
            '200': {
                description: "Successful response",
                schema: {
                    success: Boolean,
                    result: {
                        user: {
                            username: String
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
        let user
        try {
            let user = await context.qb.fetchOne({
                tableName: 'users',
                fields: '*',
                where: {
                    conditions: [
                        'username = ?1',
                        'password = ?2'
                    ],
                    params: [
                        data.body.username,
                        await hashPassword(data.body.password, env.SALT_TOKEN)
                    ]
                },
            }).execute()
            try {
                //check if user exists
                let expiration = new Date();
                expiration.setDate(expiration.getDate() + 7);
                const session = await context.qb.insert({
                    tableName: 'users_sessions',
                    data: {
                        user_id: user.results.id,
                        token: await hashPassword((Math.random() + 1).toString(3), env.SALT_TOKEN),
                        expires_at: expiration.getTime()
                    },
                    returning: '*'
                }).execute()
        
                return new Response(JSON.stringify({
                    success: true,
                    result: {
                        new_user: false,
                        user: {
                            username: user.results.username
                        },
                        session: {
                            token: session.results.token,
                            expires_at: session.results.expires_at,
                        }
                    }
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*', // Allow all origins
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    },
                    status: 200,
                })

            } catch (e) {
                // User is registered    
                user = await context.qb.insert({
                    tableName: 'users',
                    data: {
                        username: data.body.username,
                        silver: 1000,
                        password: await hashPassword(data.body.password, env.SALT_TOKEN),
                    },
                    returning: '*'
                }).execute()                                

                return new Response(JSON.stringify({
                    success: true,
                    result: {
                        user: {
                            new_user: true,
                            username: user.results.username
                        }
                    }
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*', // Allow all origins
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    },
                    status: 200,
                })
            }
        } catch (e) {
            return new Response(JSON.stringify({
                success: false,
                errors: "Incorrect password"
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // Allow all origins
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                status: 400,
            })
        }
    }
}

export class AuthLogin extends OpenAPIRoute {
    static schema = {
        tags: ['Auth'],
        summary: 'Login user',
        requestBody: {
            username: String,
            password: z.string().min(8).max(16),
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
                    'username = ?1',
                    'password = ?2'
                ],
                params: [
                    data.body.username,
                    await hashPassword(data.body.password, env.SALT_TOKEN)
                ]
            },
        }).execute()

        if (!user.results) {
            return new Response(JSON.stringify({
                success: false,
                errors: "Unknown user"
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // Allow all origins
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                status: 400,
            })
        }

        let expiration = new Date();
        expiration.setDate(expiration.getDate() + 7);

        const session = await context.qb.insert({
            tableName: 'users_sessions',
            data: {
                user_id: user.results.id,
                token: await hashPassword((Math.random() + 1).toString(3), env.SALT_TOKEN),
                expires_at: expiration.getTime()
            },
            returning: '*'
        }).execute()
        
        return new Response(JSON.stringify({
            success: true,
            result: {
                session: {
                    token: session.results.token,
                    expires_at: session.results.expires_at,
                }
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Allow all origins
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            status: 400,
        })

    }
}


export function getBearer(request: Request): null | string {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader.substring(0, 6) !== 'Bearer') {
        return null
    }
    return authHeader.substring(6).trim()
}

export async function getAuthUser(request: Request, env: any, context: any) {
    
    let expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    const session = await context.qb.insert({
        tableName: 'users_sessions',
        data: {
            user_id: user.results.id,
            token: await hashPassword((Math.random() + 1).toString(3), env.SALT_TOKEN),
            expires_at: expiration.getTime()
        },
        returning: '*'
    }).execute()

    return {
        success: true,
        result: {
            new_user: false,
            session: {
                token: session.results.token,
                expires_at: session.results.expires_at,
            }
        }
    }
}
export async function authenticateUser(request: Request, env: any, context: any) {
    const token = getBearer(request)
    let session

    if (token) {
        session = await context.qb.fetchOne({
            tableName: 'users_sessions',
            fields: '*',
            where: {
                conditions: [
                    'token = ?1',
                    'expires_at > ?2',
                ],
                params: [
                    token,
                    new Date().getTime()
                ]
            },
        }).execute()
    }

    if (!token || !session.results) {
        return new Response(JSON.stringify({
            success: false,
            errors: "Authentication error"
        }), {
            headers: {
                'content-type': 'application/json;charset=UTF-8',
            },
            status: 401,
        })
    }

    env.user_uuid = session.results.user_uuid
}
