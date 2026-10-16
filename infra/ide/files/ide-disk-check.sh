#!/bin/sh
# Hourly: how much disk each Project Mode user uses. Over the limit: their package cache is emptied first
# (it only makes installs faster); the report shows who is still over it.
LIMIT_MB=3072
REPORT=/home/ubuntu/ide_branding/disk-report.txt
echo "Classgrid Code disk use per user ($(date -u '+%Y-%m-%d %H:%M UTC'), limit ${LIMIT_MB} MB)" > "$REPORT"
for D in /home/ubuntu/ide_users/*/; do
  [ -d "$D" ] || continue
  MB=$(du -sm "$D" 2>/dev/null | cut -f1)
  if [ "$MB" -gt "$LIMIT_MB" ] && [ -d "$D.cache" ]; then
    find "$D.cache" -mindepth 1 -delete 2>/dev/null
    MB=$(du -sm "$D" 2>/dev/null | cut -f1)
  fi
  FLAG=""; [ "$MB" -gt "$LIMIT_MB" ] && FLAG="  <-- OVER LIMIT"
  echo "$(basename "$D") ${MB} MB$FLAG" >> "$REPORT"
done
