import { Response } from "express";
import AppMenu from "../models/AppMenu";
import { AuthRequest } from "../middleware/auth";

function buildSsoUrl(targetUrl: string, token: string, redirectPath: string) {
  const base = targetUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ token, redirect: redirectPath || "/" });
  return `${base}/sso/callback#${params.toString()}`;
}

export async function launchMenu(req: AuthRequest, res: Response) {
  const menu = await AppMenu.findById(req.params.id);
  if (!menu || !menu.isActive) {
    return res.status(404).json({ message: "Menu tidak ditemukan atau tidak aktif." });
  }

  if (req.user?.role !== "superuser" && !menu.allowedRoles.includes(req.user?.role || "")) {
    return res.status(403).json({ message: "Role Anda tidak memiliki akses ke menu ini." });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return res.json({
    url: buildSsoUrl(menu.targetUrl, token, menu.defaultPath),
  });
}
