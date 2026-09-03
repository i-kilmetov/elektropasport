import { maintenanceRemindersEnabledForHost } from "@/lib/app-env";

/**
 * Kill-switch for «Проверка и обслуживание».
 * Set NEXT_PUBLIC_MAINTENANCE_REMINDERS=false to hide UI and skip cron sends
 * without touching the rest of the product.
 */
export function isMaintenanceRemindersEnabled(): boolean {
  return maintenanceRemindersEnabledForHost();
}
