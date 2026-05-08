/* auth.js - simple demo auth + subscription flags using sessionStorage */

(function () {
  const USER_KEY = "lotus_user";                 // stores logged-in user
  const SUB_KEY = "lotus_subscriptions";         // stores subscription by email

  function readJSON(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  const Auth = {
    // ---- Auth ----
    isLoggedIn: function () {
      const user = readJSON(USER_KEY, null);
      return !!(user && user.email);
    },

    getUser: function () {
      return readJSON(USER_KEY, null);
    },

    login: function (user) {
      // expects at least { email }
      if (!user || !user.email) return;
      writeJSON(USER_KEY, {
        email: String(user.email).toLowerCase(),
        name: user.name || "",
        loginAt: new Date().toISOString()
      });
    },

    logout: function () {
      sessionStorage.removeItem(USER_KEY);
    },

    // ---- Subscription (demo) ----
    isSubscribed: function () {
      const user = readJSON(USER_KEY, null);
      if (!user || !user.email) return false;

      const subs = readJSON(SUB_KEY, {});
      const record = subs[user.email];
      return !!(record && record.active === true);
    },

    setSubscribed: function (active, planName) {
      const user = readJSON(USER_KEY, null);
      if (!user || !user.email) return;

      const subs = readJSON(SUB_KEY, {});
      subs[user.email] = {
        active: !!active,
        planName: planName || "All Access Monthly",
        updatedAt: new Date().toISOString()
      };
      writeJSON(SUB_KEY, subs);
    }
  };

  // Make it available globally
  window.Auth = Auth;
})();