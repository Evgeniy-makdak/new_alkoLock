set -euo pipefail

rm -rf build
docker run --rm -v \
    .:/mnt  \
    -u $(id -u "${USER}"):$(id -g "${USER}")  \
    ls-node:latest