export class JsonStorage {
  static async get(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  static async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static async delete(key) {
    localStorage.removeItem(key);
  }

  static async purge() {
    localStorage.clear();
  }
}
