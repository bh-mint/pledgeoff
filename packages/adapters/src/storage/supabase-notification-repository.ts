import { Result, ok, err } from 'neverthrow';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  NotificationRepositoryError,
  type Notification,
  type NotificationType,
} from '@pledgeoff/core';
import type { INotificationRepository } from '@pledgeoff/core';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export class SupabaseNotificationRepository implements INotificationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(notification: Notification): Promise<Result<Notification, NotificationRepositoryError>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        id: notification.id,
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        read_at: notification.readAt,
        created_at: notification.createdAt,
      })
      .select()
      .single<NotificationRow>();

    if (error) return err(new NotificationRepositoryError(error.message));
    return ok(rowToNotification(data));
  }

  async findByUserId(userId: string, limit = 20): Promise<Result<Notification[], NotificationRepositoryError>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<NotificationRow[]>();

    if (error) return err(new NotificationRepositoryError(error.message));
    return ok((data ?? []).map(rowToNotification));
  }

  async countUnread(userId: string): Promise<Result<number, NotificationRepositoryError>> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) return err(new NotificationRepositoryError(error.message));
    return ok(count ?? 0);
  }

  async markAllRead(userId: string, readAt: string): Promise<Result<void, NotificationRepositoryError>> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) return err(new NotificationRepositoryError(error.message));
    return ok(undefined);
  }
}
