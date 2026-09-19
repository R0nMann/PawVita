import { useParams, useNavigate } from 'react-router';
import { useCatalog, useLabRequest } from '../../../../api/queries';
import { diseaseName, formatDateTime, LAB_PRIORITY_STYLE, LAB_STATUS_LABEL, SPECIES_LABEL } from '../../../../lib/format';
import { LabWorkflow } from '../../../../shared/lab/LabActions';
import { QueryState } from '../../../../shared/ui/States';

export default function SampleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sampleQ = useLabRequest(id);
  const catalog = useCatalog();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <QueryState query={sampleQ} loadingLabel="Loading sample…">
        {(sample) => (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors text-sm">← Back</button>
              <div>
                <h2 className="text-xl font-bold font-display text-[#1B4332]">Sample {sample.requestNumber}</h2>
                <p className="text-gray-500 text-sm">{diseaseName(sample.case?.suspectedDiseaseCode, catalog.data)}</p>
              </div>
              <span className={`ml-auto text-xs px-3 py-1.5 rounded-full font-semibold ${LAB_PRIORITY_STYLE[sample.priority]}`}>{sample.priority} priority</span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-5">
              <h3 className="font-bold font-display text-[#1B4332] mb-4">Sample Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Sample ID', sample.requestNumber],
                  ['Sample Type', sample.sampleType],
                  ['Tests', sample.tests.join(', ')],
                  ['Suspected Disease', diseaseName(sample.case?.suspectedDiseaseCode, catalog.data)],
                  ['Species', sample.animal ? SPECIES_LABEL[sample.animal.species] : '—'],
                  ['Animal', sample.animal ? sample.animal.tagNumber ?? sample.animal.name ?? '—' : 'Herd sample'],
                  ['Case', sample.case?.caseNumber ?? '—'],
                  ['Referring Vet', sample.requestedBy?.fullName ?? '—'],
                  ['Received At', formatDateTime(sample.receivedAt)],
                  ['Status', LAB_STATUS_LABEL[sample.status]],
                ].map(([l, v]) => (
                  <div key={l} className="bg-[#FAF9F6] rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                    <p className="font-semibold text-gray-800 font-display">{v}</p>
                  </div>
                ))}
              </div>
              {sample.notes && <p className="text-sm text-gray-600 mt-3">Vet's note: {sample.notes}</p>}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-5">
              <h3 className="font-bold font-display text-[#1B4332] mb-4">Diagnostic Result Entry</h3>
              <LabWorkflow sample={sample} accent="#9333EA" />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
