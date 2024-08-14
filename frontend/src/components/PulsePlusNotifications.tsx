import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';

interface Notification {
  sys_id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

const PulsePlusNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {

    const fetchNotifications = async () => {
      try {
        const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notifiers`);
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError('Failed to load notifications. Please try again later.');
      }
    };

    fetchNotifications();
    // Set up a polling mechanism to fetch notifications periodically
    const intervalId = setInterval(fetchNotifications, 60000); // Fetch every minute

    return () => clearInterval(intervalId);
  }, [fetchWithAuth]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      setNotifications(notifications.map(notif => 
        notif.sys_id === notificationId ? { ...notif, read: true } : notif
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetchWithAuth(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
      setNotifications(notifications.filter(notif => notif.sys_id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const unreadCount = notifications.filter(notif => !notif.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-teal-600 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-10">
          <div className="py-2">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.sys_id} 
                  className={`px-4 py-2 hover:bg-gray-100 ${notification.read ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-black font-semibold'}`}>
                      {notification.message}
                    </p>
                    <button 
                      onClick={() => deleteNotification(notification.sys_id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                  {!notification.read && (
                    <button 
                      onClick={() => markAsRead(notification.sys_id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PulsePlusNotifications;
