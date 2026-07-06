import { z } from "zod";

export const PIPELINE_STAGES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost"
];

/** Ordered stages before win/loss — leads advance one step at a time. */
export const STAGE_FLOW = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation"
];

export const CONVERT_ALLOWED_STAGES = new Set(["Proposal Sent", "Negotiation"]);

export function getNextPipelineStage(current) {
  const idx = STAGE_FLOW.indexOf(current);
  if (idx === -1 || idx >= STAGE_FLOW.length - 1) return null;
  return STAGE_FLOW[idx + 1];
}

/** Returns true when moving from `current` to `next` is allowed. */
export function isAllowedStageTransition(current, next) {
  if (current === next) return true;
  if (current === "Won" || current === "Lost") return false;
  if (next === "Lost") return STAGE_FLOW.includes(current);
  if (next === "Won") return false;
  return getNextPipelineStage(current) === next;
}

const pipelineStageEnum = z.enum([
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost"
]);

export const createLeadSchema = z.object({
  company: z.string().min(2),
  contactPerson: z.string().min(2),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  industry: z.string().optional(),
  estimatedDealValue: z.number().nonnegative().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
  assignedSalesRepId: z.string().optional()
});

export const updateLeadSchema = createLeadSchema.partial();

export const updateLeadStageSchema = z
  .object({
    stage: pipelineStageEnum,
    lostReason: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.stage === "Lost") {
      if (!data.lostReason || data.lostReason.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lostReason required (min 2 chars) when stage is Lost"
        });
      }
    }
  });

export const updateClientSchema = z.object({
  company: z.string().min(2).optional(),
  contactPerson: z.string().min(2).optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  dealValue: z.number().nonnegative().optional(),
  paymentStatus: z.enum(["Paid", "Pending"]).optional(),
  projectSummary: z.string().optional(),
  supportStatus: z.enum(["Healthy", "At Risk"]).optional()
});

export const addClientProjectSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["Planning", "Active", "On Hold", "Completed"]).optional(),
  description: z.string().optional(),
  scope: z.string().optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  managerEmployeeId: z
    .string()
    .refine((id) => !id || mongoose.isValidObjectId(id), "Invalid managerEmployeeId")
    .optional()
    .nullable()
});

export const convertLeadBodySchema = z.object({
  force: z.boolean().optional()
});

export const updateClientProjectSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["Planning", "Active", "On Hold", "Completed"]).optional(),
  description: z.string().optional(),
  scope: z.string().optional(),
  startDate: z.string().nullable().optional(),
  targetEndDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  managerEmployeeId: z
    .string()
    .refine((id) => !id || mongoose.isValidObjectId(id), "Invalid managerEmployeeId")
    .optional()
    .nullable()
});

export const addProjectUpdateSchema = z.object({
  note: z.string().min(1),
  reportDate: z.string().optional()
});

export const updateProjectUpdateSchema = z.object({
  note: z.string().min(1).optional(),
  reportDate: z.string().optional()
});

export const addClientCostSchema = z.object({
  title: z.string().min(1),
  category: z
    .enum(["Labor", "Materials", "Software", "Hosting", "Travel", "Other"])
    .optional(),
  amount: z.number().positive(),
  date: z.string().optional(),
  linkedProject: z.string().optional(),
  billable: z.boolean().optional(),
  notes: z.string().optional(),
  visibleToClient: z.boolean().optional()
});
