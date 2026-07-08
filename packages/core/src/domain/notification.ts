import { z } from 'zod';

// Kept in sync with the notifications_type_check DB constraint
export const NotificationTypeSchema = z.enum(['queue_alert', 'accuracy_report', 'movement_alert']);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  readAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});
export type Notification = z.infer<typeof NotificationSchema>;

export class NotificationRepositoryError extends Error {
  readonly code = 'NOTIFICATION_REPOSITORY_ERROR';
}

export function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
}): Notification {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
}
