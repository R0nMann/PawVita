import { useState } from 'react';

export default function Settings() {
  const [lang, setLang] = useState('hindi');
  const [notifications, setNotifications] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [offlineSync, setOfflineSync] = useState(true);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-display text-[#1B4332] mb-6">Settings</h1>
      <div className="space-y-4">
        {/* Language */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="font-bold font-display text-[#1B4332] mb-4">Language / भाषा</h3>
          <div className="grid grid-cols-3 gap-2">
            {[['hindi', 'हिंदी'], ['english', 'English'], ['gujarati', 'ગુજરાતી'], ['punjabi', 'ਪੰਜਾਬੀ'], ['tamil', 'தமிழ்'], ['telugu', 'తెలుగు']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setLang(v)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${lang === v ? 'border-[#1B4332] bg-green-50 text-[#1B4332] font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        {[
          { label: 'Push Notifications', sub: 'Alerts for disease outbreaks and case updates', value: notifications, set: setNotifications },
          { label: 'High Contrast Mode', sub: 'Improves readability for visually impaired users', value: highContrast, set: setHighContrast },
          { label: 'Offline Auto-Sync', sub: 'Sync reports when internet connection is restored', value: offlineSync, set: setOfflineSync },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-semibold font-display text-gray-800">{s.label}</p>
              <p className="text-gray-500 text-sm">{s.sub}</p>
            </div>
            <button
              onClick={() => s.set(!s.value)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${s.value ? 'bg-[#1B4332]' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${s.value ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}

        <button className="w-full border-2 border-red-200 text-red-500 py-3.5 rounded-xl font-bold font-display hover:bg-red-50 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
