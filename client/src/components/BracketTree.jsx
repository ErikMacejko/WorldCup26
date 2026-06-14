import { flag, teamCode } from '../lib/format.js';

export const ROUND_DEFS = [
  { key: 'r32', label: 'R32 - šestnásťfinále', tab: 'R32' },
  { key: 'r16', label: 'R16 - osemfinále', tab: 'R16' },
  { key: 'qf', label: 'Štvrťfinále', tab: 'QF' },
  { key: 'sf', label: 'Semifinále', tab: 'SF' },
];
export const FINAL_DEF = { key: 'final', label: 'Finále', tab: 'Finále' };
export const ALL_TABS = [...ROUND_DEFS, FINAL_DEF];

export function toPairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

// A team slot: a clickable button when `onClick` is given (prediction
// bracket), or a read-only div otherwise (real-results bracket). Both use
// the same `.bracket-team`/`.selected`/`.placeholder` styles.
function TeamRow({ team, selected, disabled, onClick, score }) {
  const content = (
    <>
      <span className="flag">{flag(team)}</span>
      <span className="team-name">
        <span className="cc-full">{team}</span>
        <span className="cc-short">{teamCode(team)}</span>
      </span>
      {score != null && <span className="bt-score">{score}</span>}
    </>
  );
  const className = `bracket-team ${selected ? 'selected' : ''}`;
  if (onClick) {
    return (
      <button className={className} disabled={disabled} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

export function PlaceholderCard() {
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

function MatchCard({ pair, winner, disabled, onPick, scores }) {
  if (!pair) return <PlaceholderCard />;
  return (
    <div className="bracket-pair">
      {pair.map((team, idx) => (
        <TeamRow
          key={team}
          team={team}
          selected={winner === team}
          disabled={disabled}
          onClick={onPick ? () => onPick(team) : undefined}
          score={scores ? scores[idx] : null}
        />
      ))}
    </div>
  );
}

// One column of the desktop bracket tree. Non-final rounds render their
// matches grouped into pairs (`.bt-pair`) so each pair can grow/shrink
// together with CSS, which is what keeps the connector lines aligned with
// the midpoint of the two matches feeding the next round.
export function TreeRound({ label, roundKey, pairs, winners, scores, count, locked, onPick, isFinal, isFirst }) {
  const roundClass = `bt-round ${isFirst ? 'bt-r32' : ''}`;

  if (isFinal) {
    const pair = pairs ? pairs[0] : null;
    return (
      <div className={roundClass}>
        <h4>{label}</h4>
        <div className="bt-match-wrap">
          <MatchCard pair={pair} winner={winners} disabled={locked} onPick={onPick} scores={scores ? scores[0] : null} />
        </div>
      </div>
    );
  }

  const groups = pairs ? toPairs(pairs) : Array(count / 2).fill(null);
  const scoreGroups = scores ? toPairs(scores) : null;

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
                <MatchCard
                  pair={pair}
                  winner={winners[i]}
                  disabled={locked}
                  onPick={onPick ? (team) => onPick(roundKey, i, team) : undefined}
                  scores={scoreGroups ? scoreGroups[gi]?.[j] : null}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// rounds = { r32: {pairs, winners, scores?}, r16: {...}, qf: {...}, sf: {...}, final: {pairs, winner, scores?} }
export default function BracketView({ rounds, locked, onPick, onPickChampion, activeRound, onActiveRoundChange, showScores }) {
  return (
    <>
      {/* Mobile/tablet: round-tab navigation + one round at a time */}
      <div className="round-tabs">
        {ALL_TABS.map(({ key, tab }) => (
          <button key={key} className={activeRound === key ? 'active' : ''} onClick={() => onActiveRoundChange(key)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bracket">
        {ROUND_DEFS.map(({ key, label }) => {
          const { pairs, winners, scores } = rounds[key];
          return (
            <div key={key} className={`bracket-round ${pairs ? '' : 'bracket-locked'} ${activeRound === key ? 'active' : ''}`}>
              <h3>{label}</h3>
              {!pairs && (
                <p className="muted small">Najprv doplň všetkých víťazov v predchádzajúcom kole.</p>
              )}
              {pairs && (
                <div className="bracket-pairs">
                  {pairs.map((pair, i) => (
                    <MatchCard
                      key={i}
                      pair={pair}
                      winner={winners[i]}
                      disabled={locked}
                      onPick={onPick ? (team) => onPick(key, i, team) : undefined}
                      scores={showScores ? scores?.[i] : null}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className={`bracket-round ${rounds.final.pairs ? '' : 'bracket-locked'} ${activeRound === 'final' ? 'active' : ''}`}>
          <h3>{FINAL_DEF.label}</h3>
          {!rounds.final.pairs && (
            <p className="muted small">Najprv doplň oboch víťazov semifinále.</p>
          )}
          {rounds.final.pairs && (
            <div className="bracket-pairs">
              <MatchCard
                pair={rounds.final.pairs[0]}
                winner={rounds.final.winner}
                disabled={locked}
                onPick={onPickChampion}
                scores={showScores ? rounds.final.scores?.[0] : null}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop: full bracket tree, all rounds side by side */}
      <div className="bracket-tree">
        {ROUND_DEFS.map(({ key, label, tab }, idx) => {
          const { pairs, winners, scores } = rounds[key];
          const counts = { r32: 16, r16: 8, qf: 4, sf: 2 };
          return (
            <TreeRound
              key={key}
              label={tab}
              roundKey={key}
              pairs={pairs}
              winners={winners}
              scores={showScores ? scores : null}
              count={counts[key]}
              locked={locked}
              onPick={onPick}
              isFirst={idx === 0}
            />
          );
        })}
        <TreeRound
          label={FINAL_DEF.tab}
          pairs={rounds.final.pairs}
          winners={rounds.final.winner}
          scores={showScores ? rounds.final.scores : null}
          count={1}
          locked={locked}
          onPick={onPickChampion}
          isFinal
        />
      </div>
    </>
  );
}
