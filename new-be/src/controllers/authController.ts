import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_to_a_strong_portal_secret";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"];

function signPortalToken(user: { _id: unknown; username: string; name: string; role: string }) {
  return jwt.sign(
    {
      userId: String(user._id),
      username: user.username,
      name: user.name,
      role: user.role,
      iss: "program-internal",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi." });
  }

  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Username atau password salah." });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ message: "Username atau password salah." });
  }

  const token = signPortalToken(user);
  return res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
}

export async function me(req: AuthRequest, res: Response) {
  return res.json({ user: req.user });
}
