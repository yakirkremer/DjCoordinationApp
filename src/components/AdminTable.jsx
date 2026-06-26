import React from 'react';
import { OFFICIAL_CATEGORIES } from '../lib/categories';

export default function AdminTable({ tracks, onUpdateTrack, onDeleteTrack }) {
  return (
    <section className="xdj-browser overflow-hidden">
      <div className="xdj-browser-header">
        <span className="font-lcd text-xs tracking-[0.25em] text-xdj-cyan">CATALOG EDITOR</span>
      </div>
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="xdj-browser-columns text-xs">
            <th className="p-4">שם השיר / אמן</th>
            <th className="p-4">קובץ (Filename)</th>
            <th className="p-4">באקט</th>
            <th className="p-4 w-24">התחלה (S)</th>
            <th className="p-4 w-24">סיום (S)</th>
            <th className="p-4 w-20 text-center">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-xdj-border/30">
          {tracks.map(track => (
            <tr key={track.id} className={`xdj-browser-row hover:bg-xdj-cyan/5 transition-colors ${track.isMissing ? 'bg-red-950/20' : ''}`}>
              <td className="p-3">
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-2">
                    <input 
                      className="bg-transparent border-b border-transparent focus:border-purple-500 outline-none w-full font-bold text-gray-200"
                      value={track.title}
                      onChange={(e) => onUpdateTrack(track.id, 'title', e.target.value)}
                    />
                    {track.isMissing && (
                      <span className="text-[10px] text-red-400 font-bold bg-red-950 px-1.5 py-0.5 rounded border border-red-900 shadow-sm shrink-0">
                        קובץ חסר
                      </span>
                    )}
                  </div>
                  <input 
                    className="bg-transparent text-xs text-gray-500 border-b border-transparent focus:border-purple-500 outline-none w-full"
                    value={track.artist}
                    onChange={(e) => onUpdateTrack(track.id, 'artist', e.target.value)}
                  />
                </div>
              </td>
              <td className="p-3 text-sm font-mono text-gray-400">
                <input 
                  className="bg-transparent border-b border-transparent focus:border-purple-500 outline-none w-full"
                  value={track.filename}
                  onChange={(e) => onUpdateTrack(track.id, 'filename', e.target.value)}
                />
              </td>
              <td className="p-3">
                <select 
  className="bg-gray-800 text-xs rounded px-2 py-1 outline-none border border-gray-700 text-gray-200"
  value={track.bucket}
  onChange={(e) => onUpdateTrack(track.id, 'bucket', e.target.value)}
>
  {OFFICIAL_CATEGORIES.map((cat) => (
    <option key={cat} value={cat}>{cat}</option>
  ))}
</select>
              </td>
              <td className="p-3">
                <input 
                  type="number"
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-center text-purple-400"
                  value={track.startTime}
                  onChange={(e) => onUpdateTrack(track.id, 'startTime', e.target.value)}
                />
              </td>
              <td className="p-3">
                <input 
                  type="number"
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-center text-pink-400"
                  value={track.endTime}
                  onChange={(e) => onUpdateTrack(track.id, 'endTime', e.target.value)}
                />
              </td>
              <td className="p-3 text-center">
                <button 
                  onClick={() => onDeleteTrack(track.id)}
                  className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-gray-800 transition-colors"
                  title="מחק שיר מהקטלוג"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}