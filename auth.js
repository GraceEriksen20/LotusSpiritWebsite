// auth.js — simple demo auth layer (localStorage)
// Later we’ll replace Auth.login() with Supabase/Firebase/backend auth.

const Auth = {
  key: "lotus_auth_user",

  login(user) {
    localStorage.setItem(this.key, JSON.stringify({
      email: user.email,
      loginTime: new Date().toISOString()
    }));
  },

  logout() {
    localStorage.removeItem(this.key);
  },

  getUser() {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
    }
  }
};
