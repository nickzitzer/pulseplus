/**
 * Typed local storage wrapper with namespacing
 */

export interface StorageOptions {
  namespace?: string;
  expiry?: number; // Time in milliseconds
}

interface StorageItem<T> {
  value: T;
  expiry?: number; // Timestamp when the item expires
}

export class Storage<T = any> {
  protected namespace: string;
  protected defaultExpiry?: number;

  constructor(options: StorageOptions = {}) {
    this.namespace = options.namespace || 'app';
    this.defaultExpiry = options.expiry;
  }

  /**
   * Get the namespaced key
   * @param key - The original key
   * @returns Namespaced key
   */
  protected getNamespacedKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Set an item in storage
   * @param key - The key to store under
   * @param value - The value to store
   * @param options - Storage options
   * @returns True if successful
   */
  set<K extends keyof T>(key: string, value: T[K], options?: { expiry?: number }): boolean {
    try {
      const namespacedKey = this.getNamespacedKey(key);
      const expiry = options?.expiry || this.defaultExpiry;
      
      const item: StorageItem<T[K]> = {
        value,
      };
      
      if (expiry) {
        item.expiry = Date.now() + expiry;
      }
      
      localStorage.setItem(namespacedKey, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Error setting localStorage item:', error);
      return false;
    }
  }

  /**
   * Get an item from storage
   * @param key - The key to retrieve
   * @param defaultValue - Default value if not found
   * @returns The stored value or default
   */
  get<K extends keyof T>(key: string, defaultValue?: T[K]): T[K] | undefined {
    try {
      const namespacedKey = this.getNamespacedKey(key);
      const itemStr = localStorage.getItem(namespacedKey);
      
      if (!itemStr) {
        return defaultValue;
      }
      
      const item: StorageItem<T[K]> = JSON.parse(itemStr);
      
      // Check if the item has expired
      if (item.expiry && Date.now() > item.expiry) {
        this.remove(key);
        return defaultValue;
      }
      
      return item.value;
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      return defaultValue;
    }
  }

  /**
   * Remove an item from storage
   * @param key - The key to remove
   * @returns True if successful
   */
  remove(key: string): boolean {
    try {
      const namespacedKey = this.getNamespacedKey(key);
      localStorage.removeItem(namespacedKey);
      return true;
    } catch (error) {
      console.error('Error removing localStorage item:', error);
      return false;
    }
  }

  /**
   * Check if an item exists in storage
   * @param key - The key to check
   * @returns True if the item exists and is not expired
   */
  has(key: string): boolean {
    const value = this.get(key);
    return value !== undefined;
  }

  /**
   * Clear all items in the current namespace
   * @returns True if successful
   */
  clear(): boolean {
    try {
      const namespacedPrefix = `${this.namespace}:`;
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(namespacedPrefix)) {
          localStorage.removeItem(key);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error clearing localStorage items:', error);
      return false;
    }
  }

  /**
   * Get all keys in the current namespace
   * @returns Array of keys
   */
  keys(): string[] {
    const namespacedPrefix = `${this.namespace}:`;
    const prefixLength = namespacedPrefix.length;
    
    return Object.keys(localStorage)
      .filter(key => key.startsWith(namespacedPrefix))
      .map(key => key.substring(prefixLength));
  }

  /**
   * Get all values in the current namespace
   * @returns Object with all values
   */
  getAll(): Partial<T> {
    const result: Partial<T> = {};
    
    this.keys().forEach(key => {
      const value = this.get(key);
      if (value !== undefined) {
        (result as any)[key] = value;
      }
    });
    
    return result;
  }
}

// Create default storage instances
export const appStorage = new Storage({ namespace: 'app' });
export const userStorage = new Storage<{
  preferences: Record<string, any>;
  theme: string;
  lastLogin: Date;
  recentItems: string[];
}>({ namespace: 'user' });
export const gameStorage = new Storage<{
  savedGames: Record<string, any>;
  achievements: string[];
  highScores: Record<string, number>;
}>({ namespace: 'game' });

// Create a session storage version
export class SessionStorage<T = any> extends Storage<T> {
  /**
   * Set an item in session storage
   */
  set<K extends keyof T>(key: string, value: T[K], options?: { expiry?: number }): boolean {
    try {
      const namespacedKey = this.getNamespacedKey(key);
      const expiry = options?.expiry || this.defaultExpiry;
      
      const item: StorageItem<T[K]> = {
        value,
      };
      
      if (expiry) {
        item.expiry = Date.now() + expiry;
      }
      
      sessionStorage.setItem(namespacedKey, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Error setting sessionStorage item:', error);
      return false;
    }
  }

  /**
   * Get an item from session storage
   */
  get<K extends keyof T>(key: string, defaultValue?: T[K]): T[K] | undefined {
    try {
      const namespacedKey = this.getNamespacedKey(key);
      const itemStr = sessionStorage.getItem(namespacedKey);
      
      if (!itemStr) {
        return defaultValue;
      }
      
      const item: StorageItem<T[K]> = JSON.parse(itemStr);
      
      // Check if the item has expired
      if (item.expiry && Date.now() > item.expiry) {
        this.remove(key);
        return defaultValue;
      }
      
      return item.value;
    } catch (error) {
      console.error('Error getting sessionStorage item:', error);
      return defaultValue;
    }
  }

  /**
   * Remove an item from session storage
   */
  remove(key: string): boolean {
    try {
      const namespacedKey = this.getNamespacedKey(key);
      sessionStorage.removeItem(namespacedKey);
      return true;
    } catch (error) {
      console.error('Error removing sessionStorage item:', error);
      return false;
    }
  }

  /**
   * Clear all items in the current namespace from session storage
   */
  clear(): boolean {
    try {
      const namespacedPrefix = `${this.namespace}:`;
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(namespacedPrefix)) {
          sessionStorage.removeItem(key);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error clearing sessionStorage items:', error);
      return false;
    }
  }

  /**
   * Get all keys in the current namespace from session storage
   */
  keys(): string[] {
    const namespacedPrefix = `${this.namespace}:`;
    const prefixLength = namespacedPrefix.length;
    
    return Object.keys(sessionStorage)
      .filter(key => key.startsWith(namespacedPrefix))
      .map(key => key.substring(prefixLength));
  }
}

export const sessionAppStorage = new SessionStorage({ namespace: 'app' });

export default {
  Storage,
  SessionStorage,
  appStorage,
  userStorage,
  gameStorage,
  sessionAppStorage,
}; 