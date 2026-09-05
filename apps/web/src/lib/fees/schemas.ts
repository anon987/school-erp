import { z } from "zod";
import { paiseSchema } from "@/lib/core/validation";

export const feeHeadInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  isRecurring: z.boolean(),
});

export const feeStructureInputSchema = z.object({
  classId: z.string().uuid("Choose a class"),
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Name is required"),
});

export const feeStructureItemInputSchema = z
  .object({
    feeHeadId: z.string().uuid("Choose a fee head"),
    amountPaise: paiseSchema,
    oneTimeInstallmentNumber: z.number().int().min(1).max(12).optional(),
  })
  .refine((v) => v.amountPaise > 0, { message: "Amount must be greater than zero", path: ["amountPaise"] });

export const concessionRuleInputSchema = z
  .object({
    categoryId: z.string().uuid("Choose a category"),
    feeHeadId: z.string().uuid().optional(),
    type: z.enum(["percentage", "fixed"]),
    percentageValue: z.number().min(0).max(100).optional(),
    fixedValuePaise: paiseSchema.optional(),
    label: z.string().trim().min(1, "Label is required"),
  })
  .refine((v) => (v.type === "percentage" ? v.percentageValue !== undefined : v.fixedValuePaise !== undefined), {
    message: "Enter a value matching the chosen type",
    path: ["percentageValue"],
  });

export const recordPaymentInputSchema = z.object({
  invoiceId: z.string().uuid(),
  amountPaise: paiseSchema.refine((v) => v > 0, "Amount must be greater than zero"),
  method: z.enum(["cash", "cheque", "upi"]),
  referenceNumber: z.string().trim().max(100).optional(),
});

export const addFineInputSchema = z.object({
  invoiceId: z.string().uuid(),
  amountPaise: paiseSchema.refine((v) => v > 0, "Amount must be greater than zero"),
  reason: z.string().trim().min(1, "Reason is required"),
});

export const addAdjustmentInputSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  type: z.enum(["refund", "correction", "concession_adjustment", "fine_waiver"]),
  amountPaise: paiseSchema.refine((v) => v > 0, "Amount must be greater than zero"),
  reason: z.string().trim().min(1, "Reason is required"),
});
