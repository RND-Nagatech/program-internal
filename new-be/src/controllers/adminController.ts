import { Response } from "express";
import bcrypt from "bcrypt";
import AppMenu from "../models/AppMenu";
import Role from "../models/Role";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

function normalizeCode(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export async function listRoles(_req: AuthRequest, res: Response) {
  const roles = await Role.find().sort({ code: 1 });
  return res.json(roles);
}

export async function createRole(req: AuthRequest, res: Response) {
  const role = await Role.create({
    code: normalizeCode(req.body.code),
    name: req.body.name,
    description: req.body.description,
  });
  return res.status(201).json(role);
}

export async function updateRole(req: AuthRequest, res: Response) {
  const role = await Role.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      description: req.body.description,
    },
    { new: true }
  );
  if (!role) return res.status(404).json({ message: "Role tidak ditemukan." });
  return res.json(role);
}

export async function deleteRole(req: AuthRequest, res: Response) {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ message: "Role tidak ditemukan." });
  if (role.isSystem) return res.status(400).json({ message: "Role sistem tidak boleh dihapus." });

  const usedByUser = await User.exists({ role: role.code });
  const usedByMenu = await AppMenu.exists({ allowedRoles: role.code });
  if (usedByUser || usedByMenu) {
    return res.status(400).json({ message: "Role masih digunakan oleh user atau menu." });
  }

  await role.deleteOne();
  return res.json({ success: true });
}

export async function listUsers(_req: AuthRequest, res: Response) {
  const users = await User.find({}, "-password").sort({ username: 1 });
  return res.json(users);
}

export async function createUser(req: AuthRequest, res: Response) {
  const { username, password, name, role, isActive } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: "Username, password, nama, dan role wajib diisi." });
  }

  const roleCode = normalizeCode(role);
  const roleExists = await Role.exists({ code: roleCode });
  if (!roleExists) return res.status(400).json({ message: "Role tidak valid." });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: normalizeCode(username),
    password: hashedPassword,
    name,
    role: roleCode,
    isActive: isActive !== false,
  });

  const safeUser = user.toObject() as unknown as Record<string, unknown>;
  delete safeUser.password;
  return res.status(201).json(safeUser);
}

export async function updateUser(req: AuthRequest, res: Response) {
  const { username, password, name, role, isActive } = req.body;
  const update: Record<string, unknown> = {};

  if (username) update.username = normalizeCode(username);
  if (name) update.name = name;
  if (typeof isActive === "boolean") update.isActive = isActive;
  if (role) {
    const roleCode = normalizeCode(role);
    const roleExists = await Role.exists({ code: roleCode });
    if (!roleExists) return res.status(400).json({ message: "Role tidak valid." });
    update.role = roleCode;
  }
  if (password) update.password = await bcrypt.hash(password, 10);

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
  if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
  return res.json(user);
}

export async function deleteUser(req: AuthRequest, res: Response) {
  if (req.user?.userId === req.params.id) {
    return res.status(400).json({ message: "User yang sedang login tidak boleh menghapus akun sendiri." });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
  return res.json({ success: true });
}

export async function listMenus(req: AuthRequest, res: Response) {
  const query = req.user?.role === "superuser" ? {} : { isActive: true };
  const menus = await AppMenu.find(query).sort({ division: 1, name: 1 });
  return res.json(menus);
}

export async function createMenu(req: AuthRequest, res: Response) {
  const menu = await AppMenu.create({
    code: normalizeCode(req.body.code),
    name: req.body.name,
    division: normalizeCode(req.body.division),
    description: req.body.description,
    targetUrl: req.body.targetUrl,
    defaultPath: req.body.defaultPath || "/",
    allowedRoles: (req.body.allowedRoles || []).map(normalizeCode),
    isActive: req.body.isActive !== false,
  });
  return res.status(201).json(menu);
}

export async function updateMenu(req: AuthRequest, res: Response) {
  const update = {
    name: req.body.name,
    division: req.body.division ? normalizeCode(req.body.division) : undefined,
    description: req.body.description,
    targetUrl: req.body.targetUrl,
    defaultPath: req.body.defaultPath || "/",
    allowedRoles: Array.isArray(req.body.allowedRoles) ? req.body.allowedRoles.map(normalizeCode) : undefined,
    isActive: req.body.isActive,
  };

  const menu = await AppMenu.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!menu) return res.status(404).json({ message: "Menu tidak ditemukan." });
  return res.json(menu);
}

export async function deleteMenu(req: AuthRequest, res: Response) {
  const menu = await AppMenu.findByIdAndDelete(req.params.id);
  if (!menu) return res.status(404).json({ message: "Menu tidak ditemukan." });
  return res.json({ success: true });
}
