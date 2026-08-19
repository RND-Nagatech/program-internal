import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { connectDB } from "../config/db";
import AppMenu from "../models/AppMenu";
import Role from "../models/Role";
import User from "../models/User";

dotenv.config();

async function seed() {
  await connectDB();

  const roles = [
    { code: "superuser", name: "Superuser", description: "Akses penuh portal internal.", isSystem: true },
    { code: "finance", name: "Finance", description: "Divisi finance." },
    { code: "hr", name: "HR", description: "Divisi human resources." },
    { code: "warehouse", name: "Warehouse", description: "Divisi warehouse." },
    { code: "corsec", name: "Corsec", description: "Corporate secretary." },
    { code: "rnd", name: "RnD", description: "Research and development." },
  ];

  for (const role of roles) {
    await Role.updateOne({ code: role.code }, { $setOnInsert: role }, { upsert: true });
  }

  const username = (process.env.SEED_SUPERUSER_USERNAME || "admin@internal.local").toLowerCase();
  const password = process.env.SEED_SUPERUSER_PASSWORD || "admin123456";
  const name = process.env.SEED_SUPERUSER_NAME || "Internal Admin";
  const hashedPassword = await bcrypt.hash(password, 10);

  await User.updateOne(
    { username },
    {
      $setOnInsert: {
        username,
        password: hashedPassword,
        name,
        role: "superuser",
        isActive: true,
      },
    },
    { upsert: true }
  );

  await AppMenu.updateOne(
    { code: "subscriber" },
    {
      $setOnInsert: {
        code: "subscriber",
        name: "Subscriber",
        division: "finance",
        description: "Program finance untuk pengelolaan subscriber.",
        targetUrl: process.env.FINANCE_SUBSCRIBER_URL || "http://localhost:8080",
        defaultPath: "/dashboard",
        allowedRoles: ["finance", "corsec", "rnd"],
        isActive: true,
      },
    },
    { upsert: true }
  );

  console.log("Seed complete.");
  console.log(`Superuser: ${username}`);
  console.log(`Password : ${password}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
