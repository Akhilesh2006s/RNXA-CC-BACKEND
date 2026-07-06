import { Router } from "express";
import {
  addClientProject,
  addProjectUpdate,
  addClientCost,
  convertLead,
  createLead,
  deleteClientCost,
  deleteClientProject,
  deleteLead,
  deleteProjectUpdateEntry,
  getClient,
  getClientFinance,
  getClientHub,
  getLead,
  getSalesAnalytics,
  listClientProjects,
  listClients,
  listLeads,
  updateClient,
  updateClientProject,
  updateLead,
  updateLeadStage,
  updateProjectUpdateEntry
} from "../controllers/sales.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";

const salesWriteRoles = ["Founder", "CEO", "Sales"];
const salesReadRoles = ["Founder", "CEO", "Sales", "Operations", "Finance"];

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get("/analytics/summary", requireRoles(...salesReadRoles), getSalesAnalytics);

salesRouter.get("/leads", listLeads);
salesRouter.post("/leads", requireRoles(...salesWriteRoles), createLead);
salesRouter.get("/leads/:leadId", getLead);
salesRouter.patch("/leads/:leadId", requireRoles(...salesWriteRoles), updateLead);
salesRouter.delete("/leads/:leadId", requireRoles(...salesWriteRoles), deleteLead);
salesRouter.patch("/leads/:leadId/stage", requireRoles(...salesWriteRoles), updateLeadStage);
salesRouter.post("/leads/:leadId/convert", requireRoles(...salesWriteRoles), convertLead);

salesRouter.get("/clients", listClients);
salesRouter.get("/clients/:clientId/hub", requireRoles(...salesReadRoles), getClientHub);
salesRouter.get("/clients/:clientId/projects", requireRoles(...salesReadRoles), listClientProjects);
salesRouter.get("/clients/:clientId/finance", requireRoles(...salesReadRoles), getClientFinance);
salesRouter.get("/clients/:clientId", requireRoles(...salesReadRoles), getClient);
salesRouter.patch("/clients/:clientId", requireRoles(...salesWriteRoles), updateClient);
salesRouter.post("/clients/:clientId/costs", requireRoles(...salesWriteRoles), addClientCost);
salesRouter.delete("/clients/:clientId/costs/:costId", requireRoles(...salesWriteRoles), deleteClientCost);
salesRouter.post("/clients/:clientId/projects", requireRoles(...salesWriteRoles), addClientProject);
salesRouter.patch(
  "/clients/:clientId/projects/:projectId",
  requireRoles(...salesWriteRoles),
  updateClientProject
);
salesRouter.delete(
  "/clients/:clientId/projects/:projectId",
  requireRoles(...salesWriteRoles),
  deleteClientProject
);
salesRouter.post(
  "/clients/:clientId/projects/:projectId/updates",
  requireRoles(...salesWriteRoles),
  addProjectUpdate
);
salesRouter.patch(
  "/clients/:clientId/projects/:projectId/updates/:updateId",
  requireRoles(...salesWriteRoles),
  updateProjectUpdateEntry
);
salesRouter.delete(
  "/clients/:clientId/projects/:projectId/updates/:updateId",
  requireRoles(...salesWriteRoles),
  deleteProjectUpdateEntry
);
