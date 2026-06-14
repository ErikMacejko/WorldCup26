import { useState } from 'react';
import MatchesTab from './tipovacka/MatchesTab.jsx';
import GroupsTab from './tipovacka/GroupsTab.jsx';
import PlayoffTab from './tipovacka/PlayoffTab.jsx';

export default function Tipovacka() {
  const [tab, setTab] = useState('matches');

  return (
    <div className="page">
      <div className="tabs">
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>
          Zápasy
        </button>
        <button className={tab === 'groups' ? 'active' : ''} onClick={() => setTab('groups')}>
          Skupiny
        </button>
        <button className={tab === 'playoff' ? 'active' : ''} onClick={() => setTab('playoff')}>
          Playoff
        </button>
      </div>

      {tab === 'matches' && <MatchesTab />}
      {tab === 'groups' && <GroupsTab />}
      {tab === 'playoff' && <PlayoffTab onGoToGroups={() => setTab('groups')} />}
    </div>
  );
}
