import { NotificationBell } from "@pledgeoff/web";

const shell: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 16,
  padding: "12px 16px",
  background: "var(--surface)",
  border: "1px solid var(--line)",
};

export const WithUnread = () => (
  <div style={shell}>
    <NotificationBell initialUnreadCount={3} />
  </div>
);

export const AllRead = () => (
  <div style={shell}>
    <NotificationBell initialUnreadCount={0} />
  </div>
);
