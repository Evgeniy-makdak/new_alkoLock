#!/bin/sh
set -e

TMP=$(mktemp -d)
cd /mnt
cp -r \
  src \
  public \
  package.json \
  yarn.lock \
  "$TMP"
cd "$TMP"
yarn install
yarn build
mv "$TMP"/build /mnt
exit 0

