import { useState } from 'react';
import TablesTab from './vysledky/TablesTab.jsx';
import PlayoffResultsTab from './vysledky/PlayoffResultsTab.jsx';
import MatchesScheduleTab from './vysledky/MatchesScheduleTab.jsx';

export default function Vysledky() {
  const [tab, setTab] = useState('tables');

  return (
    <div className="page page-wide">
      <div className="tabs">
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>
          Tabuľky
        </button>
        <button className={tab === 'playoff' ? 'active' : ''} onClick={() => setTab('playoff')}>
          PlayOff
        </button>
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>
          Zápasy
        </button>
      </div>

      {tab === 'tables' && <TablesTab />}
      {tab === 'playoff' && <PlayoffResultsTab />}
      {tab === 'matches' && <MatchesScheduleTab />}
    </div>
  );
}
