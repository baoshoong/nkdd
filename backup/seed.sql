
-- =====================================================
-- XOÁ DỮ LIỆU TEST — GIỮ LẠI:
--   User, Department, IndicatorGroup, Indicator, IndicatorPermission
-- XOÁ:
--   Report, ReportValue, AuditLog
-- =====================================================

BEGIN;

-- Đếm trước khi xoá (để verify)
SELECT 'Report' AS bang, COUNT(*) AS so_luong FROM "Report"
UNION ALL SELECT 'ReportValue', COUNT(*) FROM "ReportValue"
UNION ALL SELECT 'AuditLog', COUNT(*) FROM "AuditLog";

-- Xoá theo thứ tự con → cha để tránh lỗi foreign key
DELETE FROM "ReportValue";
DELETE FROM "AuditLog";
DELETE FROM "Report";

-- Reset sequence ID về 1 (optional, cho đẹp)
ALTER SEQUENCE IF EXISTS "Report_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "ReportValue_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "AuditLog_id_seq" RESTART WITH 1;

-- Đếm sau khi xoá (phải ra 0 0 0)
SELECT 'Report' AS bang, COUNT(*) AS so_luong FROM "Report"
UNION ALL SELECT 'ReportValue', COUNT(*) FROM "ReportValue"
UNION ALL SELECT 'AuditLog', COUNT(*) FROM "AuditLog";

-- Verify master data còn nguyên
SELECT 'User' AS bang, COUNT(*) AS so_luong FROM "User"
UNION ALL SELECT 'Department', COUNT(*) FROM "Department"
UNION ALL SELECT 'IndicatorGroup', COUNT(*) FROM "IndicatorGroup"
UNION ALL SELECT 'Indicator', COUNT(*) FROM "Indicator"
UNION ALL SELECT 'IndicatorPermission', COUNT(*) FROM "IndicatorPermission";

COMMIT;