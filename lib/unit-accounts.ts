import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_UNIT_PASSWORD, unitEmailFromCode, } from "@/lib/identity";
import type { SubmissionScope } from "@/lib/types";
export type UnitAccountInput = {
    code: string;
    fullName: string;
    scope: Extract<SubmissionScope, "branch" | "club">;
    branchCode?: string | null;
    clubId?: string | null;
};
export type ProvisionedUnitAccount = {
    userId: string;
    email: string;
    password: typeof DEFAULT_UNIT_PASSWORD;
    created: boolean;
};
function accountErrorMessage(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes("weak") ||
        normalized.includes("password") ||
        normalized.includes("leaked")) {
        return "Không thể dùng mật khẩu 123456 vì chính sách mật khẩu của dự án đang yêu cầu mức mạnh hơn. Hãy đặt độ dài tối thiểu là 6 để cấp tài khoản đơn vị.";
    }
    return message;
}
async function listUsersByEmail(): Promise<Map<string, User>> {
    const admin = createAdminClient();
    const users = new Map<string, User>();
    for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({
            page,
            perPage: 1000,
        });
        if (error) {
            throw new Error(accountErrorMessage(error.message));
        }
        for (const user of data.users) {
            if (user.email) {
                users.set(user.email.toLowerCase(), user);
            }
        }
        if (data.users.length < 1000) {
            break;
        }
    }
    return users;
}
async function provisionWithKnownUser(input: UnitAccountInput, existingUser: User | null): Promise<ProvisionedUnitAccount> {
    const admin = createAdminClient();
    const email = unitEmailFromCode(input.code);
    let user = existingUser;
    let created = false;
    if (existingUser) {
        const { data: existingProfile } = await admin
            .from("profiles")
            .select("submission_scope,branch_code,club_id,is_active")
            .eq("id", existingUser.id)
            .maybeSingle();
        const isInactivePlaceholder = existingProfile?.is_active === false &&
            existingProfile.submission_scope === "individual" &&
            existingProfile.branch_code === null &&
            existingProfile.club_id === null;
        const belongsToSameUnit = !existingProfile ||
            isInactivePlaceholder ||
            (existingProfile.submission_scope === input.scope &&
                (input.scope === "branch"
                    ? existingProfile.branch_code === input.branchCode
                    : existingProfile.club_id === input.clubId));
        if (!belongsToSameUnit) {
            throw new Error(`Email ${email} đã được sử dụng cho một đơn vị khác.`);
        }
        const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
            password: DEFAULT_UNIT_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: input.fullName,
                account_type: "unit",
            },
        });
        if (error) {
            throw new Error(accountErrorMessage(error.message));
        }
        user = data.user;
    }
    else {
        const { data, error } = await admin.auth.admin.createUser({
            email,
            password: DEFAULT_UNIT_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: input.fullName,
                account_type: "unit",
            },
        });
        if (error || !data.user) {
            throw new Error(error?.message
                ? accountErrorMessage(error.message)
                : "Không thể tạo tài khoản đơn vị.");
        }
        user = data.user;
        created = true;
    }
    if (!user) {
        throw new Error("Không thể xác định tài khoản đơn vị.");
    }
    const { error: profileError } = await admin
        .from("profiles")
        .upsert({
        id: user.id,
        email,
        full_name: input.fullName,
        role: "submitter",
        submission_scope: input.scope,
        branch_code: input.scope === "branch"
            ? input.branchCode
            : null,
        club_id: input.scope === "club" ? input.clubId : null,
        is_active: true,
        must_change_password: true,
        updated_at: new Date().toISOString(),
    });
    if (profileError) {
        if (created) {
            await admin.auth.admin.deleteUser(user.id);
        }
        throw new Error(profileError.message);
    }
    return {
        userId: user.id,
        email,
        password: DEFAULT_UNIT_PASSWORD,
        created,
    };
}
export async function provisionUnitAccount(input: UnitAccountInput): Promise<ProvisionedUnitAccount> {
    const email = unitEmailFromCode(input.code);
    const users = await listUsersByEmail();
    return provisionWithKnownUser(input, users.get(email) ?? null);
}
export async function provisionUnitAccounts(inputs: UnitAccountInput[]): Promise<ProvisionedUnitAccount[]> {
    if (!inputs.length) {
        return [];
    }
    const users = await listUsersByEmail();
    const results: ProvisionedUnitAccount[] = [];
    const batchSize = 4;
    for (let index = 0; index < inputs.length; index += batchSize) {
        const batch = inputs.slice(index, index + batchSize);
        const batchResults = await Promise.all(batch.map((input) => {
            const email = unitEmailFromCode(input.code);
            return provisionWithKnownUser(input, users.get(email) ?? null);
        }));
        results.push(...batchResults);
    }
    return results;
}
export async function setUnitAccountActive(input: {
    scope: Extract<SubmissionScope, "branch" | "club">;
    branchCode?: string | null;
    clubId?: string | null;
    isActive: boolean;
}): Promise<void> {
    const admin = createAdminClient();
    let query = admin
        .from("profiles")
        .update({ is_active: input.isActive })
        .eq("role", "submitter")
        .eq("submission_scope", input.scope);
    query =
        input.scope === "branch"
            ? query.eq("branch_code", input.branchCode)
            : query.eq("club_id", input.clubId);
    const { error } = await query;
    if (error) {
        throw new Error(accountErrorMessage(error.message));
    }
}

