import { Metadata } from "next";
import { NotificationHistory } from "@/components/notifications/notification-history";

export const metadata: Metadata = { title: "Notifications" };

const ConsultanteNotificationsPage = () => (
  <div className="space-y-6">
    <h1 className="font-serif text-2xl font-bold text-primary-green">
      Notifications
    </h1>
    <NotificationHistory />
  </div>
);

export default ConsultanteNotificationsPage;
