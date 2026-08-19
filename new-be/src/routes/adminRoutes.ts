import { Router } from "express";
import {
  createMenu,
  createRole,
  createUser,
  deleteMenu,
  deleteRole,
  deleteUser,
  listMenus,
  listRoles,
  listUsers,
  updateMenu,
  updateRole,
  updateUser,
} from "../controllers/adminController";
import { authenticate, requireSuperuser } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/roles", listRoles);
router.get("/menus", listMenus);

router.use(requireSuperuser);

router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.post("/menus", createMenu);
router.put("/menus/:id", updateMenu);
router.delete("/menus/:id", deleteMenu);

export default router;
