import { notify, getRoleRecipients } from "@/lib/notifications";
import {
  computeWeightAlerts,
  type WeightAlert,
  type WeightAlertChild,
  type WeightAlertMeasurement,
} from "./weight-alerts";

type ChildForNotification = WeightAlertChild & {
  id: string;
  first_name: string;
  client_id: string;
};

/**
 * Calcule les alertes actives et notifie la consultante pour chacune, sans
 * jamais lever : une alerte perdue ne doit pas faire échouer la saisie de
 * pesée qui l'a déclenchée.
 */
export const notifyWeightAlerts = async (
  child: ChildForNotification,
  measurements: WeightAlertMeasurement[],
): Promise<WeightAlert[]> => {
  try {
    const alerts = computeWeightAlerts(child, measurements);
    if (alerts.length === 0) return alerts;

    const recipients = await getRoleRecipients("consultant");
    for (const alert of alerts) {
      const event = alert.level === "alerte" ? "weight_alert_alert" : "weight_alert_vigilance";
      await notify(
        event,
        recipients,
        {
          childId: child.id,
          childName: child.first_name,
          clientId: child.client_id,
          message: alert.message,
        },
        { dedupeId: `${child.id}:${alert.rule}:${alert.measurementId}` },
      );
    }

    return alerts;
  } catch (error) {
    console.error("notifyWeightAlerts a échoué :", error);
    return [];
  }
};
