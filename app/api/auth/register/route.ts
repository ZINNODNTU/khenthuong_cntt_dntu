import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicStudentRegistrationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const DUPLICATE_MESSAGE =
  "MSSV này đã có tài khoản. Vui lòng đăng nhập hoặc liên hệ quản trị viên nếu bạn quên mật khẩu.";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normalizedAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("duplicate")
  ) {
    return {
      status: 409,
      message: DUPLICATE_MESSAGE,
      keepReservation: true,
    };
  }

  if (
    normalized.includes("email rate limit") ||
    normalized.includes("rate limit")
  ) {
    return {
      status: 429,
      message:
        "Hệ thống đang tạm giới hạn gửi email xác nhận. Vui lòng thử lại sau.",
      keepReservation: false,
    };
  }

  return {
    status: 400,
    message: message || "Không thể tạo tài khoản.",
    keepReservation: false,
  };
}

export async function POST(request: Request) {
  if (!env.publicSignupEnabled()) {
    return json({ error: "Đăng ký tài khoản hiện đang tạm đóng." }, 403);
  }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Dữ liệu đăng ký không hợp lệ." }, 400);
  }

  const parsed = publicStudentRegistrationSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Dữ liệu đăng ký không hợp lệ.",
      },
      400,
    );
  }

  const payload = parsed.data;
  const studentId = payload.studentId.trim();
  const email = `${studentId}@dntu.edu.vn`;
  const branchCode = payload.branchCode.trim().toUpperCase();
  const admin = createAdminClient();

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .select("code")
    .eq("code", branchCode)
    .eq("is_active", true)
    .maybeSingle();

  if (branchError) {
    return json(
      { error: "Không thể kiểm tra thông tin Chi đoàn." },
      500,
    );
  }

  if (!branch) {
    return json(
      { error: "Chi đoàn không tồn tại hoặc đã ngừng sử dụng." },
      400,
    );
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return json({ error: DUPLICATE_MESSAGE }, 409);
  }

  // Remove only an abandoned reservation. A real or completed account is
  // never removed here.
  const staleBefore = new Date(
    Date.now() - 15 * 60 * 1000,
  ).toISOString();

  await admin
    .from("student_account_registry")
    .delete()
    .eq("student_id", studentId)
    .eq("status", "pending")
    .is("auth_user_id", null)
    .lt("created_at", staleBefore);

  const { error: reserveError } = await admin
    .from("student_account_registry")
    .insert({
      student_id: studentId,
      email,
      status: "pending",
    });

  if (reserveError) {
    if (reserveError.code === "23505") {
      return json({ error: DUPLICATE_MESSAGE }, 409);
    }

    return json(
      { error: "Không thể khóa MSSV để đăng ký tài khoản." },
      500,
    );
  }

  const publicAuth = createSupabaseClient(
    env.supabaseUrl(),
    env.supabasePublishableKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const confirmationUrl = new URL(
    "/auth/confirm?next=/",
    env.appUrl(),
  ).toString();

  const { data, error } = await publicAuth.auth.signUp({
    email,
    password: payload.password,
    options: {
      emailRedirectTo: confirmationUrl,
      data: {
        full_name: payload.fullName.trim(),
        branch_code: branchCode,
        account_type: "student",
        student_id: studentId,
      },
    },
  });

  const isObfuscatedExistingUser =
    Boolean(data.user) &&
    Array.isArray(data.user?.identities) &&
    data.user.identities.length === 0;

  if (error || isObfuscatedExistingUser || !data.user) {
    const mapped = normalizedAuthError(
      isObfuscatedExistingUser
        ? "User already registered"
        : error?.message || "Không thể tạo tài khoản.",
    );

    if (mapped.keepReservation) {
      await admin
        .from("student_account_registry")
        .update({
          status: "existing",
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", studentId);
    } else {
      await admin
        .from("student_account_registry")
        .delete()
        .eq("student_id", studentId)
        .eq("status", "pending")
        .is("auth_user_id", null);
    }

    return json({ error: mapped.message }, mapped.status);
  }

  await admin
    .from("student_account_registry")
    .update({
      auth_user_id: data.user.id,
      status: data.user.email_confirmed_at
        ? "confirmed"
        : "created",
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId)
    .or(`auth_user_id.is.null,auth_user_id.eq.${data.user.id}`);

  return json(
    {
      ok: true,
      requiresConfirmation: !data.user.email_confirmed_at,
      email,
    },
    201,
  );
}
