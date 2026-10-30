#!/bin/bash
# Only systemd owns Node. Health never controls the lifetime of this WSL anchor.
export HOME=/home/kirwan
export PATH=/usr/bin:/bin
export PUPPETEER_CACHE_DIR=/home/kirwan/.cache/puppeteer
exec /usr/bin/python3 /usr/local/libexec/lasa/wsl-anchor.py
