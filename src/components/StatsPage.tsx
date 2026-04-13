import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPracticeHeatmap, getSectionStats, SECTIONS } from '../lib/statsService';
import type { DayActivity, DailyStats } from '../lib/statsService';

// --- Heatmap ---

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const Heatmap: React.FC<{ data: DayActivity[] }> = ({ data }) => {
  if (data.length === 0) return <p className="text-sm text-gray-500">No data yet.</p>;

  // Group by week (columns) starting from the first Sunday before data start
  const first = new Date(data[0].date);
  const startDay = first.getDay();
  const offset = startDay; // days into the first week
  const cells = Array<boolean | null>(offset).fill(null).concat(data.map(d => d.practiced));
  const weeks: (boolean | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  // pad last week
  while (weeks.length > 0 && weeks[weeks.length - 1].length < 7) {
    weeks[weeks.length - 1].push(null);
  }

  // Month labels
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d - offset;
      if (idx >= 0 && idx < data.length) {
        const m = new Date(data[idx].date).getMonth();
        if (m !== lastMonth) {
          monthLabels.push({ col: w, label: MONTHS[m] });
          lastMonth = m;
        }
        break;
      }
    }
  }

  const SZ = 12, GAP = 2;

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Month labels */}
        <div className="flex ml-8 mb-1" style={{ gap: 0 }}>
          {monthLabels.map((ml, i) => (
            <span
              key={i}
              className="text-xs text-gray-500"
              style={{ position: 'relative', left: ml.col * (SZ + GAP) }}
            >
              {ml.label}
            </span>
          ))}
        </div>
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col mr-1" style={{ gap: GAP }}>
            {DAYS.map((d, i) => (
              <div key={i} className="text-xs text-gray-400" style={{ height: SZ, lineHeight: `${SZ}px` }}>{d}</div>
            ))}
          </div>
          {/* Grid */}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, w) => (
              <div key={w} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((cell, d) => (
                  <div
                    key={d}
                    className={`rounded-sm ${
                      cell === null
                        ? 'bg-transparent'
                        : cell
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                    }`}
                    style={{ width: SZ, height: SZ }}
                    title={
                      cell !== null
                        ? `${data[w * 7 + d - offset]?.date ?? ''}: ${cell ? 'Practiced' : 'No practice'}`
                        : ''
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 ml-8">
          <span className="text-xs text-gray-500">Less</span>
          <div className="w-3 h-3 rounded-sm bg-gray-200" />
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>
    </div>
  );
};

// --- Section Chart ---

const SectionChart: React.FC<{ userId: string }> = ({ userId }) => {
  const [section, setSection] = useState(SECTIONS[0].value);
  const [range, setRange] = useState<'month' | 'all'>('month');
  const [data, setData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSectionStats(userId, section, range).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [userId, section, range]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {SECTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => setSection(s.value)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              section === s.value ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setRange('month')}
          className={`px-3 py-1 rounded text-sm font-medium transition ${
            range === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setRange('all')}
          className={`px-3 py-1 rounded text-sm font-medium transition ${
            range === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Time
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-500">No data for this section yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="correct" stroke="#22c55e" strokeWidth={2} name="Correct" dot={false} />
            <Line type="monotone" dataKey="wrong" stroke="#ef4444" strokeWidth={2} name="Wrong" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// --- Stats Page ---

export const StatsPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [heatmap, setHeatmap] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPracticeHeatmap(userId).then(d => {
      setHeatmap(d);
      setLoading(false);
    });
  }, [userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Heatmap */}
        <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Practice Streak</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <Heatmap data={heatmap} />
          )}
        </div>

        {/* Section charts */}
        <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Performance by Section</h2>
          <SectionChart userId={userId} />
        </div>
      </div>
    </div>
  );
};
