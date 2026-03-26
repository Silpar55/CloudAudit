#!/usr/bin/env bash
# Deprecated name — forwards to the two-role (prod + dev) script.
echo "[cloudaudit] Using create-cloudaudit-platform-roles.sh (prod + dev roles)..." >&2
exec "$(dirname "$0")/create-cloudaudit-platform-roles.sh"
