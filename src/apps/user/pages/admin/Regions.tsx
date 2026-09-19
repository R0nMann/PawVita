import RegionsAdmin from '../../../../shared/admin/RegionsAdmin';

export default function Regions() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Regional Configuration</h2>
        <p className="text-gray-500">States, districts, blocks and villages that route reports to the right vets</p>
      </div>
      <RegionsAdmin />
    </div>
  );
}
