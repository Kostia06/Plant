import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "mindbloom-reminders";

const NOTIFICATION_IDS = {
  dailyReflection: 1001,
  goalDeadline: 2000,
  streakAlert: 3001,
} as const;

async function ensurePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const { display } = await LocalNotifications.checkPermissions();
  if (display === "granted") return true;

  const result = await LocalNotifications.requestPermissions();
  return result.display === "granted";
}

export async function setupNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Mind Bloom Reminders",
    description: "Daily reflections, goal deadlines, and streak alerts",
    importance: 4,
    visibility: 1,
    sound: "default",
    vibration: true,
  });
}

export async function scheduleDailyReflection(
  hour = 20,
  minute = 0,
): Promise<boolean> {
  const permitted = await ensurePermission();
  if (!permitted) return false;

  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_IDS.dailyReflection }],
  });

  const scheduledAt = new Date();
  scheduledAt.setHours(hour, minute, 0, 0);
  if (scheduledAt <= new Date()) {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_IDS.dailyReflection,
        title: "Time to Reflect",
        body: "Your daily reflection awaits. Nurture your Mind Bloom.",
        channelId: CHANNEL_ID,
        schedule: {
          at: scheduledAt,
          repeats: true,
          every: "day",
        },
      },
    ],
  });

  return true;
}

export async function scheduleGoalDeadline(
  goalId: string,
  goalTitle: string,
  deadline: Date,
): Promise<boolean> {
  const permitted = await ensurePermission();
  if (!permitted) return false;

  const reminderTime = new Date(deadline.getTime() - 24 * 60 * 60 * 1000);
  if (reminderTime <= new Date()) return false;

  const notificationId =
    NOTIFICATION_IDS.goalDeadline + hashCode(goalId);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: "Goal Deadline Tomorrow",
        body: `"${goalTitle}" is due tomorrow. Stay on track!`,
        channelId: CHANNEL_ID,
        schedule: { at: reminderTime },
      },
    ],
  });

  return true;
}

export async function scheduleStreakAlert(
  currentStreak: number,
): Promise<boolean> {
  const permitted = await ensurePermission();
  if (!permitted) return false;

  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_IDS.streakAlert }],
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(21, 0, 0, 0);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_IDS.streakAlert,
        title: "Protect Your Streak!",
        body: `You're on a ${currentStreak}-day streak. Don't let your tree wither!`,
        channelId: CHANNEL_ID,
        schedule: { at: tomorrow },
      },
    ],
  });

  return true;
}

export async function cancelAllNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel(pending);
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000;
}
