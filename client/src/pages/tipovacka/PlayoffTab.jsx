import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { flag, teamCode } from '../../lib/format.js';

const ROUND_DEFS = [
  { key: 'r32', label: 'R32 - šestnásťfinále', tab: 'R32' },
  { key: 'r16', label: 'R16 - osemfinále', tab: 'R16' },
  { key: 'qf', label: 'Štvrťfinále', tab: 'QF' },
  { key: 'sf', label: 'Semifinále', tab: 'SF' },
];
const FINAL_DEF = { key: 'final', label: 'Finále', tab: 'Finále' };
const ALL_TABS = [...ROUND_DEFS, FINAL_DEF];

function toPairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

function normalize(arr, size) {
  const out = Array(size).fill(null);
  for (let i = 0; i < Math.min(size, arr?.length || 0); i++) out[i] = arr[i] || null;
  return out;
}

// Derives each round's pairs from the previous round's (sanitized) winners,
// and drops any stored winner that's no longer part of its pair.
function deriveBracketState(bracket, raw) {
  const out = {};

  const r32 = raw.r32Winners.map((w, i) => (bracket[i]?.includes(w) ? w : null));
  out.r32 = { pairs: bracket, winners: r32 };

  const r16Pairs = r32.every((w) => w != null) ? toPairs(r32) : null;
  const r16 = raw.r16Winners.map((w, i) => (r16Pairs?.[i]?.includes(w) ? w : null));
  out.r16 = { pairs: r16Pairs, winners: r16 };

  const qfPairs = r16Pairs && r16.every((w) => w != null) ? toPairs(r16) : null;
  const qf = raw.qfWinners.map((w, i) => (qfPairs?.[i]?.includes(w) ? w : null));
  out.qf = { pairs: qfPairs, winners: qf };

  const sfPairs = qfPairs && qf.every((w) => w != null) ? toPairs(qf) : null;
  const sf = raw.sfWinners.map((w, i) => (sfPairs?.[i]?.includes(w) ? w : null));
  out.sf = { pairs: sfPairs, winners: sf };

  const finalPairs = sfPairs && sf.every((w) => w != null) ? toPairs(sf) : null;
  const champion = finalPairs && finalPairs[0].includes(raw.champion) ? raw.champion : null;
  out.final = { pairs: finalPairs, winner: champion };

  return out;
}

function TeamButton({ team, selected, disabled, onClick }) {
  return (
    <button className={`bracket-team ${selected ? 'selected' : ''}`} disabled={disabled} onClick={onClick}>
      <span className="flag">{flag(team)}</span>
      <span className="team-name">
        <span className="cc-full">{team}</span>
        <span className="cc-short">{teamCode(team)}</span>
      </span>
    </button>
  );
}

function PlaceholderCard() {
  return (
    <div className="bracket-pair bt-placeholder">
      <div className="bracket-team placeholder">
        <span className="flag">❔</span>
        <span className="team-name">?</span>
      </div>
      <div className="bracket-team placeholder">
        <span className="flag">❔</span>
        <span className="team-name">?</span>
      </div>
    </div>
  );
}

function MatchCard({ pair, winner, disabled, onPick }) {
  if (!pair) return <PlaceholderCard />;
  return (
    <div className="bracket-pair">
      {pair.map((team) => (
        <TeamButton key={team} team={team} selected={winner === team} disabled={disabled} onClick={() => onPick(team)} />
      ))}
    </div>
  );
}

