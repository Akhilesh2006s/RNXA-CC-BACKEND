import mongoose from "mongoose";
import { LeadModel } from "../models/Lead.js";
import { ClientModel } from "../models/Client.js";
import { TaskModel } from "../models/Task.js";
import { UserModel } from "../models/User.js";
import { apiSuccess } from "../utils/apiResponse.js";
import { paginateQuery } from "../utils/pagination.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../services/activity-log.service.js";
import {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  addClientProjectSchema,
  updateClientSchema,
  PIPELINE_STAGES
} from "../validators/sales.js";

function taskIsDone(doc) {
  return doc.status === "Completed" || doc.status === "Archived";
}

const ACTIVE_STAGES = new Set([
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation"
]);

const LEAD_NOT_DELETED = { deletedAt: null };

export async function listLeads(req, res) {
  const filter = { ...LEAD_NOT_DELETED };
  if (req.query.stage) filter.stage = String(req.query.stage);
  else if (req.query.activeOnly === "true") filter.stage = { $in: Array.from(ACTIVE_STAGES) };

  const result = await paginateQuery(LeadModel, req.query, filter, [
    "company",
    "contactPerson",
    "source",
    "industry",
    "notes"
  ]);
  return res.json(apiSuccess(result));
}

export async function createLead(req, res) {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid lead payload", parsed.error.flatten());

  const assignedSalesRepId =
    parsed.data.assignedSalesRepId && mongoose.isValidObjectId(parsed.data.assignedSalesRepId)
      ? new mongoose.Types.ObjectId(parsed.data.assignedSalesRepId)
      : null;

  const lead = await LeadModel.create({
    company: parsed.data.company,
    contactPerson: parsed.data.contactPerson,
    phone: parsed.data.phone ?? "",
    email: parsed.data.email || "",
    source: parsed.data.source ?? "",
    industry: parsed.data.industry ?? "",
    estimatedDealValue: parsed.data.estimatedDealValue ?? 0,
    followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
    notes: parsed.data.notes ?? "",
    assignedSalesRepId
  });

  await logActivity({
    actorUserId: req.user.id,
    action: "sales.lead.create",
    entityType: "Lead",
    entityId: lead._id.toString(),
    after: lead.toObject()
  });

  return res.status(201).json(apiSuccess(lead, "Lead created"));
}

export async function getLead(req, res) {
  const lead = await LeadModel.findOne({
    _id: req.params.leadId,
    deletedAt: null
  }).populate("assignedSalesRepId", "name email role");
  if (!lead) throw new ApiError(404, "Lead not found");
  return res.json(apiSuccess(lead));
}

export async function updateLead(req, res) {
  const parsed = updateLeadSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid lead payload", parsed.error.flatten());

  const lead = await LeadModel.findOne({ _id: req.params.leadId, deletedAt: null });
  if (!lead) throw new ApiError(404, "Lead not found");

  const before = lead.toObject();

  if (parsed.data.company !== undefined) lead.company = parsed.data.company;
  if (parsed.data.contactPerson !== undefined) lead.contactPerson = parsed.data.contactPerson;
  if (parsed.data.phone !== undefined) lead.phone = parsed.data.phone ?? "";
  if (parsed.data.email !== undefined) lead.email = parsed.data.email ?? "";
  if (parsed.data.source !== undefined) lead.source = parsed.data.source ?? "";
  if (parsed.data.industry !== undefined) lead.industry = parsed.data.industry ?? "";
  if (parsed.data.estimatedDealValue !== undefined)
    lead.estimatedDealValue = parsed.data.estimatedDealValue ?? 0;
  if (parsed.data.followUpDate !== undefined)
    lead.followUpDate = parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null;
  if (parsed.data.notes !== undefined) lead.notes = parsed.data.notes ?? "";
  if (parsed.data.assignedSalesRepId !== undefined)
    lead.assignedSalesRepId =
      parsed.data.assignedSalesRepId && mongoose.isValidObjectId(parsed.data.assignedSalesRepId)
        ? new mongoose.Types.ObjectId(parsed.data.assignedSalesRepId)
        : null;

  await lead.save();

  await logActivity({
    actorUserId: req.user.id,
    action: "sales.lead.update",
    entityType: "Lead",
    entityId: lead._id.toString(),
    before,
    after: lead.toObject()
  });

  return res.json(apiSuccess(lead, "Lead updated"));
}

export async function deleteLead(req, res) {
  const lead = await LeadModel.findOne({ _id: req.params.leadId, deletedAt: null });
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.convertedClientId) throw new ApiError(400, "Cannot delete a converted lead");
  const before = lead.toObject();
  lead.deletedAt = new Date();
  await lead.save();
  await logActivity({
    actorUserId: req.user.id,
    action: "sales.lead.delete",
    entityType: "Lead",
    entityId: req.params.leadId,
    before,
    after: lead.toObject()
  });
  return res.json(apiSuccess(lead, "Lead deleted successfully"));
}

