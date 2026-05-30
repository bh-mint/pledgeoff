import type { Result } from 'neverthrow';
import type { Notification, NotificationRepositoryError } from '../domain/notification';

export interface INotificationRepository {
  save(notification: Notification): Promise<Result<Notification, NotificationRepositoryError>>;
  findByUserId(userId: string, limit?: number): Promise<Result<Notification[], NotificationRepositoryError>>;
  countUnread(userId: string): Promise<Result<number, NotificationRepositoryError>>;
  markAllRead(userId: string, readAt: string): Promise<Result<void, NotificationRepositoryError>>;
}
