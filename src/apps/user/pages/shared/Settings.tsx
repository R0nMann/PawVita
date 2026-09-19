import SettingsPanel from '../../../../shared/account/SettingsPanel';

export default function Settings() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-display text-[#1B4332] mb-6">Settings</h1>
      <SettingsPanel />
    </div>
  );
}