export async function updateLeadStage(req, res) {
  const parsed = updateLeadStageSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid stage payload", parsed.error.flatten());

  const lead = await LeadModel.findOne({ _id: req.params.leadId, deletedAt: null });
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.convertedClientId) throw new ApiError(400, "Lead already converted to client");
  if (lead.stage === "Won") throw new ApiError(400, "Closed won leads cannot move stages");

  const before = lead.toObject();
  lead.stage = parsed.data.stage;
  lead.lostReason =
    parsed.data.stage === "Lost" ? String(parsed.data.lostReason ?? "").trim() : "";
  await lead.save();

  await logActivity({
    actorUserId: req.user.id,
    action: "sales.lead.stage",
    entityType: "Lead",
    entityId: lead._id.toString(),
    before,
    after: lead.toObject()
  });

  return res.json(apiSuccess(lead, "Stage updated"));
}

export async function convertLead(req, res) {
  const lead = await LeadModel.findOne({ _id: req.params.leadId, deletedAt: null });
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.convertedClientId) throw new ApiError(400, "Lead already converted");

  if (lead.stage !== "Negotiation") {
    throw new ApiError(400, "Move lead to Negotiation before converting to client");
  }

  const dealValue = typeof lead.estimatedDealValue === "number" ? lead.estimatedDealValue : 0;

  const client = await ClientModel.create({
    company: lead.company,
    contactPerson: lead.contactPerson,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    dealValue,
    paymentStatus: "Pending",
    projectSummary: `Converted from CRM lead`,
    communicationLogs: [
      { message: lead.notes ? `Imported notes:\n${lead.notes}` : "Converted via CRM workflow" }
    ]
  });

  const beforeLead = lead.toObject();
  lead.stage = "Won";
  lead.convertedClientId = client._id;
  await lead.save();

  await logActivity({
    actorUserId: req.user.id,
    action: "sales.lead.convert",
    entityType: "Lead",
    entityId: lead._id.toString(),
    before: beforeLead,
    after: lead.toObject(),
    metadata: { clientId: client._id.toString() }
  });

  return res.status(201).json(apiSuccess({ lead, client }, "Lead converted to client"));
}

export async function listClients(req, res) {
  const result = await paginateQuery(ClientModel, req.query, {}, ["company", "contactPerson"]);
  return res.json(apiSuccess(result));
}

export async function getClient(req, res) {
  if (!mongoose.isValidObjectId(req.params.clientId))
    throw new ApiError(400, "Invalid client id");
  const client = await ClientModel.findById(req.params.clientId).lean();
  if (!client) throw new ApiError(404, "Client not found");
  return res.json(apiSuccess(client));
}

export async function getClientHub(req, res) {
  if (!mongoose.isValidObjectId(req.params.clientId))
    throw new ApiError(400, "Invalid client id");
  const client = await ClientModel.findById(req.params.clientId).lean();
  if (!client) throw new ApiError(404, "Client not found");

  const cid = client._id;
  const tasks = await TaskModel.find({ linkedClientId: cid })
    .sort({ updatedAt: -1 })
    .populate("assignees", "name email")
    .populate("createdBy", "name email")
    .lean();

  const workByProject = {};
  for (const t of tasks) {
    const key = (t.linkedProject || "").trim() || "General";
    if (!workByProject[key]) workByProject[key] = { active: [], done: [] };
    if (taskIsDone(t)) workByProject[key].done.push(t);
    else workByProject[key].active.push(t);
  }

  const portfolio = Array.isArray(client.projects) ? client.projects : [];
  const nameSet = new Set([
    ...portfolio.map((p) => p.name),
    ...Object.keys(workByProject)
  ]);

  const projects = [...nameSet]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      portfolio: portfolio.find((p) => p.name === name) ?? null,
      activeWork: workByProject[name]?.active ?? [],
      completedWork: workByProject[name]?.done ?? []
    }));

  return res.json(
    apiSuccess({
      client,
      summary: {
        totalTasks: tasks.length,
        activeTasks: tasks.filter((t) => !taskIsDone(t)).length,
        completedTasks: tasks.filter(taskIsDone).length
      },
      projects
    })
  );
}

