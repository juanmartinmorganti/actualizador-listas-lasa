"""Isolated probes only: no LASA, systemctl, Windows tasks or commercial data."""
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('anchor', ROOT / 'wsl-anchor.py')
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)

class AnchorTests(unittest.TestCase):
    def test_repeated_failure_does_not_exit_and_recovers(self):
        stop = threading.Event()
        events = []
        calls = []
        def fake(*args):
            calls.append(1)
            if len(calls) >= 6:
                stop.set()
            return 1 if len(calls) <= 4 else 0
        with patch.object(a, 'probe', side_effect=fake):
            a.run(stop, lambda *row: events.append(row), interval=0)
        self.assertGreaterEqual(len(calls), 6)
        self.assertEqual(events, [('health_degraded', 1), ('health_ok', 0)])

    def test_real_failure_anchor_remains_alive(self):
        stop = threading.Event()
        events = []
        t = threading.Thread(target=a.run, args=(stop, lambda *r: events.append(r)),
                             kwargs=dict(command=[sys.executable, '-c', 'raise SystemExit(7)'], interval=.02))
        t.start()
        try:
            time.sleep(.5)
            self.assertTrue(t.is_alive())
            self.assertIn(('health_degraded', 7), events)
        finally:
            stop.set(); t.join(2)
        self.assertFalse(t.is_alive())

    def test_timeout_kills_probe_descendants(self):
        with tempfile.TemporaryDirectory() as d:
            marker = Path(d) / 'should-not-exist'
            child = 'import time,pathlib; time.sleep(.6); pathlib.Path(' + repr(str(marker)) + ').touch()'
            parent = 'import subprocess,sys,time; subprocess.Popen([sys.executable,"-c",' + repr(child) + ']); time.sleep(30)'
            start = time.monotonic()
            self.assertEqual(a.probe([sys.executable, '-c', parent], threading.Event(), .15), 124)
            self.assertLess(time.monotonic()-start, 2)
            time.sleep(.7)
            self.assertFalse(marker.exists())

    def test_missing_probe_is_degraded(self):
        self.assertEqual(a.probe(['/nonexistent-lasa-test'], threading.Event()), 127)

    def test_repeated_timeouts_do_not_end_anchor(self):
        stop = threading.Event()
        events = []
        def record(*row):
            events.append(row)
            if len(events) >= 3: stop.set()
        a.run(stop, record, command=[sys.executable, '-c', 'import time; time.sleep(30)'],
              interval=.01, timeout=.05, heartbeat=0)
        self.assertEqual(events, [('health_degraded', 124)] * 3)

    def test_logging_unavailable_does_not_drop_anchor(self):
        with patch.object(a, 'Records', side_effect=PermissionError), patch.object(a, 'run') as run:
            self.assertEqual(a.main(), 0)
            run.assert_called_once()

    def test_signal_exits_only_isolated_anchor(self):
        with tempfile.TemporaryDirectory() as d:
            code = ('import importlib.util,pathlib; s=importlib.util.spec_from_file_location("a",' + repr(str(ROOT/'wsl-anchor.py')) + '); a=importlib.util.module_from_spec(s); s.loader.exec_module(a); a.STATE=pathlib.Path(' + repr(d) + '); a.CHECK[:]=["/usr/bin/false"]; raise SystemExit(a.main())')
            p = subprocess.Popen([sys.executable, '-c', code])
            try:
                log = Path(d)/'anchor.jsonl'
                for _ in range(100):
                    if log.exists() and 'health_degraded' in log.read_text(): break
                    time.sleep(.02)
                self.assertIsNone(p.poll())
                p.send_signal(signal.SIGTERM)
                self.assertEqual(p.wait(3), 143)
                rows = [json.loads(x) for x in log.read_text().splitlines()]
                self.assertEqual(rows[-1]['event'], 'signal_exit')
                self.assertEqual(rows[-1]['code'], 15)
                self.assertEqual(log.stat().st_mode & 0o777, 0o600)
            finally:
                if p.poll() is None: p.kill(); p.wait()

    def test_logs_are_bounded_and_contain_only_metadata(self):
        with tempfile.TemporaryDirectory() as d:
            old = os.umask(0o077)
            try:
                r = a.Records(Path(d))
                for _ in range(3000): r.write('health_degraded', 124)
                files = list(Path(d).glob('anchor.jsonl*'))
                self.assertLessEqual(len(files), 3)
                self.assertLessEqual(sum(x.stat().st_size for x in files), 3*65536)
                for x in files:
                    for row in x.read_text().splitlines():
                        self.assertEqual(set(json.loads(row)), {'utc','boot_id','pid','event','code'})
                for handler in r.logger.handlers[:]: handler.close(); r.logger.removeHandler(handler)
            finally: os.umask(old)

if __name__ == '__main__': unittest.main()
