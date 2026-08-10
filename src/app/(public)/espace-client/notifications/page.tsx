import { Metadata } from "next";
import { NotificationHistory } from "@/components/notifications/notification-history";

export const metadata: Metadata = { title: "Mes notifications" };

const NotificationsPage = () => (
  <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <h1 className="font-serif text-2xl font-bold text-primary-green">
      Mes notifications
    </h1>
    <NotificationHistory />
  </div>
);

export default NotificationsPage;
