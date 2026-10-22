#!/bin/sh
set -e

if [ -z "$1" ]; then
  echo "Cách sử dụng: ./scripts/restore.sh <duong_dan_file_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Lỗi: Không tìm thấy file $BACKUP_FILE"
  exit 1
fi

echo "--- Đang khôi phục cơ sở dữ liệu NKDD từ $BACKUP_FILE ---"
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U nkdd -d nkdd
echo "✅ Khôi phục cơ sở dữ liệu hoàn tất!"
