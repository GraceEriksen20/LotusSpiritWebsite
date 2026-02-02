// auth.js — demo auth layer (localStorage)
// Later we can replace this with Supabase/Firebase for real auth + email verification.

const Auth = {
  userKey: "lotus_auth_user",
  usersKey: "lotus_auth_users",

  // --- user session ---
  login({ email }) {
    localStorage.setItem(this.userKey, JSON.stringify({
      email,
      loginTime: new Date().toISOString()
    }));
  },

  logout() {
    localStorage.removeItem(this.userKey);
  },

  getUser() {
    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
    }
  },

  // --- demo user database ---
  _loadUsers() {
    const raw = localStorage.getItem(this.usersKey);
    return raw ? JSON.parse(raw) : [];
  },

  _saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  },

  register({ name, email, password }) {
    const users = this._loadUsers();
    const exists = users.some(u => u.email === email);
    if (exists) return false;

    users.push({
      name,
      email,
      // NOTE: This is demo only — never store raw passwords in real apps.
      password,
      createdAt: new Date().toISOString()
    });

    this._saveUsers(users);
    return true;
  },

  authenticate({ email, password }) {
    const users = this._loadUsers();
    const user = users.find(u => u.email === email && u.password === password);
    return user || null;
  }
};
