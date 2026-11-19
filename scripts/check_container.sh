#!/usr/bin/env bash
# Says whether the container image builds and starts from an empty data
# directory and from a copy of a used one. Needs Docker, curl and jq.
set -euo pipefail
cd "$(dirname "$0")/.."

image=binsight-check
port=18000
address="http://localhost:$port"
password="container-check-password"
work=$(mktemp -d)

step() { printf '\n== %s\n' "$1"; }
fail() {
  echo "$1"
  exit 1
}

clean_up() {
  docker rm --force "$image-empty" "$image-used" >/dev/null 2>&1 || true
  # Files the container wrote belong to its user, so they are removed from inside one.
  docker run --rm --user 0 --entrypoint rm --volume "$work:/work" "$image" -rf /work/empty /work/used >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap clean_up EXIT

start() {
  docker run --detach --name "$1" --publish "$port:8000" \
    --env "BINSIGHT_APP_ADDRESS=$address" --volume "$2:/data" \
    --read-only --tmpfs /tmp --init "$image" >/dev/null
}

wait_until_healthy() {
  local status
  for _ in $(seq 60); do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$1")
    [ "$status" = healthy ] && return 0
    sleep 1
  done
  docker logs "$1"
  fail "The container did not become healthy; its last status was $status."
}

api() {
  curl --silent --show-error --fail --cookie-jar "$work/cookies" --cookie "$work/cookies" \
    --header 'Content-Type: application/json' "$@"
}

step "Build the image"
docker build --file deploy/Dockerfile --tag "$image" .

step "Refuse to start without the app's address"
if docker run --rm --volume "$work:/data" "$image" >"$work/refusal.log" 2>&1; then
  fail "The container started without BINSIGHT_APP_ADDRESS."
fi
grep --quiet BINSIGHT_APP_ADDRESS "$work/refusal.log" || fail "The refusal did not name the setting."
echo "Refused, naming BINSIGHT_APP_ADDRESS."

step "Start from an empty data directory"
mkdir "$work/empty"
# The container runs as uid 1000, which may not be the user running this script.
chmod 777 "$work/empty"
container=$image-empty
start "$container" "$work/empty"
wait_until_healthy "$container"
[ "$(docker exec "$container" id -u)" != 0 ] || fail "The container runs as root."
curl --silent --fail "$address/" | grep --quiet '<div id="root">' || fail "/ did not return the app."
api --data "{\"username\": \"owner\", \"password\": \"$password\"}" "$address/api/auth/first-admin" >/dev/null
backups=$(api "$address/api/backups" | jq '.backups | length')
[ "$backups" = 1 ] || fail "Expected the first backup on starting, found $backups."
location_id=$(api --data '{"name": "Home", "type": "site"}' "$address/api/locations" | jq -r .id)
api --data "{\"name\": \"HDMI cable\", \"home_location_id\": \"$location_id\"}" "$address/api/items" >/dev/null
docker stop "$container" >/dev/null
echo "Healthy, not root, served the app, took the first backup, and stored a location and an item."

step "Start from a copy of a used data directory"
# Copied as root with -a, as a restore must be, so the files keep uid 1000 as their owner.
docker run --rm --user 0 --entrypoint cp --volume "$work:/work" "$image" -a /work/empty /work/used
rm "$work/cookies"
container=$image-used
start "$container" "$work/used"
wait_until_healthy "$container"
api --data "{\"username\": \"owner\", \"password\": \"$password\"}" "$address/api/auth/sign-in" >/dev/null
names=$(api "$address/api/items?location_id=$location_id" | jq -r '.items[].name')
[ "$names" = "HDMI cable" ] || fail "Expected the item HDMI cable, found: $names"
echo "Healthy, signed in, and found the item."

printf '\nThe container check passed.\n'
