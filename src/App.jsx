import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from "recharts";

// --- Helpers ---
const fmtDate = (d = new Date()) => {
  const tzOffset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffset * 60000); // ISO-local
  return local.toISOString().slice(0, 10);
};

const todayStr = fmtDate();

const defaultEntry = () => ({
  date: todayStr,
  pulse: "",
  bpSys: "",
  bpDia: "",
  dizziness: false,
  syncope: false,
  dyspnea: false,
  edema: false,
  bleeding: false,
  fatigue: "0", // 0 none,1 mild,2 severe
  meds: {
    am: { multaq: false, edoxaban: false, bisoprolol: false },
    pm: { multaq: false }
  },
  notes: ""
});

const STORAGE_KEY = "afibcare.entries.v1";

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch (e) {
    return {};
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const Alert = ({ type = "info", title, children }) => {
  const color =
    type === "danger"
      ? "bg-red-50 border-red-300 text-red-800"
      : type === "warn"
      ? "bg-amber-50 border-amber-300 text-amber-800"
      : "bg-blue-50 border-blue-300 text-blue-800";
  return (
    <div className={`border ${color} rounded-2xl p-4`}> 
      {title && <div className="font-semibold mb-1">{title}</div>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
};

const SectionCard = ({ title, right, children }) => (
  <div className="bg-white rounded-2xl shadow p-5">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

const Label = ({ children }) => (
  <label className="text-sm text-gray-700 mb-1 block">{children}</label>
);

const TextInput = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 ${props.className||""}`}
  />
);

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <input type="checkbox" className="w-4 h-4" checked={!!checked} onChange={(e)=>onChange(e.target.checked)} />
    <span className="text-sm">{label}</span>
  </label>
);

const Pill = ({ children }) => (
  <span className="px-2.5 py-1 text-xs rounded-full bg-gray-100 border border-gray-200">{children}</span>
);

const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
    {tabs.map((t) => (
      <button
        key={t}
        onClick={() => onChange(t)}
        className={`px-4 py-2 rounded-2xl text-sm ${
          value === t ? "bg-white shadow" : "text-gray-600"
        }`}
      >
        {t}
      </button>
    ))}
  </div>
);

// --- Main App ---
export default function AFibCareApp() {
  const [entries, setEntries] = useState(() => loadEntries());
  const [date, setDate] = useState(todayStr);
  const [tab, setTab] = useState("오늘 체크");

  const entry = useMemo(() => {
    return entries[date] || { ...defaultEntry(), date };
  }, [entries, date]);

  const updateEntry = (patch) => {
    const next = { ...entry, ...patch };
    const nextEntries = { ...entries, [date]: next };
    setEntries(nextEntries);
    saveEntries(nextEntries);
  };

  const resetToday = () => {
    const nextEntries = { ...entries };
    delete nextEntries[date];
    setEntries(nextEntries);
    saveEntries(nextEntries);
  };

  const daysData = useMemo(() => {
    const arr = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
    return arr.map((e) => ({
      date: e.date.slice(5),
      pulse: Number(e.pulse) || null,
      sys: Number(e.bpSys) || null,
      dia: Number(e.bpDia) || null
    }));
  }, [entries]);

  const dangerFlags = useMemo(() => {
    const p = Number(entry.pulse);
    const sys = Number(entry.bpSys);
    const dia = Number(entry.bpDia);
    const flags = [];
    if (p && (p < 50 || p > 110)) flags.push("맥박 이상 (50 미만 또는 110 초과)");
    if (sys && dia && (sys < 90 || dia < 60)) flags.push("저혈압 의심 (90/60 미만)");
    if (entry.bleeding) flags.push("출혈 보고됨");
    if (entry.syncope) flags.push("실신/실신감 보고됨");
    if (entry.dyspnea) flags.push("호흡 곤란 보고됨");
    return flags;
  }, [entry]);

  const warnFlags = useMemo(() => {
    const flags = [];
    if (entry.dizziness) flags.push("어지럼증");
    if (entry.edema) flags.push("부종");
    if (entry.fatigue === "2") flags.push("심한 피로감");
    return flags;
  }, [entry]);

  const exportCSV = () => {
    const rows = [
      [
        "date",
        "pulse",
        "bpSys",
        "bpDia",
        "dizziness",
        "syncope",
        "dyspnea",
        "edema",
        "bleeding",
        "fatigue",
        "meds_am_multaq",
        "meds_am_edoxaban",
        "meds_am_bisoprolol",
        "meds_pm_multaq",
        "notes"
      ],
      ...Object.values(entries)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => [
          e.date,
          e.pulse,
          e.bpSys,
          e.bpDia,
          e.dizziness,
          e.syncope,
          e.dyspnea,
          e.edema,
          e.bleeding,
          e.fatigue,
          e.meds?.am?.multaq,
          e.meds?.am?.edoxaban,
          e.meds?.am?.bisoprolol,
          e.meds?.pm?.multaq,
          (e.notes||"").replace(/\n/g, " ")
        ])
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afibcare_${fmtDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fillDemo = () => {
    const days = 28;
    const map = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = fmtDate(d);
      map[ds] = {
        ...defaultEntry(),
        date: ds,
        pulse: 70 + Math.round(Math.sin(i / 2) * 10 + (Math.random() * 6 - 3)),
        bpSys: 120 + Math.round(Math.cos(i / 3) * 8 + (Math.random() * 6 - 3)),
        bpDia: 78 + Math.round(Math.sin(i / 3) * 6 + (Math.random() * 4 - 2)),
        dizziness: Math.random() < 0.08,
        bleeding: Math.random() < 0.03,
        fatigue: String(Math.random() < 0.15 ? 1 : 0),
        meds: { am: { multaq: true, edoxaban: true, bisoprolol: true }, pm: { multaq: true } }
      };
    }
    setEntries(map);
    saveEntries(map);
  };

  useEffect(() => {
    // ensure today exists
    if (!entries[todayStr]) {
      const next = { ...entries, [todayStr]: { ...defaultEntry(), date: todayStr } };
      setEntries(next);
      saveEntries(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">AFib Care — 생활기록</h1>
            <p className="text-gray-600 mt-1 text-sm">심방세동 환자를 위한 일상 기록, 복용 확인, 경고 알림, 데이터 내보내기</p>
          </div>
          <Tabs tabs={["오늘 체크", "기록 보기", "그래프", "교육"]} value={tab} onChange={setTab} />
        </header>

        {tab === "오늘 체크" && (
          <div className="grid md:grid-cols-2 gap-6">
            <SectionCard title="기본 정보">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>날짜</Label>
                  <TextInput type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
                </div>
                <div>
                  <Label>맥박(분당)</Label>
                  <TextInput inputMode="numeric" placeholder="예: 72" value={entry.pulse} onChange={(e)=>updateEntry({ pulse: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>수축기(mmHg)</Label>
                    <TextInput inputMode="numeric" placeholder="예: 120" value={entry.bpSys} onChange={(e)=>updateEntry({ bpSys: e.target.value })} />
                  </div>
                  <div>
                    <Label>이완기(mmHg)</Label>
                    <TextInput inputMode="numeric" placeholder="예: 80" value={entry.bpDia} onChange={(e)=>updateEntry({ bpDia: e.target.value })} />
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <Toggle label="어지럼증" checked={entry.dizziness} onChange={(v)=>updateEntry({ dizziness: v })} />
                  <Toggle label="실신/실신감" checked={entry.syncope} onChange={(v)=>updateEntry({ syncope: v })} />
                  <Toggle label="호흡 곤란" checked={entry.dyspnea} onChange={(v)=>updateEntry({ dyspnea: v })} />
                  <Toggle label="부종(발/다리)" checked={entry.edema} onChange={(v)=>updateEntry({ edema: v })} />
                  <Toggle label="출혈/멍" checked={entry.bleeding} onChange={(v)=>updateEntry({ bleeding: v })} />
                </div>
                <div className="col-span-2">
                  <Label>피로감</Label>
                  <select
                    className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    value={entry.fatigue}
                    onChange={(e)=>updateEntry({ fatigue: e.target.value })}
                  >
                    <option value="0">없음</option>
                    <option value="1">약간</option>
                    <option value="2">심함</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>메모</Label>
                  <textarea className="w-full rounded-xl border border-gray-300 px-3 py-2 min-h-[80px]" placeholder="특이사항을 적어주세요" value={entry.notes} onChange={(e)=>updateEntry({ notes: e.target.value })} />
                </div>
              </div>
            </SectionCard>

            <div className="space-y-4">
              {dangerFlags.length > 0 && (
                <Alert type="danger" title="즉시 확인이 필요한 항목">
                  <ul className="list-disc ml-4">
                    {dangerFlags.map((f, i) => (<li key={i}>{f}</li>))}
                  </ul>
                  <div className="mt-2 text-xs text-red-700">증상이 지속되거나 악화되면 즉시 의료기관에 연락하세요.</div>
                </Alert>
              )}
              {warnFlags.length > 0 && dangerFlags.length === 0 && (
                <Alert type="warn" title="주의가 필요한 항목">
                  <ul className="list-disc ml-4">
                    {warnFlags.map((f, i) => (<li key={i}>{f}</li>))}
                  </ul>
                </Alert>
              )}

              <SectionCard title="약 복용 확인" right={<Pill>아침/저녁</Pill>}>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-2">아침</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Toggle label="멀택 (Dronedarone)" checked={entry.meds.am.multaq} onChange={(v)=>updateEntry({ meds: { ...entry.meds, am: { ...entry.meds.am, multaq: v } } })} />
                      <Toggle label="릭시아나 (Edoxaban)" checked={entry.meds.am.edoxaban} onChange={(v)=>updateEntry({ meds: { ...entry.meds, am: { ...entry.meds.am, edoxaban: v } } })} />
                      <Toggle label="콩브렐 (Bisoprolol)" checked={entry.meds.am.bisoprolol} onChange={(v)=>updateEntry({ meds: { ...entry.meds, am: { ...entry.meds.am, bisoprolol: v } } })} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">저녁</div>
                    <Toggle label="멀택 (Dronedarone)" checked={entry.meds.pm.multaq} onChange={(v)=>updateEntry({ meds: { ...entry.meds, pm: { ...entry.meds.pm, multaq: v } } })} />
                  </div>
                </div>
              </SectionCard>

              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-2xl bg-gray-900 text-white" onClick={exportCSV}>CSV 내보내기</button>
                <button className="px-4 py-2 rounded-2xl bg-gray-100" onClick={fillDemo}>샘플데이터 채우기</button>
                <button className="px-4 py-2 rounded-2xl bg-gray-100" onClick={resetToday}>오늘 기록 초기화</button>
              </div>
            </div>
          </div>
        )}

        {tab === "기록 보기" && (
          <div className="space-y-4">
            <SectionCard title="날짜 선택">
              <div className="flex flex-wrap items-center gap-3">
                <TextInput type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{maxWidth: 200}} />
                <Pill>총 {Object.keys(entries).length}일 기록</Pill>
              </div>
            </SectionCard>

            <SectionCard title="선택일 기록 상세">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><div className="text-gray-500">맥박</div><div className="font-semibold">{entry.pulse || "-"} bpm</div></div>
                <div><div className="text-gray-500">혈압</div><div className="font-semibold">{entry.bpSys && entry.bpDia ? `${entry.bpSys}/${entry.bpDia}` : "-"} mmHg</div></div>
                <div><div className="text-gray-500">피로감</div><div className="font-semibold">{entry.fatigue === "2" ? "심함" : entry.fatigue === "1" ? "약간" : "없음"}</div></div>
                <div><div className="text-gray-500">출혈</div><div className="font-semibold">{entry.bleeding ? "있음" : "없음"}</div></div>
              </div>
              <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{entry.notes || "메모 없음"}</div>
            </SectionCard>

            <SectionCard title="이력 목록 (최근→과거)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">날짜</th>
                      <th className="py-2 pr-4">맥박</th>
                      <th className="py-2 pr-4">혈압</th>
                      <th className="py-2 pr-4">증상</th>
                      <th className="py-2 pr-4">약 복용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(entries)
                      .sort((a,b)=>b.date.localeCompare(a.date))
                      .map((e)=>{
                        const medsAm = e.meds?.am || {};
                        const medsPm = e.meds?.pm || {};
                        const medsTxt = [
                          medsAm.multaq ? "아침 멀택" : null,
                          medsAm.edoxaban ? "아침 릭시아나" : null,
                          medsAm.bisoprolol ? "아침 콩브렐" : null,
                          medsPm.multaq ? "저녁 멀택" : null
                        ].filter(Boolean).join(", ");
                        const sx = [
                          e.dizziness && "어지럼",
                          e.syncope && "실신",
                          e.dyspnea && "호흡곤란",
                          e.edema && "부종",
                          e.bleeding && "출혈"
                        ].filter(Boolean).join(" · ");
                        return (
                          <tr key={e.date} className="border-b">
                            <td className="py-2 pr-4">{e.date}</td>
                            <td className="py-2 pr-4">{e.pulse || "-"}</td>
                            <td className="py-2 pr-4">{e.bpSys && e.bpDia ? `${e.bpSys}/${e.bpDia}` : "-"}</td>
                            <td className="py-2 pr-4">{sx || "-"}</td>
                            <td className="py-2 pr-4">{medsTxt || "-"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-2xl bg-gray-900 text-white" onClick={exportCSV}>CSV 내보내기</button>
              <button className="px-4 py-2 rounded-2xl bg-gray-100" onClick={fillDemo}>샘플데이터 채우기</button>
            </div>
          </div>
        )}

        {tab === "그래프" && (
          <div className="grid md:grid-cols-2 gap-6">
            <SectionCard title="맥박 추이 (최근 기록)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daysData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[40, 140]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="pulse" name="맥박" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="혈압 추이 (최근 기록)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daysData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[50, 180]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="sys" name="수축기" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="dia" name="이완기" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        )}

        {tab === "교육" && (
          <div className="grid md:grid-cols-2 gap-6">
            <SectionCard title="복용·기록 수칙">
              <ul className="list-disc ml-5 text-sm space-y-2">
                <li>아침 식사 중: 멀택, 릭시아나, 콩브렐 / 저녁 식사 중: 멀택</li>
                <li>복용 누락 시 임의로 2배 복용하지 말고, 다음 복용 시간에 평소대로 복용</li>
                <li>혈압·맥박은 같은 시간대, 같은 팔로 측정하여 기록</li>
                <li>잇몸 출혈·멍이 잦거나 소변/대변에 피가 보이면 기록 후 병원 상담</li>
                <li>자몽주스·과도한 음주를 피하고, 새로운 약을 추가할 때는 의사와 상의</li>
              </ul>
            </SectionCard>

            <SectionCard title="위험 신호 (즉시 상담)">
              <ul className="list-disc ml-5 text-sm space-y-2">
                <li>맥박 40회 미만 또는 110회 초과가 반복</li>
                <li>혈압 90/60mmHg 미만 + 어지럼/실신감</li>
                <li>멎지 않는 출혈, 대량 코피, 검은 변/선홍빛 소변</li>
                <li>갑작스러운 말 어눌함, 한쪽 마비, 시야 이상</li>
              </ul>
            </SectionCard>

            <SectionCard title="데이터 관리 팁">
              <ul className="list-disc ml-5 text-sm space-y-2">
                <li>진료 전 CSV 파일로 내보내 병원에 제출하면 평가가 수월합니다.</li>
                <li>주당 150분 걷기, 저염식(나트륨 2g/일 이하) 유지</li>
                <li>카페인·에너지음료 과다 섭취를 피하고 수면 위생을 지키세요.</li>
              </ul>
            </SectionCard>

            <Alert type="info" title="중요 고지">
              이 앱은 생활기록 보조 도구이며, 의료행위를 대체하지 않습니다. 이상 소견이 있으면 반드시 의료진과 상담하세요.
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}


// --- PWA ASSETS & SETUP (추가) ---
// 아래 파일들을 프로젝트 루트에 생성하세요.

/*
📁 프로젝트 구조 예시
.
├─ public/
│  ├─ manifest.webmanifest
│  ├─ sw.js
│  └─ icons/
│     ├─ icon-192.png
│     ├─ icon-512.png
│     └─ maskable-512.png
├─ index.html
├─ src/
│  ├─ main.jsx (서비스워커 등록 코드 포함)
│  └─ App.jsx (현재 AFibCareApp)
└─ package.json
*/

// 1) public/manifest.webmanifest
// PWA 메타정보 — 앱 이름/아이콘/시작 URL/화면모드 등
export const manifest_webmanifest = `{
  "name": "AFib Care — 생활기록",
  "short_name": "AFibCare",
  "lang": "ko",
  "start_url": "/index.html",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#111827",
  "description": "심방세동 환자를 위한 생활기록/복용 체크 PWA",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}`;

// 2) public/sw.js — 간단한 캐시 전략(Service Worker)
export const sw_js = `const CACHE = 'afibcare-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // 빌드산출물 경로를 프로젝트에 맞게 추가하세요 (예: /assets/*.js, *.css)
];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE && caches.delete(k))))
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});`;

// 3) index.html — manifest 링크 & 기본 메타
export const index_html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#111827" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>AFib Care — 생활기록</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

// 4) src/main.jsx — React 마운트 + 서비스워커 등록
export const main_jsx = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// PWA 서비스워커 등록 (HTTPS 환경에서 동작)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch((err) => console.error('SW registration failed', err));
  });
}
`;

