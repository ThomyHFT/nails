"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { BrandButton, Caption, Overline, Panel, TextField } from "@/components/brand";

type Message = { tone: "ok" | "error"; text: string } | null;

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : "No se pudo guardar.";
}

function Feedback({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      role={message.tone === "error" ? "alert" : "status"}
      className={message.tone === "error" ? "t-caption text-destructive" : "t-caption text-muted-foreground"}
    >
      {message.text}
    </p>
  );
}

/**
 * Cuenta (SPEC 20): datos de contacto, contraseña y correo. La misma pieza
 * sirve a la clienta y a la profesional; cada página le pasa sus datos.
 */
export function AccountSettings({
  slug,
  email,
  name: initialName,
  phone: initialPhone,
  hasPassword,
}: {
  slug: string;
  email: string | null;
  name: string;
  phone: string;
  hasPassword: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [contactMsg, setContactMsg] = useState<Message>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSet, setPasswordSet] = useState(hasPassword);
  const [passwordMsg, setPasswordMsg] = useState<Message>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Message>(null);

  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel padding="sm" className="flex flex-col gap-4">
        <Overline>Tus datos</Overline>
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <TextField
          label="Teléfono"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="+56 9 1234 5678"
        />
        <div className="flex items-center justify-between gap-3">
          <Feedback message={contactMsg} />
          <BrandButton
            size="sm"
            className="ml-auto"
            disabled={busy !== null}
            onClick={() =>
              run("contact", async () => {
                const error = await send("/api/account", "PATCH", { name, phone });
                setContactMsg(error ? { tone: "error", text: error } : { tone: "ok", text: "Datos guardados." });
              })
            }
          >
            Guardar
          </BrandButton>
        </div>
      </Panel>

      <Panel padding="sm" className="flex flex-col gap-4">
        <Overline>{passwordSet ? "Cambiar contraseña" : "Crear contraseña"}</Overline>
        {!passwordSet && (
          <Caption>Hoy entras con un código por correo. Si prefieres, crea una contraseña; el código seguirá funcionando.</Caption>
        )}
        {passwordSet && (
          <TextField
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        )}
        <TextField
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          hint="Al menos 8 caracteres."
        />
        <div className="flex items-center justify-between gap-3">
          <Feedback message={passwordMsg} />
          <BrandButton
            size="sm"
            className="ml-auto"
            disabled={busy !== null || newPassword.length < 8}
            onClick={() =>
              run("password", async () => {
                const error = await send("/api/account/password", "POST", {
                  currentPassword: passwordSet ? currentPassword : undefined,
                  newPassword,
                });
                if (error) {
                  setPasswordMsg({ tone: "error", text: error });
                  return;
                }
                setPasswordSet(true);
                setCurrentPassword("");
                setNewPassword("");
                setPasswordMsg({ tone: "ok", text: "Contraseña guardada." });
              })
            }
          >
            Guardar contraseña
          </BrandButton>
        </div>
      </Panel>

      <Panel padding="sm" className="flex flex-col gap-4">
        <Overline>Correo</Overline>
        {email && <Caption>Hoy usas {email}.</Caption>}
        {!emailCodeSent ? (
          <>
            <TextField label="Correo nuevo" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" />
            <div className="flex items-center justify-between gap-3">
              <Feedback message={emailMsg} />
              <BrandButton
                size="sm"
                className="ml-auto"
                disabled={busy !== null || !newEmail}
                onClick={() =>
                  run("email", async () => {
                    const error = await send("/api/account/email", "POST", { newEmail, slug });
                    if (error) {
                      setEmailMsg({ tone: "error", text: error });
                      return;
                    }
                    setEmailCodeSent(true);
                    setEmailMsg({ tone: "ok", text: `Te enviamos un código a ${newEmail}.` });
                  })
                }
              >
                Enviar código
              </BrandButton>
            </div>
          </>
        ) : (
          <>
            <TextField
              label="Código"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
            />
            <div className="flex items-center justify-between gap-3">
              <Feedback message={emailMsg} />
              <BrandButton
                size="sm"
                className="ml-auto"
                disabled={busy !== null || emailCode.length !== 6}
                onClick={() =>
                  run("email-confirm", async () => {
                    const error = await send("/api/account/email/confirm", "POST", { newEmail, code: emailCode });
                    if (error) {
                      setEmailMsg({ tone: "error", text: error });
                      return;
                    }
                    // La sesión guarda el correo viejo: se entra de nuevo con el nuevo.
                    await signOut({ callbackUrl: `/${slug}/login` });
                  })
                }
              >
                Confirmar correo
              </BrandButton>
            </div>
            <Caption className="text-xs">Al confirmar se cierra tu sesión para que entres con el correo nuevo.</Caption>
          </>
        )}
      </Panel>
    </div>
  );
}
