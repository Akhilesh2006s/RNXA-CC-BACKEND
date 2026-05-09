import { Router } from "express";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee
} from "../controllers/employee.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";

const mutateRoles = ["Founder", "CEO", "HR", "Operations"];

export const employeeRouter = Router();
employeeRouter.use(requireAuth);

employeeRouter.get("/", listEmployees);
employeeRouter.get("/:id", getEmployee);
employeeRouter.post("/", requireRoles(...mutateRoles), createEmployee);
employeeRouter.patch("/:id", requireRoles(...mutateRoles), updateEmployee);
employeeRouter.delete("/:id", requireRoles(...mutateRoles), deleteEmployee);