// 5) 배포 & 설치 가이드 (요약)
/*
① 아이콘 3개 준비 (PNG):
   - /public/icons/icon-192.png (192x192)
   - /public/icons/icon-512.png (512x512)
   - /public/icons/maskable-512.png (512x512, safe zone 고려)

② 로컬 테스트(예: Vite):
   npm create vite@latest afibcare -- --template react
   cd afibcare && npm i && npm i recharts
   public/ 폴더에 manifest.webmanifest, sw.js, icons/ 추가
   src/ 에 App.jsx(=AFibCareApp), main.jsx 반영
   npm run dev → https://localhost:5173 (HTTPS 권장)

③ 배포: Vercel/Netlify/GitHub Pages 등 HTTPS 지원 호스팅 사용
   빌드 후 정적 파일 업로드 (예: Vite: npm run build → dist/)

④ 갤럭시(크롬)에서 배포 URL 접속 → 브라우저 메뉴에서
   "홈 화면에 추가" 또는 하단 설치 배너(조건 충족 시)로 설치

⑤ 설치 요건 체크
   - HTTPS로 제공
   - manifest.link 태그와 유효한 아이콘
   - Service Worker 정상 등록

Tip) 푸시 알림/백그라운드 동기화는 추후 Firebase Cloud Messaging(FCM) 연동으로 확장 가능합니다.
*/
