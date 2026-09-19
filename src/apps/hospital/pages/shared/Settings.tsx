import SettingsPanel from "../../../../shared/account/SettingsPanel";

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Profile, language and offline sync</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
