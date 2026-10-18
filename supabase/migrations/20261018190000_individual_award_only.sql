-- 2026-10-18: Chỉ xét khen thưởng CÁ NHÂN Đoàn – Hội Khoa CNTT.
-- ADDITIVE, không đổi ENUM hoặc xóa hồ sơ/tài khoản tập thể lịch sử.
-- Áp dụng sau migration 20261009120000. Kiểm thử trên staging, sao lưu trước khi chạy production.
BEGIN;

CREATE OR REPLACE FUNCTION public.reject_new_collective_award_application()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.application_type IS DISTINCT FROM 'individual' THEN
    RAISE EXCEPTION 'INDIVIDUAL_AWARD_ONLY'
      USING ERRCODE = '23514', HINT = 'Hệ thống chỉ nhận hồ sơ khen thưởng cá nhân Đoàn – Hội.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reject_new_collective_award_application ON public.applications;
CREATE TRIGGER reject_new_collective_award_application
BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.reject_new_collective_award_application();

-- Không cấp thêm tài khoản nộp hồ sơ cho Chi đoàn/CLB.
-- Tài khoản lịch sử vẫn tồn tại để lưu dấu vết; không xóa auth.users/profiles.
CREATE OR REPLACE FUNCTION public.reject_new_collective_submitter()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role = 'submitter' AND NEW.submission_scope IS DISTINCT FROM 'individual' THEN
    RAISE EXCEPTION 'INDIVIDUAL_SUBMITTER_ONLY'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reject_new_collective_submitter ON public.profiles;
CREATE TRIGGER reject_new_collective_submitter
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.reject_new_collective_submitter();

-- Đợt mới chỉ tiếp nhận cá nhân. Các đợt lịch sử được giữ nguyên.
CREATE OR REPLACE FUNCTION public.reject_new_collective_period()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.allow_branch_collective OR NEW.allow_club_collective THEN
    RAISE EXCEPTION 'INDIVIDUAL_PERIOD_ONLY' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reject_new_collective_period ON public.evaluation_periods;
CREATE TRIGGER reject_new_collective_period
BEFORE INSERT ON public.evaluation_periods
FOR EACH ROW EXECUTE FUNCTION public.reject_new_collective_period();
COMMIT;
