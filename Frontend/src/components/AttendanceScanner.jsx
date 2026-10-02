import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, ScanLine, CheckCircle2 } from 'lucide-react';
import { Button, Panel, timeLabel } from './UI';
import { api } from '../lib/api';
import { useGym } from '../context/GymContext';
const prefix = 'fit-district:attendance:';
export default function AttendanceScanner({ open, onSaved, enabled }) {
  const { refreshGym } = useGym();
  const video = useRef(null),
    controls = useRef(null),
    generation = useRef(0),
    accepting = useRef(false),
    pending = useRef(null),
    upload = useRef(null);
  const [camera, setCamera] = useState(false),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false),
    [saved, setSaved] = useState(null);
  const action = open ? 'time-out' : 'time-in';
  const scanAction = useRef(action);
  function stop() {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    video.current?.srcObject?.getTracks().forEach((track) => track.stop());
    if (video.current) video.current.srcObject = null;
    setCamera(false);
  }
  useEffect(
    () => () => {
      generation.current++;
      controls.current?.stop();
      video.current?.srcObject?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  async function submit(body) {
    setBusy(true);
    setError('');
    setUncertain(false);
    try {
      const result = await api('/gym/attendance/scan', { method: 'POST', body });
      pending.current = null;
      setSaved({ ...result, action: body.action });
      await Promise.allSettled([refreshGym(), onSaved()]);
    } catch (e) {
      setError(e.message);
      const unknown = !e.status || e.status >= 500;
      setUncertain(unknown);
      if (!unknown) pending.current = null;
    } finally {
      setBusy(false);
      accepting.current = false;
    }
  }
  async function decoded(text) {
    if (accepting.current) return;
    accepting.current = true;
    stop();
    if (!text.startsWith(prefix)) {
      setError('Scan the gym attendance QR displayed by the admin.');
      setBusy(false);
      accepting.current = false;
      return;
    }
    const body = {
      requestId: crypto.randomUUID(),
      token: text.slice(prefix.length),
      action: scanAction.current,
    };
    pending.current = body;
    await submit(body);
  }
  async function startCamera() {
    if (busy || camera || uncertain) return;
    setError('');
    setSaved(null);
    setCamera(true);
    scanAction.current = action;
    const current = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('secure-context');
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const { DecodeHintType } = await import('@zxing/library');
      if (current !== generation.current) return;
      const control = await new BrowserQRCodeReader(
        new Map([[DecodeHintType.TRY_HARDER, true]]),
      ).decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        video.current,
        (result, _error, control) => {
          if (result && current === generation.current && !accepting.current) {
            control.stop();
            decoded(result.getText());
          }
        },
      );
      if (current !== generation.current) control.stop();
      else controls.current = control;
    } catch (e) {
      if (current !== generation.current) return;
      stop();
      setError(
        e.message === 'secure-context'
          ? 'Camera scanning needs HTTPS or localhost. You can also choose a current QR photo.'
          : e.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access or choose a current QR photo.'
            : 'Could not open the camera. Try again or choose a current QR photo.',
      );
    }
  }
  async function readPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy || uncertain) return;
    stop();
    setError('');
    setSaved(null);
    setBusy(true);
    scanAction.current = action;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError('Choose a PNG, JPG, or WebP image smaller than 10 MB.');
      setBusy(false);
      return;
    }
    const current = generation.current;
    setReading(true);
    try {
      const { readQrPhoto } = await import('../lib/qr-photo');
      const text = await readQrPhoto(file);
      if (current === generation.current) {
        setReading(false);
        await decoded(text);
      }
    } catch (e) {
      if (current === generation.current) {
        setError(
          e.message || 'The QR photo reader could not start. Reload this page and try again.',
        );
        setBusy(false);
      }
    } finally {
      setReading(false);
    }
  }
  return (
    <Panel className="mb-6 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="rounded-xl bg-orange-50 p-3 text-brand-strong">
          <ScanLine size={25} />
        </span>
        <div>
          <h2 className="text-base font-bold">
            {open ? 'Ready to head out?' : 'Your workout starts here'}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            {open
              ? 'You are currently timed in. Scan the gym QR to save your time-out.'
              : 'Scan the rotating QR on the admin’s screen to save your time-in.'}{' '}
            Your attendance is saved automatically.
          </p>
        </div>
      </div>
      <video
        ref={video}
        muted
        playsInline
        aria-label="Gym QR camera preview"
        className={`mt-5 aspect-video w-full max-w-lg rounded-xl bg-slate-950 object-cover ${camera ? '' : 'hidden'}`}
      />
      <div className="mt-5 flex flex-wrap gap-3">
        {camera ? (
          <Button variant="secondary" onClick={stop}>
            Stop camera
          </Button>
        ) : (
          <Button onClick={startCamera} disabled={!enabled || busy || uncertain}>
            <Camera size={16} />
            {busy
              ? reading
                ? 'Reading QR…'
                : 'Saving…'
              : `Scan to ${open ? 'time out' : 'time in'}`}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => upload.current?.click()}
          disabled={!enabled || busy || uncertain || camera}
        >
          <Upload size={15} />
          Choose QR photo
        </Button>
        <input
          ref={upload}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={readPhoto}
          className="hidden"
          aria-label="Choose gym QR photo"
        />
        {uncertain && (
          <Button variant="secondary" disabled={busy} onClick={() => submit(pending.current)}>
            Retry saving this scan
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs leading-5 text-rose-700">
          {error}
          {uncertain ? ' The result is uncertain. Retry the same scan to check it safely.' : ''}
        </p>
      )}
      {saved && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"
        >
          <CheckCircle2 size={17} />
          {saved.message} ·{' '}
          {timeLabel(saved.action === 'time-in' ? saved.visit.in : saved.visit.out)}
        </div>
      )}
      {!enabled && (
        <p className="mt-3 text-xs text-muted">
          Sign in to a connected member account to record attendance.
        </p>
      )}
    </Panel>
  );
}
