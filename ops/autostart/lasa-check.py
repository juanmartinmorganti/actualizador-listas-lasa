#!/usr/bin/python3
"""Solo lectura: valida configuración, instancias y salud. Nunca arranca Node."""
import argparse
import json
import os
from pathlib import Path
import pwd
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path('/home/kirwan/p/actualizador-listas-lasa')
AUTH = Path('/home/kirwan/.config/lasa/actualizador-listas.json')
UID = pwd.getpwnam('kirwan').pw_uid

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def listeners():
    result = set()
    for name in ('tcp', 'tcp6'):
        for line in Path('/proc/net', name).read_text().splitlines()[1:]:
            fields = line.split()
            if fields[3] == '0A' and int(fields[1].split(':')[1], 16) == 4000:
                result.add(fields[9])
    return result

def instances():
    found = []
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        try:
            args = (proc / 'cmdline').read_bytes().split(b'\0')
            if os.readlink(proc / 'exe') != '/usr/bin/node':
                continue
            if os.readlink(proc / 'cwd') != str(ROOT):
                continue
            if not any(x in (b'server.js', str(ROOT / 'server.js').encode()) for x in args[1:]):
                continue
            sockets = set()
            for fd in (proc / 'fd').iterdir():
                try:
                    target = os.readlink(fd)
                    if target.startswith('socket:['):
                        sockets.add(target[8:-1])
                except OSError:
                    pass
            found.append({'pid': int(proc.name), 'uid': proc.stat().st_uid, 'sockets': sockets})
        except (OSError, PermissionError):
            continue
    return found

def configuration():
    for p, mode in ((AUTH.parent, 0o700), (AUTH, 0o600)):
        s = p.stat()
        require(s.st_uid == UID and s.st_mode & 0o777 == mode, 'Propietario o permisos privados incorrectos.')
    config = json.loads(AUTH.read_text())
    require(isinstance(config, dict), 'Configuración privada inválida.')
    require(isinstance(config.get('username'), str) and bool(config['username']), 'Falta usuario administrativo.')
    require(isinstance(config.get('passwordHash'), str) and re.fullmatch(r'[a-fA-F0-9]{32}:[a-fA-F0-9]{128}', config['passwordHash']), 'Formato administrativo inválido.')
    require(isinstance(config.get('secret'), str) and len(config['secret']) >= 32, 'Configuración de sesión inválida.')
    for name in ('productos.json', 'publicadas.json'):
        p = ROOT / 'data' / name
        require(p.stat().st_size <= 2 * 1024 * 1024, 'Datos exceden el límite PDF.')
        require(isinstance(json.loads(p.read_bytes()), list), 'Datos JSON inválidos.')
    require(os.access(ROOT / 'data', os.W_OK), 'Directorio de datos no escribible.')
    # Node y módulos reales, sin importar server.js ni iniciar un listener.
    code = "require('express');const p=require('puppeteer');require('fs').accessSync(p.executablePath());"
    check = subprocess.run(['/usr/bin/node', '-e', code], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
    require(check.returncode == 0, 'Node, dependencias o Chromium no disponibles.')

def get(route, expected):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        response = opener.open('http://127.0.0.1:4000' + route, timeout=5)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        require(response.status == expected, 'HTTP inesperado en ' + route)
        body = response.read(2 * 1024 * 1024 + 1)
        require(len(body) <= 2 * 1024 * 1024, 'Respuesta excesiva.')
        return body

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--preflight', action='store_true')
    group.add_argument('--health', action='store_true')
    parser.add_argument('--expected-pid', type=int)
    args = parser.parse_args()
    configuration()
    running, listening = instances(), listeners()
    if args.preflight:
        require(not running and not listening, 'Puerto 4000 ocupado o instancia LASA existente: no iniciar otra.')
        print('Preflight OK: configuración válida; sin instancia ni listener 4000.')
        return
    require(len(running) == 1, 'Se requiere exactamente una instancia LASA.')
    node = running[0]
    require(node['uid'] == UID, 'Usuario de LASA incorrecto.')
    require(bool(listening) and listening <= node['sockets'], 'Listener 4000 no pertenece exclusivamente a LASA.')
    if args.expected_pid is not None:
        require(node['pid'] == args.expected_pid, 'PID cambió: no detener el proceso indicado.')
    get('/', 200)
    public = json.loads(get('/api/productos', 200))
    require(public == json.loads((ROOT / 'data/publicadas.json').read_bytes()), 'Catálogo no coincide con publicaciones.')
    require(json.loads(get('/api/auth/me', 200)) == {'authenticated': False, 'enabled': True}, 'Autenticación inesperada.')
    get('/api/borrador', 401)
    print('Salud OK; una instancia LASA, PID=' + str(node['pid']) + '; catálogo y autenticación correctos.')

if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Ningún valor de JSON, entorno, hash o secreto se incluye en errores.
        print('Comprobación LASA falló; revisar configuración, instancia, puerto y respuestas HTTP.', file=sys.stderr)
        sys.exit(1)
