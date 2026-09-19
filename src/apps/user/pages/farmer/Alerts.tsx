import { useState } from 'react';
import { useAdvisories } from '../../../../api/queries';
import type { AdvisoryCategory } from '../../../../api/types';
import { useSession } from '../../../../auth/AuthContext';
import { formatDate } from '../../../../lib/format';
import { EmptyState, QueryState } from '../../../../shared/ui/States';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

const CATEGORY_ICON: Record<AdvisoryCategory, string> = {
  outbreak: '🦠',
  vaccination: '💉',
  weather: '🌦️',
  treatment: '💊',
  general: '📢',
};

/** Advisories for the farmer's village, block, district and state, in their language. */
export default function Alerts() {
  const session = useSession();
  const [lang, setLang] = useState(
    LANGS.some(l => l.code === session.language) ? session.language! : 'en',
  );
  const advisoriesQ = useAdvisories({ lang });

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display text-[#1B4332]">Advisories</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1" role="group" aria-label="Language">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${lang === l.code ? 'bg-[#1B4332] text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <QueryState query={advisoriesQ} loadingLabel="Loading advisories…">
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState icon="🌿" title="No advisories for your area" body="When the veterinary department issues an alert for your village or district, it appears here." />
          ) : (
            <div className="space-y-4">
              {data.items.map(a => (
                <div key={a.id} className={`bg-white rounded-2xl p-5 shadow-card border-l-4 ${
                  a.severity === 'high' ? 'border-red-500' : a.severity === 'moderate' ? 'border-amber-400' : 'border-green-500'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{CATEGORY_ICON[a.category]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold font-display text-gray-800">{a.localized.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.severity === 'high' ? 'severity-high' : a.severity === 'moderate' ? 'severity-medium' : 'severity-low'
                        }`}>
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{a.localized.body}</p>
                      <p className="text-gray-400 text-xs mt-3">
                        {formatDate(a.publishedAt)}
                        {a.region ? ` · ${a.region.name}` : ' · All India'}
                        {a.localized.language !== lang && lang !== 'en' ? ' · translation not yet available' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </QueryState>
    </div>
  );
}
