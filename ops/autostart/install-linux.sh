#!/bin/bash
# Preparado, no ejecutado. Instala archivos pero NO habilita/inicia el servicio.
set -euo pipefail
if [[ ${1:-} != --install || $# != 1 ]]; then
    echo 'Plan: copiar unidad y supervisión a /etc/systemd/system y /usr/local/libexec/lasa; daemon-reload. Sin enable/start.'
    echo 'Solo después de autorización: sudo bash ops/autostart/install-linux.sh --install'
    exit 0
fi
[[ $EUID == 0 ]] || { echo 'Requiere root.' >&2; exit 1; }
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
[[ ! -e /etc/systemd/system/lasa.service && ! -e /usr/local/libexec/lasa ]] || { echo 'Instalación existente: revisar antes de sobrescribir.' >&2; exit 1; }
/usr/bin/systemd-analyze verify "$source_dir/lasa.service"
/usr/bin/install -d -m 0755 -o root -g root /usr/local/libexec/lasa
/usr/bin/install -m 0755 -o root -g root "$source_dir/lasa-check.py" "$source_dir/wsl-keepalive.sh" "$source_dir/wsl-anchor.py" /usr/local/libexec/lasa/
/usr/bin/install -m 0644 -o root -g root "$source_dir/lasa.service" /etc/systemd/system/lasa.service
/usr/bin/systemctl daemon-reload
echo 'Archivos instalados. Servicio NO habilitado ni iniciado. Proceso actual intacto.'