// One column of the desktop bracket tree. Non-final rounds render their
// matches grouped into pairs (`.bt-pair`) so each pair can grow/shrink
// together with CSS, which is what keeps the connector lines aligned with
// the midpoint of the two matches feeding the next round.
function TreeRound({ label, roundKey, pairs, winners, count, locked, onPick, isFinal, isFirst }) {
  const roundClass = `bt-round ${isFirst ? 'bt-r32' : ''}`;

  if (isFinal) {
    const pair = pairs ? pairs[0] : null;
    return (
      <div className={roundClass}>
        <h4>{label}</h4>
        <div className="bt-match-wrap">
          <MatchCard pair={pair} winner={winners} disabled={locked} onPick={onPick} />
        </div>
      </div>
    );
  }

  const groups = pairs ? toPairs(pairs) : Array(count / 2).fill(null);

  return (
    <div className={roundClass}>
      <h4>{label}</h4>
      {groups.map((group, gi) => (
        <div className="bt-pair" key={gi}>
          {[0, 1].map((j) => {
            const i = gi * 2 + j;
            const pair = group ? group[j] : null;
            return (
              <div className="bt-match-wrap" key={j}>
                <MatchCard pair={pair} winner={winners[i]} disabled={locked} onPick={(team) => onPick(roundKey, i, team)} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function PlayoffTab({ onGoToGroups }) {
  const [loading, setLoading] = useState(true);
  const [bracket, setBracket] = useState(null);
  const [r32Winners, setR32Winners] = useState(Array(16).fill(null));
  const [r16Winners, setR16Winners] = useState(Array(8).fill(null));
  const [qfWinners, setQfWinners] = useState(Array(4).fill(null));
  const [sfWinners, setSfWinners] = useState(Array(2).fill(null));
  const [champion, setChampion] = useState(null);
  const [points, setPoints] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');
  const [activeRound, setActiveRound] = useState('r32');

  useEffect(() => {
    api.myPlayoffPrediction().then((mine) => {
      setBracket(mine.bracket);
      setR32Winners(normalize(mine.r32Winners, 16));
      setR16Winners(normalize(mine.r16Winners, 8));
      setQfWinners(normalize(mine.qfWinners, 4));
      setSfWinners(normalize(mine.sfWinners, 2));
      setChampion(mine.champion || null);
      setPoints(mine.points);
      setBreakdown(mine.breakdown);
      setLocked(mine.locked);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="center muted">Načítavam playoff…</div>;

  if (!bracket) {
    return (
      <div className="center">
        <p>
          Najprv dokonči tipovanie v sekcii Skupiny — zoraď všetky skupiny a vyber presne 8 tímov
          na 3. mieste, ktoré postúpia.
        </p>
        <button className="btn" onClick={onGoToGroups}>Prejsť na Skupiny</button>
      </div>
    );
  }

  const derived = deriveBracketState(bracket, { r32Winners, r16Winners, qfWinners, sfWinners, champion });
  const setters = { r32: setR32Winners, r16: setR16Winners, qf: setQfWinners, sf: setSfWinners };
  const ready = derived.final.winner != null;

  function pick(roundKey, idx, team) {
    if (locked) return;
    setters[roundKey]((prev) => {
      const next = [...prev];
      next[idx] = team;
      return next;
    });
  }

  function pickChampion(team) {
    if (locked) return;
    setChampion(team);
  }

  async function save() {
    setError('');
    setSaving(true);
    try {
      const res = await api.savePlayoffPrediction({
        r32Winners: derived.r32.winners,
        r16Winners: derived.r16.winners,
        qfWinners: derived.qf.winners,
        sfWinners: derived.sf.winners,
        champion: derived.final.winner,
      });
      setBracket(res.bracket);
      setR32Winners(normalize(res.r32Winners, 16));
      setR16Winners(normalize(res.r16Winners, 8));
      setQfWinners(normalize(res.qfWinners, 4));
      setSfWinners(normalize(res.sfWinners, 2));
      setChampion(res.champion || null);
      setPoints(res.points);
      setBreakdown(res.breakdown);
      setLocked(res.locked);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      if (err.code === 'locked') setError('Tipovanie playoff je uzamknuté.');
      else if (err.code === 'groups_incomplete') setError('Najprv dokonči tipovanie skupín.');
      else setError('Uloženie zlyhalo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="muted">
        Tvoj pavúk je odvodený z tipov v sekcii Skupiny (12 víťazov skupín, 12 druhých a 8 vybraných
        tretích miest). Postupne vyber víťaza každého súboja. Body: +1 za trafenú dvojicu a +1 za
        trafeného víťaza v kolách R32-SF, +1 za trafených finalistov a +10 za trafeného šampióna.
      </p>

      {points != null && breakdown && (
        <div className="card playoff-points-summary">
          <strong>Body za playoff: {points} b</strong>
          <div className="playoff-breakdown">
            <span className="muted">R32: {breakdown.r32.pairing + breakdown.r32.winner} b</span>
            <span className="muted">R16: {breakdown.r16.pairing + breakdown.r16.winner} b</span>
            <span className="muted">Štvrťfinále: {breakdown.qf.pairing + breakdown.qf.winner} b</span>
            <span className="muted">Semifinále: {breakdown.sf.pairing + breakdown.sf.winner} b</span>
            <span className="muted">Finále: {breakdown.final.pairing + breakdown.final.champion} b</span>
          </div>
        </div>
      )}

      {/* Mobile/tablet: round-tab navigation + one round at a time */}
      <div className="round-tabs">
        {ALL_TABS.map(({ key, tab }) => (
          <button key={key} className={activeRound === key ? 'active' : ''} onClick={() => setActiveRound(key)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bracket">
        {ROUND_DEFS.map(({ key, label }) => {
          const { pairs, winners } = derived[key];
          return (
            <div key={key} className={`bracket-round ${pairs ? '' : 'bracket-locked'} ${activeRound === key ? 'active' : ''}`}>
              <h3>{label}</h3>
              {!pairs && (
                <p className="muted small">Najprv doplň všetkých víťazov v predchádzajúcom kole.</p>
              )}
              {pairs && (
                <div className="bracket-pairs">
                  {pairs.map((pair, i) => (
                    <div key={i} className="bracket-pair">
                      {pair.map((team) => (
                        <TeamButton
                          key={team}
                          team={team}
                          selected={winners[i] === team}
                          disabled={locked}
                          onClick={() => pick(key, i, team)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className={`bracket-round ${derived.final.pairs ? '' : 'bracket-locked'} ${activeRound === 'final' ? 'active' : ''}`}>
          <h3>Finále</h3>
          {!derived.final.pairs && (
            <p className="muted small">Najprv doplň oboch víťazov semifinále.</p>
          )}
          {derived.final.pairs && (
            <div className="bracket-pairs">
              <div className="bracket-pair">
                {derived.final.pairs[0].map((team) => (
                  <TeamButton
                    key={team}
                    team={team}
                    selected={derived.final.winner === team}
                    disabled={locked}
                    onClick={() => pickChampion(team)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: full bracket tree, all rounds side by side */}
      <div className="bracket-tree">
        {ROUND_DEFS.map(({ key, label, tab }, idx) => {
          const { pairs, winners } = derived[key];
          const counts = { r32: 16, r16: 8, qf: 4, sf: 2 };
          return (
            <TreeRound
              key={key}
              label={tab}
              roundKey={key}
              pairs={pairs}
              winners={winners}
              count={counts[key]}
              locked={locked}
              onPick={pick}
              isFirst={idx === 0}
            />
          );
        })}
        <TreeRound
          label={FINAL_DEF.tab}
          pairs={derived.final.pairs}
          winners={derived.final.winner}
          count={1}
          locked={locked}
          onPick={pickChampion}
          isFinal
        />
      </div>

      {locked ? (
        <div className="muted">🔒 Tipovanie playoff je uzamknuté.</div>
      ) : (
        <div className="save-row">
          <button className="btn" onClick={save} disabled={saving || !ready}>
            {saving ? 'Ukladám…' : 'Uložiť tipy'}
          </button>
          {!ready && <span className="muted">Najprv vyber šampióna.</span>}
          {savedFlash && <span className="ok">✓ uložené</span>}
          {error && <span className="error small">{error}</span>}
        </div>
      )}
    </div>
  );
}
