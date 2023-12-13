import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { GetSearch } from "./search";
import { ChooseLane } from "./ghostdice/chooseLane";
import { RollDice } from "./ghostdice/diceRolling";
import {authenticateUser, AuthLogin, AuthRegister, AuthOrRegister} from "./auth";
import {D1QB} from "workers-qb";

export const router = OpenAPIRouter({
	schema: {
		info: {
			title: "Authentication using D1",
			version: '1.0',
		},
		security: [
			{
				bearerAuth: [],
			},
		],
	},
	docs_url: "/",
});

router.registry.registerComponent('securitySchemes', 'bearerAuth', {
	type: 'http',
	scheme: 'bearer',
})

// 1. Endpoints that don't require Auth
router.post('/api/auth/register', AuthRegister);
router.post('/api/auth/login', AuthLogin);
router.post('/api/auth/register-or-login', AuthOrRegister);

router.post("/api/ghostdice/choose-lane", ChooseLane);
router.post("/api/ghostdice/diceroll", RollDice);


// 2. Authentication middleware
router.all('/api/*', authenticateUser)


// 3. Endpoints that require Auth
router.get("/api/search", GetSearch);


// 404 for everything else
router.all("*", () => new Response("Not Found.", { status: 404 }));


export default {
	fetch: async (request, env, ctx) => {
		// Inject query builder in every endpoint
		const qb = new D1QB(env.DB)
		// qb.setDebugger(true)

		return router.handle(request, env, {...ctx, qb: qb})
	},
};
