import supabaseService from "./supabase.js";
class AuthService {
  client = null;
  initialized = false;
  // Initialize with the same client as SupabaseService
  async init() {
    if (this.initialized) return;
    try {
      await supabaseService.init();
      this.client = supabaseService.client;
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize auth service:", error);
      throw error;
    }
  }
  ensureInitialized() {
    if (!this.client || !this.initialized) {
      throw new Error("Auth service not initialized. Call init() first.");
    }
    return this.client;
  }
  // Convert Supabase user to our User type
  mapSupabaseUser(supabaseUser, profile) {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      name: profile?.name || supabaseUser.email?.split("@")[0] || "User",
      role: profile?.role || "operator",
      active: profile?.active ?? true,
      created_at: supabaseUser.created_at,
      updated_at: profile?.updated_at || supabaseUser.updated_at || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  // Login with email and password
  async login(email, password) {
    try {
      const client = this.ensureInitialized();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        return { data: null, error: error.message };
      }
      if (!data.user) {
        return { data: null, error: "Login failed - no user returned" };
      }
      const { data: profile } = await client.from("user_profiles").select("*").eq("id", data.user.id).single();
      const user = this.mapSupabaseUser(data.user, profile);
      return { data: user, error: null };
    } catch (error) {
      console.error("Login error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Login failed"
      };
    }
  }
  // Register new user
  async register(email, password, name) {
    try {
      const client = this.ensureInitialized();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });
      if (error) {
        return { data: null, error: error.message };
      }
      if (!data.user) {
        return { data: null, error: "Registration failed - no user returned" };
      }
      const { error: profileError } = await client.from("user_profiles").insert({
        id: data.user.id,
        name,
        email,
        role: "operator",
        active: true
      });
      if (profileError) {
        console.warn("Failed to create user profile:", profileError);
      }
      const user = this.mapSupabaseUser(data.user, { name, role: "operator", active: true });
      return { data: user, error: null };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Registration failed"
      };
    }
  }
  // Logout
  async logout() {
    try {
      const client = this.ensureInitialized();
      const { error } = await client.auth.signOut();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: null, error: null };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Logout failed"
      };
    }
  }
  // Get current user
  async getCurrentUser() {
    try {
      const client = this.ensureInitialized();
      const { data: { user }, error } = await client.auth.getUser();
      if (error) {
        return { data: null, error: error.message };
      }
      if (!user) {
        return { data: null, error: null };
      }
      const { data: profile } = await client.from("user_profiles").select("*").eq("id", user.id).single();
      const mappedUser = this.mapSupabaseUser(user, profile);
      return { data: mappedUser, error: null };
    } catch (error) {
      console.error("Get current user error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to get current user"
      };
    }
  }
  // Reset password
  async resetPassword(email) {
    try {
      const client = this.ensureInitialized();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: null, error: null };
    } catch (error) {
      console.error("Reset password error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Password reset failed"
      };
    }
  }
  // Update password
  async updatePassword(newPassword) {
    try {
      const client = this.ensureInitialized();
      const { error } = await client.auth.updateUser({
        password: newPassword
      });
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: null, error: null };
    } catch (error) {
      console.error("Update password error:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Password update failed"
      };
    }
  }
  // Listen to auth state changes
  onAuthStateChange(callback) {
    const client = this.ensureInitialized();
    return client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await client.from("user_profiles").select("*").eq("id", session.user.id).single();
        const user = this.mapSupabaseUser(session.user, profile);
        callback(user);
      } else {
        callback(null);
      }
    });
  }
}
const authService = new AuthService();
export {
  authService as default
};
