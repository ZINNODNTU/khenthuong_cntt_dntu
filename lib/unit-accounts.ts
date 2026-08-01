import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { unitEmailFromCode } from "@/lib/identity";
import { env } from "@/lib/env";
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
    created: boolean;
    invitationSent: boolean;
};
function accountErrorMessage(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes("weak") || normalized.includes("password") || normalized.includes("leaked")) {
        return "Không thể hoàn tất thiết lập tài khoản đơn vị.";
    }
    return "Không thể hoàn tất thiết lập tài khoản đơn vị.";
}
async function listUsersByEmail(): Promise<Map<string, User>> {
    const admin = createAdminClient();
    const users = new Map<string, User>();
    for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(accountErrorMessage(error.message));
        for (const user of data.users) if (user.email) users.set(user.email.toLowerCase(), user);
        if (data.users.length < 1000) break;
    }
    return users;
}
async function provisionWithKnownUser(input: UnitAccountInput, existingUser: User | null): Promise<ProvisionedUnitAccount> {
    const admin = createAdminClient();
    const email = unitEmailFromCode(input.code);
    let user = existingUser;
    let created = false;
    let invitationSent = false;
    if (existingUser) {
        const { data: existingProfile } = await admin.from("profiles").select("submission_scope,branch_code,club_id,is_active").eq("id", existingUser.id).maybeSingle();
        const isInactivePlaceholder = existingProfile?.is_active === false && existingProfile.submission_scope === "individual" && existingProfile.branch_code === null && existingProfile.club_id === null;
        const belongsToSameUnit = !existingProfile || isInactivePlaceholder || (existingProfile.submission_scope === input.scope && (input.scope === "branch" ? existingProfile.branch_code === input.branchCode : existingProfile.club_id === input.clubId));
        if (!belongsToSameUnit) throw new Error("Tài khoản đơn vị đã được gán cho phạm vi khác.");
        const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, { user_metadata: { full_name: input.fullName, account_type: "unit" } });
        if (error) throw new Error(accountErrorMessage(error.message));
        user = data.user;
    } else {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${env.appUrl()}/auth/callback?next=/change-password`,
            data: { full_name: input.fullName, account_type: "unit", unit_code: input.code },
        });
        if (error || !data.user) throw new Error(accountErrorMessage(error?.message || "invite failed"));
        user = data.user;
        created = true;
        invitationSent = true;
    }
    if (!user) throw new Error("Không thể xác định tài khoản đơn vị.");
    const { error: profileError } = await admin.from("profiles").upsert({
        id: user.id, email, full_name: input.fullName, role: "submitter", submission_scope: input.scope,
        branch_code: input.scope === "branch" ? input.branchCode : null,
        club_id: input.scope === "club" ? input.clubId : null,
        is_active: true, must_change_password: true, updated_at: new Date().toISOString(),
    });
    if (profileError) {
        if (created) await admin.auth.admin.deleteUser(user.id);
        throw new Error("Không thể hoàn tất hồ sơ tài khoản đơn vị.");
    }
    return { userId: user.id, email, created, invitationSent };
}
export async function provisionUnitAccount(input: UnitAccountInput): Promise<ProvisionedUnitAccount> {
    const email = unitEmailFromCode(input.code);
    const users = await listUsersByEmail();
    return provisionWithKnownUser(input, users.get(email) ?? null);
}
export async function provisionUnitAccounts(inputs: UnitAccountInput[]): Promise<ProvisionedUnitAccount[]> {
    if (!inputs.length) return [];
    const users = await listUsersByEmail();
    const results: ProvisionedUnitAccount[] = [];
    for (let index = 0; index < inputs.length; index += 4) {
        const batch = inputs.slice(index, index + 4);
        results.push(...await Promise.all(batch.map((input) => provisionWithKnownUser(input, users.get(unitEmailFromCode(input.code)) ?? null))));
    }
    return results;
}
export async function setUnitAccountActive(input: { scope: Extract<SubmissionScope, "branch" | "club">; branchCode?: string | null; clubId?: string | null; isActive: boolean }): Promise<void> {
    const admin = createAdminClient();
    let query = admin.from("profiles").update({ is_active: input.isActive }).eq("role", "submitter").eq("submission_scope", input.scope);
    query = input.scope === "branch" ? query.eq("branch_code", input.branchCode) : query.eq("club_id", input.clubId);
    const { error } = await query;
    if (error) throw new Error(accountErrorMessage(error.message));
}

