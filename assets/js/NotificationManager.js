export class NotificationManager {
  static async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("Ce navigateur ne prend pas en charge les notifications de bureau");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  static async showNotification(title, options = {}) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const defaultOptions = {
      icon: "/assets/icons/icon-192x192.png",
      badge: "/assets/icons/icon-192x192.png",
      vibrate: [200, 100, 200]
    };

    const notification = new Notification(title, { ...defaultOptions, ...options });

    notification.onclick = function () {
      window.focus();
      this.close();
    };
  }

  static async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        return registration;
      } catch (error) {
        console.error("Erreur lors de l'enregistrement du Service Worker:", error);
        return null;
      }
    } else {
      console.warn("Les Service Workers ne sont pas pris en charge par ce navigateur");
      return null;
    }
  }
} 