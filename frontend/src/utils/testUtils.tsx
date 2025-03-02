/**
 * Testing utilities for common test setups, mocks, and assertions
 * This file is designed to be safe for production builds
 */

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Simple no-op function for production
const noop = () => {};

// Export production-safe implementations
if (isProduction) {
  module.exports = {
    mockUsers: {},
    mockGames: [],
    MockLocalStorage: class {
      clear() {}
      getItem() { return null; }
      setItem() {}
      removeItem() {}
      get length() { return 0; }
      key() { return null; }
    },
    setupMockLocalStorage: () => ({ clear: noop }),
    setupMockFetch: () => noop,
    renderWithProviders: () => ({ container: document.createElement('div') }),
    waitForElementToBeRemovedWithTimeout: async () => {},
    setupMockIntersectionObserver: () => noop,
    setupMockResizeObserver: () => noop,
    setupMockAnimationFrame: () => noop,
  };
} else {
  // Only import React and testing libraries in non-production
  const React = require('react');
  const { render } = require('@testing-library/react');
  const userEvent = require('@testing-library/user-event').default;
  const { AuthProvider } = require('./useAuth');

  // Define user type
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  }

  // Mock user data
  const mockUsers = {
    admin: {
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      permissions: ['view_users', 'edit_users', 'delete_users'],
    },
    user: {
      id: 'user-456',
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
      permissions: [],
    },
    premium: {
      id: 'premium-789',
      email: 'premium@example.com',
      name: 'Premium User',
      role: 'premium',
      permissions: ['access_premium_content'],
    },
  };

  // Mock game data
  const mockGames = [
    {
      id: 'game-1',
      title: 'Adventure Quest',
      description: 'An epic adventure game',
      imageUrl: '/images/adventure-quest.jpg',
      isPremium: false,
    },
    // Add more mock games as needed
  ];

  // Mock localStorage implementation
  class MockLocalStorage {
    private store: Record<string, string> = {};

    clear() {
      this.store = {};
    }

    getItem(key: string) {
      return this.store[key] || null;
    }

    setItem(key: string, value: string) {
      this.store[key] = String(value);
    }

    removeItem(key: string) {
      delete this.store[key];
    }

    get length() {
      return Object.keys(this.store).length;
    }

    key(index: number) {
      return Object.keys(this.store)[index] || null;
    }
  }

  // Setup mock localStorage
  const setupMockLocalStorage = () => {
    const mockStorage = new MockLocalStorage();
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
    
    return mockStorage;
  };

  // Mock fetch - using a safer approach without direct Jest references
  const setupMockFetch = (responses: Record<string, any> = {}) => {
    const originalFetch = global.fetch;
    
    // Create a simple mock function that doesn't rely on Jest
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Convert input to string URL
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      // Find matching response
      const matchingUrl = Object.keys(responses).find(key => url.includes(key));
      
      if (matchingUrl) {
        const response = responses[matchingUrl];
        
        if (typeof response === 'function') {
          return response(url, init);
        }
        
        return {
          ok: true,
          json: async () => response,
          text: async () => JSON.stringify(response),
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
        } as Response;
      }
      
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not found' }),
        text: async () => 'Not found',
        headers: new Headers(),
      } as Response;
    };
    
    // Replace global fetch with our mock
    global.fetch = mockFetch;
    
    // Return cleanup function
    return () => {
      global.fetch = originalFetch;
    };
  };

  // Custom render with providers
  interface CustomRenderOptions extends Omit<Parameters<typeof render>[1], 'wrapper'> {
    user?: User | null;
  }

  const renderWithProviders = (
    ui: React.ReactElement,
    options: CustomRenderOptions = {}
  ) => {
    const { user = null, ...renderOptions } = options;
    
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      );
    };
    
    return {
      ...render(ui, { wrapper: Wrapper, ...renderOptions }),
      user,
    };
  };

  // Helper to wait for element with timeout
  const waitForElementToBeRemovedWithTimeout = async (
    callback: () => HTMLElement | null,
    timeout: number = 5000
  ) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = callback();
      if (!element) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    throw new Error(`Element not removed within ${timeout}ms`);
  };

  // Mock IntersectionObserver
  const setupMockIntersectionObserver = () => {
    const originalIntersectionObserver = global.IntersectionObserver;
    
    // Create a simple mock implementation
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | null = null;
      readonly rootMargin: string = '0px';
      readonly thresholds: ReadonlyArray<number> = [0];
      
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        if (options) {
          // Handle the Element | Document | null type by ensuring we only assign Element | null
          this.root = options.root instanceof Element ? options.root : null;
          this.rootMargin = options.rootMargin || '0px';
          this.thresholds = Array.isArray(options.threshold) 
            ? options.threshold 
            : [options.threshold || 0];
        }
      }
      
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] { return []; }
    }
    
    // Replace the global constructor
    global.IntersectionObserver = MockIntersectionObserver as any;
    
    // Return cleanup function
    return () => {
      global.IntersectionObserver = originalIntersectionObserver;
    };
  };

  // Mock ResizeObserver
  const setupMockResizeObserver = () => {
    const originalResizeObserver = global.ResizeObserver;
    
    // Create a simple mock implementation
    class MockResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {}
      
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    
    // Replace the global constructor
    global.ResizeObserver = MockResizeObserver as any;
    
    // Return cleanup function
    return () => {
      global.ResizeObserver = originalResizeObserver;
    };
  };

  // Mock requestAnimationFrame
  const setupMockAnimationFrame = () => {
    const originalRAF = global.requestAnimationFrame;
    const originalCAF = global.cancelAnimationFrame;
    
    const animationFrameRequests = new Map<number, FrameRequestCallback>();
    let nextRequestId = 1;
    
    // Simple mock implementation without Jest
    global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      const requestId = nextRequestId++;
      animationFrameRequests.set(requestId, callback);
      return requestId;
    };
    
    global.cancelAnimationFrame = (requestId: number): void => {
      animationFrameRequests.delete(requestId);
    };
    
    // Helper to run all queued animation frames
    const runAnimationFrames = () => {
      const callbacks = Array.from(animationFrameRequests.values());
      animationFrameRequests.clear();
      callbacks.forEach(callback => callback(performance.now()));
    };
    
    // Return cleanup function
    return () => {
      global.requestAnimationFrame = originalRAF;
      global.cancelAnimationFrame = originalCAF;
    };
  };

  // Export all the testing utilities
  module.exports = {
    mockUsers,
    mockGames,
    MockLocalStorage,
    setupMockLocalStorage,
    setupMockFetch,
    renderWithProviders,
    waitForElementToBeRemovedWithTimeout,
    setupMockIntersectionObserver,
    setupMockResizeObserver,
    setupMockAnimationFrame,
  };
} 