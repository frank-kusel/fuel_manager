import { init } from '../serverless.js';

export const handler = init((() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","icon-192.png","icon-512.png","manifest.json","sw.js"]),
	mimeTypes: {".png":"image/png",".json":"application/json",".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.DmJTJQj4.js",app:"_app/immutable/entry/app.Cm04Vclv.js",imports:["_app/immutable/entry/start.DmJTJQj4.js","_app/immutable/chunks/BVOnU6Vx.js","_app/immutable/chunks/5P4c1mN1.js","_app/immutable/chunks/D6cbYCli.js","_app/immutable/chunks/CSIOR0MX.js","_app/immutable/entry/app.Cm04Vclv.js","_app/immutable/chunks/D9Z9MdNV.js","_app/immutable/chunks/D6cbYCli.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/5P4c1mN1.js","_app/immutable/chunks/BmneS3Po.js","_app/immutable/chunks/DcOV7W_e.js","_app/immutable/chunks/DQ2vU5C0.js","_app/immutable/chunks/hw9sEPVb.js","_app/immutable/chunks/CSIOR0MX.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../server/nodes/0.js')),
			__memo(() => import('../server/nodes/1.js')),
			__memo(() => import('../server/nodes/2.js')),
			__memo(() => import('../server/nodes/3.js')),
			__memo(() => import('../server/nodes/4.js')),
			__memo(() => import('../server/nodes/5.js')),
			__memo(() => import('../server/nodes/6.js')),
			__memo(() => import('../server/nodes/7.js')),
			__memo(() => import('../server/nodes/8.js')),
			__memo(() => import('../server/nodes/9.js')),
			__memo(() => import('../server/nodes/10.js')),
			__memo(() => import('../server/nodes/11.js')),
			__memo(() => import('../server/nodes/12.js')),
			__memo(() => import('../server/nodes/13.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/auth",
				pattern: /^\/auth\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/debug",
				pattern: /^\/debug\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/fleet",
				pattern: /^\/fleet\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/fleet/activities/[id]",
				pattern: /^\/fleet\/activities\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/fleet/drivers/[id]",
				pattern: /^\/fleet\/drivers\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/fleet/vehicles/[id]",
				pattern: /^\/fleet\/vehicles\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/fleet/zones",
				pattern: /^\/fleet\/zones\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/fleet/zones/print",
				pattern: /^\/fleet\/zones\/print\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/fuel",
				pattern: /^\/fuel\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/fuel/summary",
				pattern: /^\/fuel\/summary\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})());
