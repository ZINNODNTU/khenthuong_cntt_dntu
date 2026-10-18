import { ClubManager } from "@/components/club-manager";
import { requireRole } from "@/lib/auth";
import { getClubs } from "@/lib/clubs";
import { PageHeader } from "@/components/ui/page-header";

export default async function ClubsPage() {
  const { supabase } = await requireRole(["admin"]);
  const clubs = await getClubs(supabase, { includeInactive: true });
  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC THAM CHIẾU"
        title="Quản lý câu lạc bộ"
        description="Dùng để đối chiếu vai trò cá nhân tại C5, không cấp tài khoản hoặc tiếp nhận hồ sơ khen thưởng tập thể."
      />
      <ClubManager clubs={clubs} />
    </>
  );
}
