/** Konten anlegen, Rollen geben, sperren, Passwort setzen. Die letzte Regie bleibt. */
import { useState } from "react";
import { toast } from "sonner";
import { createMember, deleteMember, updateMember } from "@/lib/pulse/api";
import type { DeskRole } from "@/lib/pulse/logic";
import type { AdminSnapshot, MemberRecord } from "@/lib/pulse/types";
import { Button, Field, Panel, Segment, errorText, fieldClass } from "@/components/pulse-ui";

export function UsersDesk({ data, onSaved }: { data: AdminSnapshot; onSaved: (next: AdminSnapshot) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<DeskRole>("listener");
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-4">
      <Panel title="Konto anlegen">
        <p className="mb-4 text-sm text-muted">
          Hörer wünschen und stimmen ab. DJ hat das Pult. Regie stellt Programm, Plan und Konten. Das erste Konto der
          Sendung ist Regie, die letzte aktive Regie bleibt.
        </p>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            void createMember({ data: { name, email, password, role } })
              .then((next) => {
                onSaved(next);
                setName("");
                setEmail("");
                setPassword("");
                toast.success("Konto liegt bereit.");
              })
              .catch((caught) => toast.error(errorText(caught)))
              .finally(() => setPending(false));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="E-Mail">
              <input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Passwort" hint="Mindestens 8 Zeichen. Wird nur als Hash gespeichert.">
              <input className={fieldClass} type="password" value={password} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field label="Rolle">
              <RoleSelect value={role} onChange={setRole} />
            </Field>
          </div>
          <Button type="submit" disabled={pending}>
            Konto anlegen
          </Button>
        </form>
      </Panel>
      <Panel title="Team">
        <ul className="grid gap-3">
          {data.members.map((member) => (
            <UserRow key={member.userId} member={member} onSaved={onSaved} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function UserRow({ member, onSaved }: { member: MemberRecord; onSaved: (next: AdminSnapshot) => void }) {
  const [name, setName] = useState(member.displayName);
  const [password, setPassword] = useState("");
  return (
    <li className="grid gap-3 rounded-lg bg-surface-2 p-3">
      <div className="grid gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {member.displayName}
            {member.mine ? <span className="ml-2 text-sm text-subtle">du</span> : null}
            {member.disabled ? <span className="ml-2 text-sm text-danger">gesperrt</span> : null}
          </p>
          <p className="truncate text-sm text-muted">{member.email || "Ohne E-Mail"}</p>
        </div>
        <RoleSelect
          value={member.role}
          onChange={(role) => {
            void updateMember({ data: { userId: member.userId, role } })
              .then(onSaved)
              .catch((caught) => toast.error(errorText(caught)));
          }}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={fieldClass} value={name} aria-label="Name" onChange={(event) => setName(event.target.value)} />
        <input
          className={fieldClass}
          type="password"
          value={password}
          placeholder="Neues Passwort"
          autoComplete="new-password"
          aria-label="Neues Passwort"
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button
          variant="line"
          onClick={() => {
            void updateMember({
              data: { userId: member.userId, name, password: password || undefined },
            })
              .then((next) => {
                onSaved(next);
                setPassword("");
                toast.success("Gespeichert.");
              })
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          Speichern
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="line"
          onClick={() => {
            void updateMember({ data: { userId: member.userId, disabled: !member.disabled } })
              .then(onSaved)
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          {member.disabled ? "Freigeben" : "Sperren"}
        </Button>
        <Button
          variant="danger"
          disabled={member.mine}
          onClick={() => {
            void deleteMember({ data: { userId: member.userId } })
              .then(onSaved)
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          Entfernen
        </Button>
      </div>
    </li>
  );
}

function RoleSelect({ value, onChange }: { value: string; onChange: (role: DeskRole) => void }) {
  return (
    <Segment
      label="Rolle"
      value={value === "admin" || value === "dj" || value === "listener" ? value : "listener"}
      onChange={onChange}
      options={[
        { id: "listener", label: "Hörer" },
        { id: "dj", label: "DJ" },
        { id: "admin", label: "Regie" },
      ]}
    />
  );
}
