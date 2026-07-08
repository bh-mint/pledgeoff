-- 15.6: in-app notification for competitor movement alerts.
-- Extend the type CHECK to allow 'movement_alert' (kept in sync with
-- NotificationTypeSchema in packages/core/src/domain/notification.ts).
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('queue_alert', 'accuracy_report', 'movement_alert'));
