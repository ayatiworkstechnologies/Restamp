/**
 * Shared in-memory store for Notifications.
 * Provides live updates and unread counts across headers and screens.
 */

let notifications = [
  {
    id: "notif-1",
    type: "property",
    category: "Properties",
    title: "Price Drop on Emerald Heights!",
    message: "The asking price for Emerald Heights 3 BHK in Anna Nagar dropped by ₹10 Lakhs. Now ₹1.35 Cr.",
    time: "15m ago",
    dateGroup: "Today",
    isRead: false,
    icon: "tag",
    iconColor: "#16A34A",
    iconBg: "#F0FDF4",
    propertyId: "rec-anna-1",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "notif-2",
    type: "visit",
    category: "Visits",
    title: "Site Visit Confirmed",
    message: "Your site visit for 2 BHK Luxury Apartment in Anna Nagar is confirmed for 30 Oct at 04:30 PM with Suresh Babu.",
    time: "2h ago",
    dateGroup: "Today",
    isRead: false,
    icon: "calendar",
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    propertyId: "rec-anna-1",
    image: null,
  },
  {
    id: "notif-3",
    type: "property",
    category: "Properties",
    title: "New 3 BHK Villa in ECR",
    message: "A new sea-facing gated villa was just published matching your search criteria in ECR.",
    time: "5h ago",
    dateGroup: "Today",
    isRead: false,
    icon: "home",
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    propertyId: "rec-omr-1",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "notif-4",
    type: "system",
    category: "System",
    title: "Account Verified Successfully",
    message: "Your buyer profile has been verified. You now have direct phone reveal access to verified owners.",
    time: "Yesterday",
    dateGroup: "Earlier",
    isRead: true,
    icon: "shield",
    iconColor: "#16A34A",
    iconBg: "#F0FDF4",
    propertyId: null,
    image: null,
  },
  {
    id: "notif-5",
    type: "visit",
    category: "Visits",
    title: "Visit Completed — Share Feedback",
    message: "Your walkthrough for 3 BHK Luxury Villa in Adyar was marked completed. Rate your experience with Sundar Raman.",
    time: "2 days ago",
    dateGroup: "Earlier",
    isRead: true,
    icon: "star",
    iconColor: "#D97706",
    iconBg: "#FFFBEB",
    propertyId: null,
    image: null,
  },
  {
    id: "notif-6",
    type: "property",
    category: "Properties",
    title: "4 New Matches in Velachery",
    message: "Properties matching your budget range (₹50L - ₹1Cr) in Velachery were added this week.",
    time: "3 days ago",
    dateGroup: "Earlier",
    isRead: true,
    icon: "sparkles",
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    propertyId: "rec-omr-2",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
  },
];

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
