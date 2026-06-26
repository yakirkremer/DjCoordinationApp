import React from "react";

export default function FiveStarList({ tracks }) {
  return (
    <section className="bg-gray-900 rounded-xl p-6 shadow-xl border border-gray-800" dir="rtl">
      <h3 className="text-lg font-bold text-gray-100 mb-4">שירים שהזוג אהב</h3>

      {tracks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">עדיין אין שירים שסומנו כאהובים</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {tracks.map((track) => (
            <div key={track.id} className="py-3 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-200">{track.title}</p>
                  <p className="text-xs text-gray-500">
                    {track.artist} • <span className="text-purple-400">{track.bucket}</span>
                  </p>
                </div>
                <span className="track-rating-pill track-rating-pill--like shrink-0">אהבתי</span>
              </div>
              {track.comment && (
                <p className="text-xs text-gray-400 italic border-r-2 border-purple-500 pr-3">
                  "{track.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
