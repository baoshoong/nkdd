#!/bin/sh
set -e

BACKUP_FILE="backup_$(date +%F_%H%M%S).sql.gz"
echo "--- Đang sao lưu cơ sở dữ liệu NKDD ---"
docker compose exec -T db pg_dump -U nkdd nkdd | gzip > "$BACKUP_FILE"
echo "✅ Đã tạo file sao lưu thành công: $BACKUP_FILE"
