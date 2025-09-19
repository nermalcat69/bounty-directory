export function NeutralColorTest() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Neutral Color Test</h2>
      
      {/* Background colors */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Background Colors</h3>
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-neutral-100 p-4 rounded text-center">neutral-100</div>
          <div className="bg-neutral-200 p-4 rounded text-center">neutral-200</div>
          <div className="bg-neutral-300 p-4 rounded text-center">neutral-300</div>
          <div className="bg-neutral-400 p-4 rounded text-center text-white">neutral-400</div>
          <div className="bg-neutral-500 p-4 rounded text-center text-white">neutral-500</div>
          <div className="bg-neutral-600 p-4 rounded text-center text-white">neutral-600</div>
          <div className="bg-neutral-700 p-4 rounded text-center text-white">neutral-700</div>
          <div className="bg-neutral-800 p-4 rounded text-center text-white">neutral-800</div>
          <div className="bg-neutral-900 p-4 rounded text-center text-white">neutral-900</div>
        </div>
      </div>

      {/* Text colors */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Text Colors</h3>
        <div className="space-y-1">
          <p className="text-neutral-100 bg-black p-2 rounded">text-neutral-100</p>
          <p className="text-neutral-200 bg-black p-2 rounded">text-neutral-200</p>
          <p className="text-neutral-300 bg-black p-2 rounded">text-neutral-300</p>
          <p className="text-neutral-400">text-neutral-400</p>
          <p className="text-neutral-500">text-neutral-500</p>
          <p className="text-neutral-600">text-neutral-600</p>
          <p className="text-neutral-700">text-neutral-700</p>
          <p className="text-neutral-800">text-neutral-800</p>
          <p className="text-neutral-900">text-neutral-900</p>
        </div>
      </div>

      {/* Hover effects */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Hover Effects</h3>
        <div className="grid grid-cols-3 gap-2">
          <button className="bg-neutral-200 hover:bg-neutral-300 p-4 rounded transition-colors">
            Hover me (200→300)
          </button>
          <button className="bg-neutral-400 hover:bg-neutral-500 p-4 rounded transition-colors text-white">
            Hover me (400→500)
          </button>
          <button className="bg-neutral-700 hover:bg-neutral-800 p-4 rounded transition-colors text-white">
            Hover me (700→800)
          </button>
        </div>
      </div>
    </div>
  );
}