/* auth.js - simple demo auth using sessionStorage */

(function () {
  const USER_KEY = "lotus_user";
  const USERS_KEY = "lotus_registered_users";

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
    isLoggedIn: function () {
      const user = readJSON(USER_KEY, null);
      return !!(user && user.email);
    },

    getUser: function () {
      return readJSON(USER_KEY, null);
    },

    register: function ({ name, email, password }) {
      if (!name || !email || !password) return false;

      email = String(email).toLowerCase();

      const users = readJSON(USERS_KEY, {});

      if (users[email]) {
        return false;
      }

      users[email] = {
        name,
        email,
        password,
        createdAt: new Date().toISOString()
      };

      writeJSON(USERS_KEY, users);

      return true;
    },

    getRegisteredUser: function (email) {
      if (!email) return null;

      const users = readJSON(USERS_KEY, {});
      return users[String(email).toLowerCase()] || null;
    },

    login: function ({ email, password, name }) {
      if (!email) return false;

      email = String(email).toLowerCase();

      const registeredUser = this.getRegisteredUser(email);

      if (registeredUser && password && registeredUser.password !== password) {
        return false;
      }

      writeJSON(USER_KEY, {
        email,
        name: name || registeredUser?.name || "",
        loginAt: new Date().toISOString()
      });

      return true;
    },

    resetPassword: function (email, newPassword) {
      if (!email || !newPassword) return false;

      email = String(email).toLowerCase();

      const users = readJSON(USERS_KEY, {});

      if (!users[email]) {
        return false;
      }

      users[email].password = newPassword;
      users[email].updatedAt = new Date().toISOString();

      writeJSON(USERS_KEY, users);

      return true;
    },

    logout: function () {
      sessionStorage.removeItem(USER_KEY);
    }
  };

  window.Auth = Auth;
})();