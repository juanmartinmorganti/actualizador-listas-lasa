#!/usr/bin/python3
"""Foreground WSL anchor; never starts or restarts LASA."""
import fcntl
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import signal
import subprocess
import threading
import time
from datetime import datetime, timezone

STATE = Path('/home/kirwan/.local/state/lasa/anchor')
CHECK = ['/usr/bin/python3', '/usr/local/libexec/lasa/lasa-check.py', '--health']


class Records:
    def __init__(self, directory):
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        if directory.is_symlink() or directory.stat().st_uid != os.getuid():
            raise RuntimeError('unsafe_state_directory')
        os.chmod(directory, 0o700)
        self.logger = logging.getLogger('lasa-anchor.' + str(os.getpid()))
        self.logger.propagate = False
        self.logger.setLevel(logging.INFO)
        handler = RotatingFileHandler(directory / 'anchor.jsonl', maxBytes=65536,
                                      backupCount=2, encoding='utf-8')
        self.logger.addHandler(handler)
        self.boot = Path('/proc/sys/kernel/random/boot_id').read_text().strip()

    def write(self, event, code=0):
        # Fixed event names and numeric codes only. Never log probe output.
        self.logger.info(json.dumps(dict(utc=datetime.now(timezone.utc).isoformat(),
                                        boot_id=self.boot, pid=os.getpid(),
                                        event=event, code=code)))


def probe(command, stop, timeout=20):
    """Bound a disposable health process group; discard all its output."""
    try:
        child = subprocess.Popen(command, stdin=subprocess.DEVNULL,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 start_new_session=True)
    except OSError:
        return 127
    deadline = time.monotonic() + timeout
    try:
        while child.poll() is None:
            if stop.is_set() or time.monotonic() >= deadline:
                return 125 if stop.is_set() else 124
            stop.wait(0.05)
        return child.returncode
    finally:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait()


def run(stop, record, command=CHECK, interval=30, timeout=20, heartbeat=300):
    previous = None
    last_record = time.monotonic()
    while not stop.is_set():
        code = probe(command, stop, timeout)
        if stop.is_set():
            break
        if code != previous or time.monotonic() - last_record >= heartbeat:
            record('health_ok' if code == 0 else 'health_degraded', code)
            previous = code
            last_record = time.monotonic()
        stop.wait(interval)


def main():
    os.umask(0o077)
    logging.raiseExceptions = False
    stop = threading.Event()
    reason = [0]

    def terminate(signum, _frame):
        reason[0] = signum
        stop.set()

    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(sig, terminate)
    records = None
    lock = None
    try:
        records = Records(STATE)
        lock = (STATE / 'anchor.lock').open('a')
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            records.write('duplicate_anchor', 75)
            return 75
        records.write('start')
    except (OSError, RuntimeError):
        records = None  # Diagnostics failure must not drop the anchor.

    def record(event, code=0):
        if records:
            try:
                records.write(event, code)
            except OSError:
                pass

    exit_code = 0
    try:
        run(stop, record)
    except Exception:
        exit_code = 70
        record('internal_error', exit_code)
    finally:
        record('signal_exit' if reason[0] else 'exit', reason[0] or exit_code)
        if lock:
            lock.close()
    return 128 + reason[0] if reason[0] else exit_code


if __name__ == '__main__':
    raise SystemExit(main())
