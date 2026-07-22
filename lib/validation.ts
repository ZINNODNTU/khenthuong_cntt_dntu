import { z } from "zod";
const branchCodeSchema = z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "Mã chi đoàn chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.");
const activitySchema = z.object({
    clientKey: z.string().min(1),
    level: z.enum(["faculty", "university"]),
    name: z.string().max(300),
    organizer: z.string().max(300).optional().default(""),
    activityDate: z.string().optional().default(""),
    role: z.string().max(150).optional().default(""),
    result: z.string().max(500).optional().default(""),
    contribution: z.string().max(3000).optional().default(""),
});
const awardSchema = z.object({
    clientKey: z.string().min(1),
    awardType: z.enum(["certificate", "commendation"]),
    title: z.string().max(500),
    decisionNumber: z.string().max(150),
    issuedDate: z.string().optional().default(""),
    issuer: z.string().max(300),
});
export const applicationSchema = z
    .object({
    status: z.enum(["draft", "submitted"]),
    evaluationPeriodId: z.string().uuid("Đợt xét không hợp lệ."),
    applicationType: z.enum(["individual", "collective"]),
    collectiveType: z
        .enum(["branch", "club"])
        .nullable()
        .optional()
        .default(null),
    branchCode: z.string().optional().default(""),
    clubId: z.string().uuid().nullable().optional().default(null),
    subjectName: z.string().min(2).max(200),
    birthDate: z.string().optional().default(""),
    position: z.string().max(200).optional().default(""),
    phone: z.string().max(30).optional().default(""),
    achievements: z.string().max(15000),
    roleContribution: z.string().max(5000).optional().default(""),
    targetsResult: z.string().max(5000).optional().default(""),
    initiatives: z.string().max(5000).optional().default(""),
    impact: z.string().max(5000).optional().default(""),
    summary: z.string().max(8000).optional().default(""),
    activities: z.array(activitySchema).max(100),
    priorAwards: z.array(awardSchema).max(100),
})
    .superRefine((value, ctx) => {
    if (value.applicationType === "individual") {
        if (!value.branchCode) {
            ctx.addIssue({
                code: "custom",
                path: ["branchCode"],
                message: "Hồ sơ cá nhân phải thuộc một chi đoàn.",
            });
        }
        if (value.collectiveType || value.clubId) {
            ctx.addIssue({
                code: "custom",
                path: ["applicationType"],
                message: "Thông tin loại hồ sơ không hợp lệ.",
            });
        }
    }
    if (value.applicationType === "collective" &&
        value.collectiveType === "branch" &&
        !value.branchCode) {
        ctx.addIssue({
            code: "custom",
            path: ["branchCode"],
            message: "Hồ sơ tập thể chi đoàn phải có mã chi đoàn.",
        });
    }
    if (value.applicationType === "collective" &&
        value.collectiveType === "club" &&
        !value.clubId) {
        ctx.addIssue({
            code: "custom",
            path: ["clubId"],
            message: "Hồ sơ tập thể CLB phải có CLB.",
        });
    }
    if (value.applicationType === "collective" &&
        !value.collectiveType) {
        ctx.addIssue({
            code: "custom",
            path: ["collectiveType"],
            message: "Hãy chọn tập thể Chi đoàn hoặc CLB.",
        });
    }
    if (value.status === "submitted" &&
        value.achievements.trim().length < 20) {
        ctx.addIssue({
            code: "custom",
            path: ["achievements"],
            message: "Báo cáo thành tích phải có ít nhất 20 ký tự.",
        });
    }
});
export const decisionSchema = z
    .object({
    status: z.enum(["passed", "failed", "revision"]),
    comment: z.string().max(5000).default(""),
})
    .superRefine((value, ctx) => {
    if (value.status !== "passed" &&
        value.comment.trim().length < 5) {
        ctx.addIssue({
            code: "custom",
            path: ["comment"],
            message: "Cần ghi rõ nhận xét hoặc lý do.",
        });
    }
});
export const createSystemUserSchema = z
    .object({
    email: z.string().email(),
    fullName: z.string().trim().min(2).max(200),
    password: z
        .string()
        .min(10)
        .max(128)
        .regex(/[A-Za-z]/, "Mật khẩu cần có chữ.")
        .regex(/\d/, "Mật khẩu cần có số."),
    role: z.enum(["admin", "reviewer", "submitter"]),
    submissionScope: z
        .enum(["individual", "branch", "club"])
        .default("individual"),
    branchCode: z.string().optional().default(""),
    clubId: z.string().uuid().nullable().optional().default(null),
})
    .superRefine((value, ctx) => {
    if (value.role === "submitter" &&
        value.submissionScope !== "individual") {
        ctx.addIssue({
            code: "custom",
            path: ["submissionScope"],
            message: "Tài khoản Chi đoàn và CLB được cấp tại trang quản lý đơn vị.",
        });
    }
    if (value.role === "submitter" &&
        value.submissionScope === "individual" &&
        !value.branchCode) {
        ctx.addIssue({
            code: "custom",
            path: ["branchCode"],
            message: "Tài khoản cá nhân phải được gán Chi đoàn.",
        });
    }
});
export const manageSystemUserSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("reset_password"),
        userId: z.string().uuid(),
        password: z
            .string()
            .min(10)
            .max(128)
            .regex(/[A-Za-z]/)
            .regex(/\d/),
    }),
    z.object({
        action: z.literal("set_active"),
        userId: z.string().uuid(),
        isActive: z.boolean(),
    }),
    z.object({
        action: z.literal("update_profile"),
        userId: z.string().uuid(),
        fullName: z.string().trim().min(2).max(200),
        role: z.enum(["admin", "reviewer", "submitter"]),
        submissionScope: z
            .enum(["individual", "branch", "club"])
            .default("individual"),
        branchCode: z.string().optional().default(""),
        clubId: z.string().uuid().nullable().optional().default(null),
    }),
]);
export const createBranchSchema = z.object({
    code: branchCodeSchema,
    name: z.string().trim().min(2).max(100).optional(),
});
export const updateBranchSchema = z.object({
    code: branchCodeSchema,
    name: z.string().trim().min(2).max(100).optional(),
    isActive: z.boolean(),
});
export const provisionBranchAccountSchema = z.object({
    code: branchCodeSchema.optional(),
    allMissing: z.boolean().optional().default(false),
});
export const createClubSchema = z.object({
    code: z
        .string()
        .trim()
        .min(2)
        .max(30)
        .regex(/^[A-Z0-9_-]+$/),
    name: z.string().trim().min(2).max(200),
});
export const updateClubSchema = createClubSchema.extend({
    id: z.string().uuid(),
    isActive: z.boolean(),
});
export const provisionClubAccountSchema = z.object({
    id: z.string().uuid().optional(),
    allMissing: z.boolean().optional().default(false),
});
const periodSchemaBase = z.object({
    name: z.string().trim().min(3).max(200),
    description: z.string().trim().max(1000).optional().default(""),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    status: z.enum(["draft", "open", "closed"]),
    allowIndividual: z.boolean().default(true),
    allowBranchCollective: z.boolean().default(true),
    allowClubCollective: z.boolean().default(true),
});
const validPeriodTime = (value: {
    startsAt: string;
    endsAt: string;
}) => new Date(value.endsAt) > new Date(value.startsAt);
export const createPeriodSchema = periodSchemaBase.refine(validPeriodTime, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endsAt"],
});
export const updatePeriodSchema = periodSchemaBase
    .extend({ id: z.string().uuid() })
    .refine(validPeriodTime, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endsAt"],
});

