import { useState } from 'react';
import { Save, RotateCcw, MapPin, ShieldCheck, Monitor } from 'lucide-react';
import { PageTitle, Panel, PanelTitle, Field, Button, Modal } from '../../components/UI';
import { useGym } from '../../context/GymContext';

export default function Settings() {
  const { state, saveSettings, reset } = useGym();
  const [form, setForm] = useState(state.settings);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageTitle
        title="A district of your own"
        description="The small details that make the gym feel like home."
      />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-6">
          <PanelTitle
            title="Gym details"
            subtitle="Basic information for your single-location gym."
          />
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              saveSettings(form);
            }}
          >
            <Field label="Gym name">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={80}
              />
            </Field>
            <Field label="Contact email">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Contact phone">
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={30}
              />
            </Field>
            <div className="flex items-center gap-2 rounded-lg bg-canvas p-3 text-xs text-muted">
              <MapPin size={15} />
              One location · Asia/Manila timezone
            </div>
            <Button type="submit">
              <Save size={15} />
              Save changes
            </Button>
          </form>
        </Panel>
        <div className="space-y-5">
          <Panel className="p-6">
            <PanelTitle
              title="Roles & access"
              action={<ShieldCheck size={19} className="text-brand-strong" />}
            />
            <div className="space-y-4 text-xs leading-6 text-muted">
              <div>
                <strong className="block text-ink">Admin</strong>Manages members, gym access,
                attendance, progress, and reports.
              </div>
              <div>
                <strong className="block text-ink">User</strong>Views their own membership and
                attendance, and records their own progress.
              </div>
            </div>
          </Panel>
          <Panel className="p-6">
            <PanelTitle
              title="Interactive preview"
              action={<Monitor size={19} className="text-muted" />}
            />
            <p className="mb-4 text-xs leading-6 text-muted">
              Changes are saved only in this browser. Restore the sample members and visits any
              time.
            </p>
            <Button variant="secondary" onClick={() => setConfirm(true)}>
              <RotateCcw size={14} />
              Restore sample data
            </Button>
          </Panel>
        </div>
      </div>
      {confirm && (
        <Modal
          title="Restore the sample data?"
          description="This removes changes made in this local preview and brings back the sample members, visits, and progress."
          onClose={() => setConfirm(false)}
        >
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep my changes
            </Button>
            <Button
              onClick={() => {
                setForm(reset().settings);
                setConfirm(false);
              }}
            >
              Restore sample data
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
