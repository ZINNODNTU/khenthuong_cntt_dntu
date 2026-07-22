import { createClient, type User } from "npm:@supabase/supabase-js@2.110.7";
type RequestBody = {
    email?: string;
    password?: string;
    fullName?: string;
};
const JSON_HEADERS = {
    "content-type": "application/json; charset=utf-8",
};
function json(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: JSON_HEADERS,
    });
}
function validPassword(password: string) {
    return password.length >= 10
        && /[A-Za-z]/.test(password)
        && /\d/.test(password);
}
async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<User | null> {
    for (let page = 1; page <= 10; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({
            page,
            perPage: 1000,
        });
        if (error)
            throw error;
        const user = data.users.find((item) => item.email?.toLowerCase() === email);
        if (user)
            return user;
        if (data.users.length < 1000)
            break;
    }
    return null;
}
Deno.serve(async (request) => {
    if (request.method !== "POST") {
        return json(405, { error: "Chi ho tro POST." });
    }
    const configuredSecret = Deno.env.get("ADMIN_BOOTSTRAP_SECRET") ?? "";
    const providedSecret = request.headers.get("x-bootstrap-secret") ?? "";
    if (configuredSecret.length < 32
        || providedSecret !== configuredSecret) {
        return json(401, { error: "Bootstrap secret khong hop le." });
    }
    let payload: RequestBody;
    try {
        payload = await request.json();
    }
    catch {
        return json(400, { error: "JSON body khong hop le." });
    }
    const email = String(payload.email ?? "").trim().toLowerCase();
    const password = String(payload.password ?? "");
    const fullName = String(payload.fullName ?? "").trim();
    const allowedDomain = (Deno.env.get("ALLOWED_REVIEWER_DOMAIN") ?? "dntu.edu.vn").trim().toLowerCase();
    if (!email.endsWith(`@${allowedDomain}`)) {
        return json(400, {
            error: `Admin phai dung email @${allowedDomain}.`,
        });
    }
    if (fullName.length < 2) {
        return json(400, { error: "Ho ten khong hop le." });
    }
    if (!validPassword(password)) {
        return json(400, {
            error: "Mat khau phai co it nhat 10 ky tu, gom chu va so.",
        });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
        return json(500, { error: "Thieu bien moi truong he thong." });
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
    try {
        const { data: existingAdmin, error: adminLookupError } = await admin
            .from("profiles")
            .select("id,email")
            .eq("role", "admin")
            .eq("is_active", true)
            .maybeSingle();
        if (adminLookupError)
            throw adminLookupError;
        if (existingAdmin
            && existingAdmin.email.toLowerCase() !== email) {
            return json(409, {
                error: "He thong da co admin dang hoat dong.",
            });
        }
        let authUser = await findUserByEmail(admin, email);
        let created = false;
        if (authUser) {
            const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName },
            });
            if (error)
                throw error;
            authUser = data.user;
        }
        else {
            const { data, error } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName },
            });
            if (error)
                throw error;
            authUser = data.user;
            created = true;
        }
        if (!authUser) {
            return json(500, { error: "Khong tao duoc user." });
        }
        const { error: profileError } = await admin
            .from("profiles")
            .upsert({
            id: authUser.id,
            email,
            full_name: fullName,
            role: "admin",
            submission_scope: "individual",
            branch_code: null,
            club_id: null,
            is_active: true,
            updated_at: new Date().toISOString(),
        });
        if (profileError) {
            if (created) {
                await admin.auth.admin.deleteUser(authUser.id);
            }
            throw profileError;
        }
        await admin.from("audit_logs").insert({
            actor_id: null,
            action: created
                ? "system.admin.bootstrap"
                : "system.admin.update_bootstrap",
            entity_type: "profile",
            entity_id: authUser.id,
            metadata: {
                email,
                source: "bootstrap-admin-function",
            },
        });
        return json(200, {
            ok: true,
            created,
            user: {
                id: authUser.id,
                email,
                fullName,
                role: "admin",
            },
        });
    }
    catch (error) {
        console.error(error);
        return json(500, {
            error: error instanceof Error
                ? error.message
                : "Khong the tao admin.",
        });
    }
});

