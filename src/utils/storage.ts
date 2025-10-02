// utils/storage.ts
export const storage = {
  get: (key: string, fallback: any = null) => {
    try {
      const item = localStorage.getItem(key);
      if (!item || item === "undefined" || item === "null") {
        return fallback;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return fallback;
    }
  },

  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  },

  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  },

  clearAuth: () => {
    ["auth_token", "permissions", "user_data"].forEach(key => {
      localStorage.removeItem(key);
    });
  }
};