export async function updateClient(req, res) {
  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid client payload", parsed.error.flatten());

  if (!mongoose.isValidObjectId(req.params.clientId))
    throw new ApiError(400, "Invalid client id");
  const client = await ClientModel.findById(req.params.clientId);
  if (!client) throw new ApiError(404, "Client not found");

  const before = client.toObject();
  const d = parsed.data;
  if (d.company !== undefined) client.company = d.company;
  if (d.contactPerson !== undefined) client.contactPerson = d.contactPerson;
  if (d.email !== undefined) client.email = d.email ?? "";
  if (d.phone !== undefined) client.phone = d.phone ?? "";
  if (d.dealValue !== undefined) client.dealValue = d.dealValue ?? 0;
  if (d.paymentStatus !== undefined) client.paymentStatus = d.paymentStatus;
  if (d.projectSummary !== undefined) client.projectSummary = d.projectSummary ?? "";
  if (d.supportStatus !== undefined) client.supportStatus = d.supportStatus;
  await client.save();

  await logActivity({
    actorUserId: req.user.id,
    action: "sales.client.update",
    entityType: "Client",
    entityId: client._id.toString(),
    before,
    after: client.toObject()
  });

  return res.json(apiSuccess(client, "Client updated"));
}

export async function addClientProject(req, res) {
  const parsed = addClientProjectSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid project payload", parsed.error.flatten());

  if (!mongoose.isValidObjectId(req.params.clientId))
    throw new ApiError(400, "Invalid client id");
  const client = await ClientModel.findById(req.params.clientId);
  if (!client) throw new ApiError(404, "Client not found");

  const before = client.toObject();
  client.projects.push({
    name: parsed.data.name,
    status: parsed.data.status ?? "Active",
    description: parsed.data.description ?? ""
  });
  await client.save();

  await logActivity({
    actorUserId: req.user.id,
    action: "sales.client.project.add",
    entityType: "Client",
    entityId: client._id.toString(),
    before,
    after: client.toObject(),
    metadata: { projectName: parsed.data.name }
  });

  return res.status(201).json(apiSuccess(client, "Project added"));
}

export async function getSalesAnalytics(_req, res) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const activeStageList = [...ACTIVE_STAGES];

  const matchNotDeleted = { $match: { deletedAt: null } };

  const [funnel, wonLost, forecast, leaderboard, monthlyLeads] = await Promise.all([
    LeadModel.aggregate([
      matchNotDeleted,
      { $group: { _id: "$stage", count: { $sum: 1 } } }
    ]),
    LeadModel.aggregate([
      matchNotDeleted,
      { $match: { stage: { $in: ["Won", "Lost"] } } },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          pipelineValue: { $sum: "$estimatedDealValue" }
        }
      }
    ]),
    LeadModel.aggregate([
      matchNotDeleted,
      {
        $match: { stage: { $in: activeStageList } }
      },
      { $group: { _id: null, projectedRevenue: { $sum: "$estimatedDealValue" }, openCount: { $sum: 1 } } }
    ]),
    LeadModel.aggregate([
      matchNotDeleted,
      {
        $match: {
          assignedSalesRepId: { $ne: null },
          stage: "Won"
        }
      },
      {
        $group: {
          _id: "$assignedSalesRepId",
          wins: { $sum: 1 },
          revenue: { $sum: "$estimatedDealValue" }
        }
      },
      { $sort: { wins: -1 } },
      { $limit: 10 }
    ]),
    LeadModel.aggregate([
      matchNotDeleted,
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])
  ]);

  const funnelMap = {};
  for (const stage of PIPELINE_STAGES) funnelMap[stage] = 0;
  for (const row of funnel) if (row._id != null) funnelMap[String(row._id)] = row.count;

  const normalizedFunnel = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: funnelMap[stage] ?? 0
  }));

  let wonCount = 0;
  let lostCount = 0;
  for (const row of wonLost) {
    if (row._id === "Won") wonCount = row.count;
    if (row._id === "Lost") lostCount = row.count;
  }
  const denominator = wonCount + lostCount;
  const conversionRate =
    denominator === 0 ? 0 : Math.round((wonCount / denominator) * 1000) / 10;

  const lostReasonAgg = await LeadModel.aggregate([
    matchNotDeleted,
    { $match: { stage: "Lost", lostReason: { $nin: ["", null] } } },
    {
      $group: {
        _id: "$lostReason",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const repIds = leaderboard.map((entry) => entry._id).filter(Boolean);
  const users = repIds.length > 0 ? await UserModel.find({ _id: { $in: repIds } }).select("name email") : [];
  const repNameById = Object.fromEntries(users.map((u) => [String(u._id), u.name]));

  const salesLeaderboard = leaderboard.map((row) => ({
    userId: row._id,
    name: repNameById[String(row._id)] ?? "Rep",
    wins: row.wins,
    revenue: row.revenue
  }));

  return res.json(
    apiSuccess({
      funnel: normalizedFunnel,
      conversionRate,
      wins: wonCount,
      losses: lostCount,
      lostReasons: lostReasonAgg.map((r) => ({ reason: r._id, count: r.count })),
      revenueForecast: forecast[0]?.projectedRevenue ?? 0,
      openDealCount: forecast[0]?.openCount ?? 0,
      salesLeaderboard,
      monthlyNewLeads: monthlyLeads.map((m) => ({
        period: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
        count: m.count
      }))
    })
  );
}
