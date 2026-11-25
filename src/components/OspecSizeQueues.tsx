type Row = { lane: string; state: string; count: number };
export default function OspecSizeQueues({ data, isRu }: { data?: { counts?: Row[] }; isRu: boolean }) {
  if (!data?.counts) return <div className="w-full rounded-xl border border-amber-500/40 p-3" aria-label="OSPEC size queues"><h4 className="font-semibold">{isRu ? 'Очереди анализа · 60% / 25% / 15%' : 'Analysis queues · 60% / 25% / 15%'}</h4><p className="text-muted-foreground">{isRu ? 'Счётчики очередей не получены. Обновите статус; значения не подставляются.' : 'Queue counts unavailable. Refresh status; no values are assumed.'}</p></div>;
  const lanes = [
    { key: 'fast', title: isRu ? 'Быстрые' : 'Fast', range: '≤300', weight: 60, color: 'border-emerald-500/40' },
    { key: 'medium', title: isRu ? 'Средние' : 'Medium', range: '301–700', weight: 25, color: 'border-amber-500/40' },
    { key: 'heavy', title: isRu ? 'Тяжёлые' : 'Heavy', range: '≥701', weight: 15, color: 'border-violet-500/40' },
  ];
  const sum = (lane: string, states: string[]) => data.counts!.filter(row => row.lane === lane && states.includes(row.state)).reduce((total, row) => total + row.count, 0);
  return <div className="w-full rounded-xl border border-border p-3" aria-label="OSPEC size queues">
    <h4 className="mb-2 font-semibold">{isRu ? 'Очереди анализа' : 'Analysis queues'}</h4>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{lanes.map(lane => <div key={lane.key} className={`rounded-lg border p-2 ${lane.color}`}>
      <div className="flex justify-between font-semibold"><span>{lane.title}</span><span>{lane.weight}%</span></div>
      <div className="text-muted-foreground">{lane.range} {isRu ? 'файлов' : 'files'}</div>
      <div>{isRu ? 'Ожидают' : 'Waiting'}: {sum(lane.key, ['pending']).toLocaleString()}</div>
      <div>{isRu ? 'В обработке' : 'Processing'}: {sum(lane.key, ['running']).toLocaleString()} · {isRu ? 'Повтор' : 'Retry'}: {sum(lane.key, ['retry']).toLocaleString()}</div>
    </div>)}</div>
    <p className="mt-2 text-muted-foreground">{isRu ? 'Ещё не классифицированы' : 'Not yet classified'}: {sum('unknown', ['pending','retry','running']).toLocaleString()}</p>
  </div>;
}
