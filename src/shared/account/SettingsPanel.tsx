import { useState } from "react";
import { Link } from "react-router";
import { authApi } from "../../api/endpoints";
import { roleLabelFor, useAuth, useSession } from "../../auth/AuthContext";
import { LANGUAGES, timeAgo } from "../../lib/format";
import { isAutoSyncEnabled, setAutoSync } from "../../offline/outbox";
import { useOnline, useOutbox } from "../../offline/useOutbox";
import { FormError } from "../ui/States";

/**
 * Account settings shared by both portals: profile and advisory language
 * (saved to the account), and the offline outbox on this device.
 */
export default function SettingsPanel() {
  const session = useSession();
  const { refreshAccount } = useAuth();
  const online = useOnline();
  const outbox = useOutbox();
  const [name, setName] = useState(session.name);
  const [lang, setLang] = useState(session.language ?? "en");
  const [autoSync, setAutoSyncState] = useState(isAutoSyncEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save(changes: { fullName?: string; preferredLanguage?: string }) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await authApi.updateMe(changes);
      await refreshAccount();
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  const card = "bg-white rounded-2xl border border-[#E8E5DF] p-5";
  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="font-bold font-display text-[#1B4332] mb-4">👤 Profile</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name.trim() !== session.name) void save({ fullName: name.trim() });
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Full name"
            className="flex-1 min-h-[44px] border border-gray-200 rounded-xl px-3.5 text-sm bg-[#FAF9F6]"
          />
          <button disabled={saving} className="px-4 rounded-xl bg-[#1B4332] text-white text-sm font-semibold disabled:opacity-50">
            Save
          </button>
        </form>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-400 text-xs">Role</dt>
            <dd className="text-gray-800">{roleLabelFor(session)}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs">Sign-in</dt>
            <dd className="text-gray-800 truncate">{session.identifier}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs">Area</dt>
            <dd className="text-gray-800">{session.district ?? "Not set — ask an administrator"}</dd>
          </div>
          {session.account.organization && (
            <div>
              <dt className="text-gray-400 text-xs">Organisation</dt>
              <dd className="text-gray-800">{session.account.organization.name}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className={card}>
        <h2 className="font-bold font-display text-[#1B4332] mb-1">🌐 Language / भाषा</h2>
        <p className="text-xs text-gray-500 mb-4">Advisories and alerts are shown in this language where a translation exists.</p>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              disabled={saving}
              aria-pressed={lang === l.code}
              onClick={() => {
                setLang(l.code);
                void save({ preferredLanguage: l.code });
              }}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                lang === l.code ? "border-[#1B4332] bg-green-50 text-[#1B4332] font-semibold" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {l.native}
            </button>
          ))}
        </div>
      </div>
      {saved && <p className="text-sm text-green-700 font-semibold">✓ Saved</p>}
      <FormError error={error} />

      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold font-display text-[#1B4332]">📱 Offline Auto-Sync</h2>
            <p className="text-gray-500 text-sm">Send reports saved offline as soon as the connection returns</p>
          </div>
          <button
            role="switch"
            aria-checked={autoSync}
            aria-label="Offline auto-sync"
            onClick={() => {
              setAutoSync(!autoSync);
              setAutoSyncState(!autoSync);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${autoSync ? "bg-[#1B4332]" : "bg-gray-200"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${autoSync ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {online ? "Online" : "Offline"} · {outbox.items.length ? `${outbox.items.length} item(s) waiting on this device` : "Nothing waiting to send"}
        </p>
        {outbox.items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {outbox.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 bg-[#FAF9F6] rounded-xl px-3 py-2">
                <span className="text-lg">{item.failed ? "⚠️" : "📦"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{item.label}</p>
                  <p className="text-xs text-gray-500 truncate">
                    Saved {timeAgo(new Date(item.createdAt))}
                    {item.lastError ? ` · ${item.lastError}` : ""}
                  </p>
                </div>
                {item.failed && (
                  <button onClick={() => void outbox.retry(item.id)} className="text-xs font-semibold text-[#1B4332]">
                    Retry
                  </button>
                )}
                <button onClick={() => void outbox.discard(item.id)} className="text-xs font-semibold text-red-600">
                  Discard
                </button>
              </li>
            ))}
          </ul>
        )}
        {outbox.pending.length > 0 && (
          <button
            disabled={!online}
            onClick={() => void outbox.flush()}
            className="mt-3 w-full border-2 border-[#1B4332] text-[#1B4332] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            Sync now
          </button>
        )}
      </div>

      <Link
        to="/logout"
        className="block w-full text-center border-2 border-red-200 text-red-500 py-3.5 rounded-xl font-bold font-display hover:bg-red-50 transition-colors"
      >
        Sign out
      </Link>
    </div>
  );
}
