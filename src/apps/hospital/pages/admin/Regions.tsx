import RegionsAdmin from "../../../../shared/admin/RegionsAdmin";

export default function Regions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Regional Configuration</h1>
        <p className="text-gray-500 text-sm">States, districts, blocks and villages that route reports to the right vets</p>
      </div>
      <RegionsAdmin />
    </div>
  );
}
