-- 0025_add_company_name_to_profiles.sql
-- Adds optional company_name to profiles for white-label PDF reports.

alter table profiles add column if not exists company_name text;
