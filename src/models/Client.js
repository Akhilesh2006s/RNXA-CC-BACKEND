import mongoose from "mongoose";

const communicationLogSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    message: { type: String, required: true }
  },
  { _id: true }
);

const projectUpdateSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    reportDate: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

const clientProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed"],
      default: "Planning"
    },
    description: { type: String, default: "" },
    /** What we're building / delivering for the client */
    scope: { type: String, default: "" },
    startDate: { type: Date, default: null },
    targetEndDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    /** Project manager — synced to Action Management task linking */
    managerEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    managerName: { type: String, default: "" },
    updates: { type: [projectUpdateSchema], default: [] }
  },
  { timestamps: true }
);

const clientCostLogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Labor", "Materials", "Software", "Hosting", "Travel", "Other"],
      default: "Other"
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: () => new Date() },
    linkedProject: { type: String, default: "" },
    billable: { type: Boolean, default: true },
    notes: { type: String, default: "" },
    visibleToClient: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const clientSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    contactPerson: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    dealValue: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Pending"
    },
    contractIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
    paymentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
    projects: [clientProjectSchema],
    costLogs: { type: [clientCostLogSchema], default: [] },
    projectSummary: { type: String, default: "" },
    supportStatus: { type: String, enum: ["Healthy", "At Risk"], default: "Healthy" },
    communicationLogs: [communicationLogSchema]
  },
  { timestamps: true }
);

export const ClientModel = mongoose.model("Client", clientSchema);
