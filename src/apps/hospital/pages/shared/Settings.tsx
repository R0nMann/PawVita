import { useState } from "react";

export default function Settings() {
  const [lang, setLang] = useState("en");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(true);
  const [notifCritical, setNotifCritical] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [offline, setOffline] = useState(true);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Language, accessibility, notifications, and account preferences</p>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">🌐 Language & Region</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "en", label: "English", native: "English" },
            { id: "hi", label: "Hindi", native: "हिंदी" },
            { id: "mr", label: "Marathi", native: "मराठी" },
            { id: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
            { id: "gu", label: "Gujarati", native: "ગુજરાતી" },
            { id: "ta", label: "Tamil", native: "தமிழ்" },
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${lang === l.id ? "border-[#1B4332] bg-[#1B4332]/5" : "border-gray-200 hover:border-gray-300"}`}
            >
              <p className={`font-semibold text-sm ${lang === l.id ? "text-[#1B4332]" : "text-gray-800"}`}>{l.native}</p>
              <p className="text-xs text-gray-500">{l.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">🔔 Notification Preferences</h2>
        <div className="space-y-4">
          {[
            { label: "Email Notifications", sub: "Receive alerts and updates via email", val: notifEmail, set: setNotifEmail },
            { label: "SMS Alerts", sub: "Critical outbreak alerts via SMS", val: notifSMS, set: setNotifSMS },
            { label: "Critical Alerts Only", sub: "Only notify for high-severity events", val: notifCritical, set: setNotifCritical },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-800 text-sm">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
              </div>
              <button
                onClick={() => item.set(!item.val)}
                className={`w-12 h-6 rounded-full transition-all relative ${item.val ? "bg-[#1B4332]" : "bg-gray-300"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${item.val ? "right-1" : "left-1"}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">♿ Accessibility</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-gray-800 text-sm">High Contrast Mode</p>
            <p className="text-xs text-gray-500 mt-0.5">Increase contrast for better visibility</p>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`w-12 h-6 rounded-full transition-all relative ${highContrast ? "bg-[#1B4332]" : "bg-gray-300"}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${highContrast ? "right-1" : "left-1"}`}></div>
          </button>
        </div>
      </div>

      {/* Offline Mode */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">📱 Offline & Sync</h2>
        <div className="flex items-center justify-between py-2 mb-4">
          <div>
            <p className="font-medium text-gray-800 text-sm">Offline-First Mode</p>
            <p className="text-xs text-gray-500 mt-0.5">Save reports locally when offline, sync when connected</p>
          </div>
          <button
            onClick={() => setOffline(!offline)}
            className={`w-12 h-6 rounded-full transition-all relative ${offline ? "bg-[#1B4332]" : "bg-gray-300"}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${offline ? "right-1" : "left-1"}`}></div>
          </button>
        </div>
        {offline && (
          <div className="bg-[#1B4332]/5 border border-[#1B4332]/20 rounded-xl p-3">
            <p className="text-xs text-[#1B4332]">✅ Offline mode active — reports saved locally and synced automatically when internet connection is restored.</p>
          </div>
        )}
      </div>

      <button className="w-full gradient-primary text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all">
        Save Settings
      </button>
    </div>
  );
}
