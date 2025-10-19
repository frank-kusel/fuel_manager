import { E as store_get, F as head, J as escape_html, K as attr, I as unsubscribe_stores, B as pop, z as push } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "../../../chunks/state.svelte.js";
import { d as derived, w as writable } from "../../../chunks/index.js";
import { B as Button } from "../../../chunks/Button.js";
const initialState = {
  user: null,
  loading: "idle",
  error: null,
  isAuthenticated: false
};
function createAuthStore() {
  const { subscribe, set, update } = writable(initialState);
  return {
    subscribe,
    // Actions
    setLoading: (loading) => {
      update((state) => ({ ...state, loading }));
    },
    setUser: (user2) => {
      update((state) => ({
        ...state,
        user: user2,
        isAuthenticated: !!user2,
        loading: "idle",
        error: null
      }));
    },
    setError: (error) => {
      update((state) => ({ ...state, error, loading: "idle" }));
    },
    login: async (email, password) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: authService } = await import("../../../chunks/auth.js");
        const result = await authService.login(email, password);
        if (result.error) {
          update((state) => ({ ...state, error: result.error, loading: "error" }));
          return { success: false, error: result.error };
        }
        update((state) => ({
          ...state,
          user: result.data,
          isAuthenticated: true,
          loading: "success",
          error: null
        }));
        return { success: true, user: result.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Login failed";
        update((state) => ({ ...state, error: errorMessage, loading: "error" }));
        return { success: false, error: errorMessage };
      }
    },
    logout: async () => {
      update((state) => ({ ...state, loading: "loading" }));
      try {
        const { default: authService } = await import("../../../chunks/auth.js");
        await authService.logout();
        set(initialState);
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Logout failed";
        update((state) => ({ ...state, error: errorMessage, loading: "error" }));
        return { success: false, error: errorMessage };
      }
    },
    register: async (email, password, name) => {
      update((state) => ({ ...state, loading: "loading", error: null }));
      try {
        const { default: authService } = await import("../../../chunks/auth.js");
        const result = await authService.register(email, password, name);
        if (result.error) {
          update((state) => ({ ...state, error: result.error, loading: "error" }));
          return { success: false, error: result.error };
        }
        update((state) => ({
          ...state,
          user: result.data,
          isAuthenticated: true,
          loading: "success",
          error: null
        }));
        return { success: true, user: result.data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Registration failed";
        update((state) => ({ ...state, error: errorMessage, loading: "error" }));
        return { success: false, error: errorMessage };
      }
    },
    checkSession: async () => {
      update((state) => ({ ...state, loading: "loading" }));
      try {
        const { default: authService } = await import("../../../chunks/auth.js");
        const result = await authService.getCurrentUser();
        if (result.data) {
          update((state) => ({
            ...state,
            user: result.data,
            isAuthenticated: true,
            loading: "success",
            error: null
          }));
        } else {
          update((state) => ({ ...state, loading: "idle" }));
        }
        return result.data;
      } catch (error) {
        update((state) => ({ ...state, loading: "idle" }));
        return null;
      }
    },
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
    reset: () => {
      set(initialState);
    }
  };
}
const authStore = createAuthStore();
derived(authStore, ($auth) => $auth.user);
derived(authStore, ($auth) => $auth.isAuthenticated);
derived(authStore, ($auth) => $auth.loading);
derived(authStore, ($auth) => $auth.error);
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let email = "";
  let password = "";
  let loading = false;
  store_get($$store_subs ??= {}, "$authStore", authStore);
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html("Login")} - FarmTrack</title>`;
  });
  $$payload.out.push(`<div class="auth-container svelte-1s728sz"><div class="auth-card svelte-1s728sz"><div class="auth-header svelte-1s728sz"><div class="brand-icon svelte-1s728sz">🚜</div> <h1 class="svelte-1s728sz">FarmTrack</h1> <p class="tagline svelte-1s728sz">Farm Management Platform</p></div> <form class="auth-form svelte-1s728sz"><h2 class="svelte-1s728sz">${escape_html("Sign In")}</h2> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="form-group svelte-1s728sz"><label for="email" class="svelte-1s728sz">Email Address</label> <input id="email" type="email"${attr("value", email)} placeholder="Enter your email"${attr("disabled", loading, true)} required class="svelte-1s728sz"/></div> <div class="form-group svelte-1s728sz"><label for="password" class="svelte-1s728sz">Password</label> <input id="password" type="password"${attr("value", password)} placeholder="Enter your password"${attr("disabled", loading, true)} required class="svelte-1s728sz"/></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  Button($$payload, {
    type: "submit",
    variant: "primary",
    fullWidth: true,
    loading,
    disabled: !email,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html("Sign In")}`);
    }
  });
  $$payload.out.push(`<!----></form> <div class="auth-footer svelte-1s728sz"><p class="svelte-1s728sz">${escape_html("Don't have an account?")} <button class="link-button svelte-1s728sz"${attr("disabled", loading, true)}>${escape_html("Create Account")}</button></p></div></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
