-- =====================================================================
-- CNTT AWARD REVIEW SYSTEM
-- DATABASE RESET - VERSION 1.0.0
--
-- CANH BAO:
--   1. File nay XOA VINH VIEN toan bo du lieu nghiep vu.
--   2. File nay XOA toan bo tai khoan trong Authentication.
--   3. File nay KHONG xoa anh da luu trong Google Drive.
--   4. Chi chay khi ban chac chan muon khoi tao lai he thong tu dau.
--
-- Cach dung:
--   Supabase Dashboard -> SQL Editor -> New query
--   Dan toan bo file nay -> Run
-- =====================================================================

begin;

-- Trigger nay nam tren bang auth.users, can go bo truoc khi xoa schema public.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_student_registry_confirmed on auth.users;

-- Xoa toan bo bang, enum, ham, trigger, policy va du lieu cua ung dung.
drop schema if exists public cascade;

-- Tao lai schema public voi cac quyen mac dinh can thiet cho Supabase.
create schema public authorization postgres;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, service_role;

alter default privileges for role postgres in schema public
  grant all on sequences to postgres, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to postgres, service_role;

-- Xoa toan bo user dang nhap. Cac bang auth lien quan se duoc cascade.
delete from auth.users;

commit;

-- Sau khi file nay thanh cong, chay tiep:
-- supabase/database/01_SETUP_DATABASE.sql
