import { prisma } from "../utils/prisma.js";

function mapSettings(settings) {
  if (!settings) return {};
  return {
    theme: settings.theme,
    notifications: settings.notifications_enabled,
    notifications_enabled: settings.notifications_enabled,
    location_permission: settings.location_permission,
    privacy_history: settings.save_history,
    save_history: settings.save_history,
    data_consent: settings.data_consent,
  };
}

export async function getSettings(req, res, next) {
  try {
    const settings = await prisma.userSettings.upsert({
      where: { user_id: req.account.id },
      update: {},
      create: { user_id: req.account.id },
    });
    res.json({ settings: mapSettings(settings) });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const settings = await prisma.userSettings.upsert({
      where: { user_id: req.account.id },
      update: {
        theme: req.body.theme,
        notifications_enabled: req.body.notifications_enabled ?? req.body.notifications,
        location_permission: req.body.location_permission,
        save_history: req.body.save_history ?? req.body.privacy_history,
        data_consent: req.body.data_consent,
      },
      create: {
        user_id: req.account.id,
        theme: req.body.theme || "light",
        notifications_enabled: req.body.notifications_enabled ?? req.body.notifications ?? true,
        location_permission: req.body.location_permission ?? false,
        save_history: req.body.save_history ?? req.body.privacy_history ?? true,
        data_consent: req.body.data_consent ?? true,
      },
    });
    res.json({ settings: mapSettings(settings), message: "Settings updated" });
  } catch (error) {
    next(error);
  }
}
