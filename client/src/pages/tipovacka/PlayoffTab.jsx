import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import BracketView, { deriveBracketState } from '../../components/BracketTree.jsx';

function normalize(arr, size) {
  const out = Array(size).fill(null);
  for (let i = 0; i < Math.min(size, arr?.length || 0); i++) out[i] = arr[i] || null;
  return out;
}

export default function PlayoffTab({ onGoToGroups }) {
  const [loading, setLoading] = useState(true);
  const [bracket, setBracket] = useState(null);
  const [thirdPicks, setThirdPicks] = useState(Array(16).fill(null));
  const [thirdOptions, setThirdOptions] = useState({});
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
      setThirdPicks(normalize(mine.thirdPicks, 16));
      setThirdOptions(mine.thirdOptions || {});
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

  // Map each predicted "best 3rd place" letter to its team name, and resolve
  // the R32 wildcard slots using the player's current thirdPicks.
  const letterToTeam = {};
  for (const opts of Object.values(thirdOptions)) {
    for (const { letter, team } of opts) letterToTeam[letter] = team;
  }
  const usedLetters = new Set(thirdPicks.filter(Boolean));
  const resolvedBracket = bracket.map((pair, i) => {
    if (!thirdOptions[i]) return pair;
    const letter = thirdPicks[i];
    return [pair[0], letter ? letterToTeam[letter] ?? null : null];
  });

  const thirdPickers = {};
  for (const key of Object.keys(thirdOptions)) {
    const i = Number(key);
    const current = thirdPicks[i];
    thirdPickers[i] = {
      value: current || '',
      options: thirdOptions[i].filter((o) => o.letter === current || !usedLetters.has(o.letter)),
      onChange: (letter) => pickThird(i, letter),
    };
  }

  const derived = deriveBracketState(resolvedBracket, { r32Winners, r16Winners, qfWinners, sfWinners, champion });
  derived.r32.thirdPickers = thirdPickers;
  const setters = { r32: setR32Winners, r16: setR16Winners, qf: setQfWinners, sf: setSfWinners };
  const ready = derived.final.winner != null;

  function pickThird(idx, letter) {
    if (locked) return;
    setThirdPicks((prev) => {
      const next = [...prev];
      next[idx] = letter || null;
      return next;
    });
  }

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
        thirdPicks,
        r32Winners: derived.r32.winners,
        r16Winners: derived.r16.winners,
        qfWinners: derived.qf.winners,
        sfWinners: derived.sf.winners,
        champion: derived.final.winner,
      });
      setBracket(res.bracket);
      setThirdPicks(normalize(res.thirdPicks, 16));
      setThirdOptions(res.thirdOptions || {});
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
      else if (err.code === 'invalid_third_picks') setError('Priraď všetkých 8 tretích miest na voľné sloty v R32.');
      else setError('Uloženie zlyhalo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="muted">
        Tvoj pavúk vychádza z tipov v sekcii Skupiny (12 víťazov skupín, 12 druhých miest a 8
        vybraných tretích miest). Najprv v R32 vyber pre každý voľný slot jedno z tvojich tipovaných
        tretích miest — poradie zápasov v reálnom pavúku určuje FIFA podľa kombinácie postupujúcich
        tretích, takže si môžeš pomôcť napríklad na play.fifa.com. Potom postupne vyber víťaza
        každého súboja. Body: v R16/štvrťfinále/semifinále získaš +1 b za každý tím, ktorý si tipol
        do daného kola a ktorý sa tam reálne dostal, plus +1 b za každú dvojicu súperov, ktorá sa
        reálne stretla. Vo finále +1 b za každého trafeného finalistu a +10 b za trafeného šampióna.
      </p>

      {points != null && breakdown && (
        <div className="card playoff-points-summary">
          <strong>Body za playoff: {points} b</strong>
          <div className="playoff-breakdown">
            <span className="muted">R16: {breakdown.r16.team + breakdown.r16.pairing} b</span>
            <span className="muted">Štvrťfinále: {breakdown.qf.team + breakdown.qf.pairing} b</span>
            <span className="muted">Semifinále: {breakdown.sf.team + breakdown.sf.pairing} b</span>
            <span className="muted">Finále: {breakdown.final.team + breakdown.final.champion} b</span>
          </div>
        </div>
      )}

      <BracketView
        rounds={derived}
        locked={locked}
        onPick={pick}
        onPickChampion={pickChampion}
        activeRound={activeRound}
        onActiveRoundChange={setActiveRound}
      />

      {locked ? (
        <div className="muted">🔒 Tipovanie playoff je uzamknuté.</div>
      ) : (
        <div className="save-row">
          <button className="btn" onClick={save} disabled={saving || !ready}>
            {saving ? 'Ukladám…' : 'Uložiť tipy'}
          </button>
          {!ready && <span className="muted">Najprv priraď tretie miesta v R32 a vyber šampióna.</span>}
          {savedFlash && <span className="ok">✓ uložené</span>}
          {error && <span className="error small">{error}</span>}
        </div>
      )}
    </div>
  );
}
