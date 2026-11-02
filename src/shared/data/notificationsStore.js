/**
 * Shared in-memory store for Notifications.
 * Provides live updates and unread counts across headers and screens.
 *
 * Starts EMPTY: there is no notifications backend yet, so nothing is
 * pre-filled or invented. The screen shows its empty state and the bell
 * shows no unread dot until real notifications are added to this store.
 */

let notifications = [];

let listeners = [];

export function getNotifications() {
  return [...notifications];
}

export function getUnreadCount() {
  return notifications.filter((n) => !n.isRead).length;
}

export function markAsRead(id) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  notifyListeners();
  return notifications;
}

export function markAllAsRead() {
  notifications = notifications.map((n) => ({ ...n, isRead: true }));
  notifyListeners();
  return notifications;
}

export function deleteNotification(id) {
  notifications = notifications.filter((n) => n.id !== id);
  notifyListeners();
  return notifications;
}

export function clearAllNotifications() {
  notifications = [];
  notifyListeners();
  return notifications;
}

export function subscribeNotifications(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn([...notifications]);
    } catch (e) {}
  });
}
