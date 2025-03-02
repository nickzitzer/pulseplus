/**
 * Standardized event tracking for user actions
 */

export enum EventCategory {
  NAVIGATION = 'navigation',
  ENGAGEMENT = 'engagement',
  CONVERSION = 'conversion',
  GAME = 'game',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  USER = 'user',
  CONTENT = 'content',
  ACHIEVEMENT = 'achievement',
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface TrackingEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  properties?: EventProperties;
  timestamp?: number;
}

export interface TrackingAdapter {
  initialize: () => Promise<void>;
  trackEvent: (event: TrackingEvent) => Promise<void>;
  setUser: (userId: string, userProperties?: Record<string, any>) => Promise<void>;
  pageView: (path: string, properties?: EventProperties) => Promise<void>;
}

class EventTracker {
  private adapters: TrackingAdapter[] = [];
  private isInitialized = false;
  private eventQueue: TrackingEvent[] = [];
  private userId: string | null = null;
  private userProperties: Record<string, any> = {};
  private enabled = true;

  /**
   * Add a tracking adapter
   * @param adapter - The tracking adapter to add
   */
  addAdapter(adapter: TrackingAdapter): void {
    this.adapters.push(adapter);
  }

  /**
   * Initialize all tracking adapters
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Promise.all(this.adapters.map(adapter => adapter.initialize()));
      this.isInitialized = true;

      // Process any queued events
      if (this.eventQueue.length > 0) {
        const queuedEvents = [...this.eventQueue];
        this.eventQueue = [];
        queuedEvents.forEach(event => this.trackEvent(event));
      }

      // Set user if available
      if (this.userId) {
        this.setUser(this.userId, this.userProperties);
      }
    } catch (error) {
      console.error('Failed to initialize event tracking:', error);
    }
  }

  /**
   * Enable or disable event tracking
   * @param enabled - Whether tracking is enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Track an event
   * @param event - The event to track
   */
  trackEvent(event: TrackingEvent): void {
    if (!this.enabled) return;

    const enrichedEvent: TrackingEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    if (!this.isInitialized) {
      this.eventQueue.push(enrichedEvent);
      return;
    }

    this.adapters.forEach(adapter => {
      adapter.trackEvent(enrichedEvent).catch(error => {
        console.error('Error tracking event:', error);
      });
    });
  }

  /**
   * Set the current user
   * @param userId - User identifier
   * @param userProperties - Additional user properties
   */
  setUser(userId: string, userProperties: Record<string, any> = {}): void {
    this.userId = userId;
    this.userProperties = userProperties;

    if (!this.isInitialized) return;

    this.adapters.forEach(adapter => {
      adapter.setUser(userId, userProperties).catch(error => {
        console.error('Error setting user:', error);
      });
    });
  }

  /**
   * Track a page view
   * @param path - The page path
   * @param properties - Additional properties
   */
  pageView(path: string, properties: EventProperties = {}): void {
    if (!this.enabled) return;

    if (!this.isInitialized) {
      this.eventQueue.push({
        category: EventCategory.NAVIGATION,
        action: 'page_view',
        label: path,
        properties,
        timestamp: Date.now(),
      });
      return;
    }

    this.adapters.forEach(adapter => {
      adapter.pageView(path, properties).catch(error => {
        console.error('Error tracking page view:', error);
      });
    });
  }

  /**
   * Track a navigation event
   * @param from - Source page/component
   * @param to - Destination page/component
   * @param properties - Additional properties
   */
  trackNavigation(from: string, to: string, properties: EventProperties = {}): void {
    this.trackEvent({
      category: EventCategory.NAVIGATION,
      action: 'navigate',
      label: `${from} -> ${to}`,
      properties,
    });
  }

  /**
   * Track a button click
   * @param buttonName - Name of the button
   * @param location - Where the button is located
   * @param properties - Additional properties
   */
  trackButtonClick(buttonName: string, location: string, properties: EventProperties = {}): void {
    this.trackEvent({
      category: EventCategory.ENGAGEMENT,
      action: 'button_click',
      label: buttonName,
      properties: {
        location,
        ...properties,
      },
    });
  }

  /**
   * Track a form submission
   * @param formName - Name of the form
   * @param success - Whether submission was successful
   * @param properties - Additional properties
   */
  trackFormSubmit(formName: string, success: boolean, properties: EventProperties = {}): void {
    this.trackEvent({
      category: EventCategory.ENGAGEMENT,
      action: 'form_submit',
      label: formName,
      properties: {
        success,
        ...properties,
      },
    });
  }

  /**
   * Track a game event
   * @param action - Game action (start, complete, level_up, etc.)
   * @param gameId - Game identifier
   * @param properties - Additional properties
   */
  trackGameEvent(action: string, gameId: string, properties: EventProperties = {}): void {
    this.trackEvent({
      category: EventCategory.GAME,
      action,
      label: gameId,
      properties,
    });
  }

  /**
   * Track an achievement
   * @param achievementId - Achievement identifier
   * @param properties - Additional properties
   */
  trackAchievement(achievementId: string, properties: EventProperties = {}): void {
    this.trackEvent({
      category: EventCategory.ACHIEVEMENT,
      action: 'unlock',
      label: achievementId,
      properties,
    });
  }

  /**
   * Track an error
   * @param errorType - Type of error
   * @param errorMessage - Error message
   * @param properties - Additional properties
   */
  trackError(errorType: string, errorMessage: string, properties: EventProperties = {}): void {
    this.trackEvent({
      category: EventCategory.ERROR,
      action: errorType,
      label: errorMessage,
      properties,
    });
  }

  /**
   * Track a performance metric
   * @param metricName - Name of the metric
   * @param value - Metric value
   * @param properties - Additional properties
   */
  trackPerformance(metricName: string, value: number, properties: EventProperties = {}): void {
    this.trackEvent({
      category: EventCategory.PERFORMANCE,
      action: metricName,
      value,
      properties,
    });
  }
}

// Create and export a singleton instance
export const eventTracker = new EventTracker();

export default eventTracker; 