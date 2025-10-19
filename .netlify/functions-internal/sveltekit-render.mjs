import { init } from '../serverless.js';

export const handler = init((() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","favicon.svg","icon-192.png","icon-192.svg","icon-512.png","icon-512.svg","icon.svg","manifest.json","map-zones.png","simple-icon.svg","sw.js"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml",".json":"application/json",".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.C6GuLzL2.js",app:"_app/immutable/entry/app.Co9RY0Xe.js",imports:["_app/immutable/entry/start.C6GuLzL2.js","_app/immutable/chunks/DlrPtQg4.js","_app/immutable/chunks/BZylPEbR.js","_app/immutable/chunks/CDo3x6Ga.js","_app/immutable/chunks/D1oCGuoh.js","_app/immutable/entry/app.Co9RY0Xe.js","_app/immutable/chunks/D9Z9MdNV.js","_app/immutable/chunks/CDo3x6Ga.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BZylPEbR.js","_app/immutable/chunks/DATVbi-A.js","_app/immutable/chunks/D_c6kXsN.js","_app/immutable/chunks/BZGHpuMv.js","_app/immutable/chunks/vBxn_ljH.js","_app/immutable/chunks/D1oCGuoh.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
			__memo(() => import('../server/nodes/13.js')),
			__memo(() => import('../server/nodes/14.js')),
			__memo(() => import('../server/nodes/15.js'))
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
				id: "/fuel",
				pattern: /^\/fuel\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/summary",
				pattern: /^\/summary\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/tools",
				pattern: /^\/tools\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/tools/database",
				pattern: /^\/tools\/database\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/tools/database/activities/[id]",
				pattern: /^\/tools\/database\/activities\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/tools/database/drivers/[id]",
				pattern: /^\/tools\/database\/drivers\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/tools/database/vehicles/[id]",
				pattern: /^\/tools\/database\/vehicles\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/tools/database/zones",
				pattern: /^\/tools\/database\/zones\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/tools/database/zones/print",
				pattern: /^\/tools\/database\/zones\/print\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/tools/reconciliations",
				pattern: /^\/tools\/reconciliations\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
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
