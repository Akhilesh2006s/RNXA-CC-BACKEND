import mongoose from "mongoose";
import { z } from "zod";
import { EmployeeModel } from "../models/Employee.js";
import { apiSuccess } from "../utils/apiResponse.js";
import { paginateQuery } from "../utils/pagination.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "../services/activity-log.service.js";

const emergencySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relation: z.string().min(1)
});

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  department: z.string().min(1),
  role: z.string().min(1),
  joiningDate: z.string(),
  userId: z.string().optional(),
  attendanceRate: z.number().min(0).max(100).optional(),
  leaveBalance: z.number().nonnegative().optional(),
  payrollStatus: z.enum(["Pending", "Processed"]).optional(),
  emergencyContact: emergencySchema
});

const updateSchema = createSchema.partial();

export async function listEmployees(req, res) {
  const filter = {};
  if (req.query.department) filter.department = String(req.query.department);
  if (req.query.payrollStatus) filter.payrollStatus = String(req.query.payrollStatus);
  const result = await paginateQuery(EmployeeModel, req.query, filter, ["name", "email", "department", "role"]);
  return res.json(apiSuccess(result));
}

export async function getEmployee(req, res) {
  const emp = await EmployeeModel.findById(req.params.id);
  if (!emp) throw new ApiError(404, "Employee not found");
  return res.json(apiSuccess(emp));
}

export async function createEmployee(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid payload", parsed.error.flatten());

  const existing = await EmployeeModel.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) throw new ApiError(409, "Email already in use");

  const emp = await EmployeeModel.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    department: parsed.data.department,
    role: parsed.data.role,
    joiningDate: new Date(parsed.data.joiningDate),
    attendanceRate: parsed.data.attendanceRate ?? 0,
    leaveBalance: parsed.data.leaveBalance ?? 0,
    payrollStatus: parsed.data.payrollStatus ?? "Pending",
    emergencyContact: parsed.data.emergencyContact,
    userId:
      parsed.data.userId && mongoose.isValidObjectId(parsed.data.userId)
        ? new mongoose.Types.ObjectId(parsed.data.userId)
        : null
  });

  await logActivity({
    actorUserId: req.user.id,
    action: "employee.create",
    entityType: "Employee",
    entityId: emp._id.toString(),
    after: emp.toObject()
  });

  return res.status(201).json(apiSuccess(emp));
}

export async function updateEmployee(req, res) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Invalid payload", parsed.error.flatten());

  const emp = await EmployeeModel.findById(req.params.id);
  if (!emp) throw new ApiError(404, "Employee not found");
  const before = emp.toObject();

  const d = parsed.data;
  if (d.name !== undefined) emp.name = d.name;
  if (d.email !== undefined) emp.email = d.email.toLowerCase();
  if (d.department !== undefined) emp.department = d.department;
  if (d.role !== undefined) emp.role = d.role;
  if (d.joiningDate !== undefined) emp.joiningDate = new Date(d.joiningDate);
  if (d.attendanceRate !== undefined) emp.attendanceRate = d.attendanceRate;
  if (d.leaveBalance !== undefined) emp.leaveBalance = d.leaveBalance;
  if (d.payrollStatus !== undefined) emp.payrollStatus = d.payrollStatus;
  if (d.emergencyContact !== undefined) emp.emergencyContact = d.emergencyContact;
  if (d.userId !== undefined)
    emp.userId =
      d.userId && mongoose.isValidObjectId(d.userId) ? new mongoose.Types.ObjectId(d.userId) : null;

  await emp.save();

  await logActivity({
    actorUserId: req.user.id,
    action: "employee.update",
    entityType: "Employee",
    entityId: emp._id.toString(),
    before,
    after: emp.toObject()
  });

  return res.json(apiSuccess(emp));
}

export async function deleteEmployee(req, res) {
  const emp = await EmployeeModel.findById(req.params.id);
  if (!emp) throw new ApiError(404, "Employee not found");
  const before = emp.toObject();
  await emp.deleteOne();
  await logActivity({
    actorUserId: req.user.id,
    action: "employee.delete",
    entityType: "Employee",
    entityId: req.params.id,
    before
  });
  return res.json(apiSuccess(null, "Employee deleted"));
}
