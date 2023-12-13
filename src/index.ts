import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { GetSearch } from "./search";
import { ChooseLane } from "./ghostdice/chooseLane";
import { RollDice } from "./ghostdice/diceRolling";
import { getSilver, setSilver } from "./silver";
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
router.post('/api/get-silver', getSilver);
router.post('/api/set-silver', setSilver);

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
	  const qb = new D1QB(env.DB);
  
	  // Apply CORS middleware
	  const corsHeaders = handleCORS(request);
	  if (corsHeaders instanceof Response) {
		return corsHeaders;
	  }
  
	  const response = await router.handle(request, env, {...ctx, qb: qb});
	  // Attach CORS headers to the response
	  Object.entries(corsHeaders).forEach(([key, value]) => {
		response.headers.set(key, value);
	  });
  
	  return response;
	},
  };
  
function handleCORS(request) {
	// Set CORS headers
	const headers = new Headers({
	  'Access-Control-Allow-Origin': request.headers.get('Origin') || '*', // Or specify your domain
	  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	});
  
	// Handle preflight requests
	if (request.method === 'OPTIONS') {
	  return new Response(null, { headers, status: 204 });
	}
  
	return headers;
  }