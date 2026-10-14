import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret() {
  return process.env.JWT_SECRET || "change_this_to_a_strong_portal_secret";
}

export interface AuthUser {
  userId: string;
  username: string;
  name: string;
  role: string;
  iss?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthUser;
    if (payload.iss !== "program-internal") {
      return res.status(401).json({ message: "Issuer token tidak valid." });
    }
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Token tidak valid atau kedaluwarsa." });
  }
}

export function requireSuperuser(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "superuser") {
    return res.status(403).json({ message: "Hanya superuser yang boleh mengakses fitur ini." });
  }
  return next();
}
