import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import BracketView from '../../components/BracketTree.jsx';
import { fmtDateTime } from '../../lib/format.js';

export default function PlayoffResultsTab() {
  const [rounds, setRounds] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState('r32');

  useEffect(() => {
    api.results.playoff().then((res) => {
      setRounds(res);
      setLastSyncAt(res.lastSyncAt);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="center muted">Načítavam pavúk…</div>;

  return (
    <div>
      <p className="muted">
        Reálny pavúk play-off, dopĺňa sa automaticky po skončení skupinovej fázy a počas
        vyraďovacích kôl.
        {lastSyncAt && ` Posledná synchronizácia: ${fmtDateTime(lastSyncAt)}`}
      </p>
      <BracketView
        rounds={rounds}
        locked
        activeRound={activeRound}
        onActiveRoundChange={setActiveRound}
        showScores
      />
    </div>
  );
}
