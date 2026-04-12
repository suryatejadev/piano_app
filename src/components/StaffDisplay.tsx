import React from 'react';
import type { Note } from '../types';
import { Clef, KeyMode } from '../types';
import { getStaffPosition } from '../utils/midiNoteMap';

// Key signature definitions: sharps/flats in standard order with staff positions
// Treble clef positions (0 = bottom line E4, each +1 = half a line spacing up)
// Sharp order: F C G D A E B | Flat order: B E A D G C F
const SHARP_KEYS: Record<string, number> = {
  'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
};
const FLAT_KEYS: Record<string, number> = {
  'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6, 'Cb': 7,
};
// Minor key → relative major mapping
const MINOR_TO_MAJOR: Record<string, string> = {
  'A': 'C', 'E': 'G', 'B': 'D', 'F#': 'A', 'C#': 'E', 'G#': 'B', 'D#': 'F#', 'A#': 'C#',
  'D': 'F', 'G': 'Bb', 'C': 'Eb', 'F': 'Ab', 'Bb': 'Db', 'Eb': 'Gb', 'Ab': 'Cb',
};

// Treble clef staff positions for sharps (F C G D A E B) — position from bottom line
const TREBLE_SHARP_POSITIONS = [8, 5, 9, 6, 3, 7, 4];
// Treble clef staff positions for flats (B E A D G C F)
const TREBLE_FLAT_POSITIONS = [4, 7, 3, 6, 2, 5, 1];
// Bass clef: shift down by 2 positions from treble
const BASS_SHARP_POSITIONS = TREBLE_SHARP_POSITIONS.map(p => p - 2);
const BASS_FLAT_POSITIONS = TREBLE_FLAT_POSITIONS.map(p => p - 2);

function getKeySignatureInfo(keyRoot: string, keyMode: KeyMode): { type: 'sharp' | 'flat' | 'none'; count: number } {
  const majorKey = keyMode === KeyMode.MINOR ? (MINOR_TO_MAJOR[keyRoot] || 'C') : keyRoot;
  if (majorKey === 'C') return { type: 'none', count: 0 };
  if (majorKey in SHARP_KEYS) return { type: 'sharp', count: SHARP_KEYS[majorKey] };
  if (majorKey in FLAT_KEYS) return { type: 'flat', count: FLAT_KEYS[majorKey] };
  return { type: 'none', count: 0 };
}

interface StaffDisplayProps {
  currentNote: Note | null;
  noteQueue: Note[];
  clef: Clef;
  showAnswer: boolean;
  feedbackMessage: string;
  lastPlayedNote: Note | null;
  showWrongNote: boolean;
  keyRoot: string;
  keyMode: KeyMode;
}

/**
 * Component to display music staff with note
 */
export const StaffDisplay: React.FC<StaffDisplayProps> = ({
  currentNote,
  noteQueue,
  clef,
  showAnswer,
  feedbackMessage,
  lastPlayedNote,
  showWrongNote,
  keyRoot,
  keyMode,
}) => {
  const isGrandStaff = clef === Clef.GRAND;
  const STAFF_WIDTH = 700;
  const STAFF_HEIGHT = isGrandStaff ? 460 : 320;
  const MARGIN = 40;
  const LINE_SPACING = 24;
  const STAFF_TOP = MARGIN + 40;
  const GRAND_STAFF_GAP = 88;

  // Calculate staff Y positions (top line is at STAFF_TOP)
  const staffLines = [0, 1, 2, 3, 4].map(i => STAFF_TOP + i * LINE_SPACING);
  const trebleStaffLines = [0, 1, 2, 3, 4].map(i => STAFF_TOP + i * LINE_SPACING);
  const bassStaffTop = STAFF_TOP + 4 * LINE_SPACING + GRAND_STAFF_GAP;
  const bassStaffLines = [0, 1, 2, 3, 4].map(i => bassStaffTop + i * LINE_SPACING);

  // Convert staff position to Y coordinate
  // Position 0 is bottom line, position 8 is top line.
  const positionToY = (position: number): number => {
    const lineYIndex = 4 - position / 2;
    return STAFF_TOP + lineYIndex * LINE_SPACING;
  };

  const renderClef = () => {
    const clefX = MARGIN + 30;

    switch (clef) {
      case Clef.TREBLE:
        return (
          <g key="treble-clef" className="text-gray-800">
            <text
              x={clefX}
              y={staffLines[3] + 8}
              fontSize="60"
              fontWeight="bold"
              fill="currentColor"
              textAnchor="middle"
            >
              𝄞
            </text>
          </g>
        );

      case Clef.BASS:
        return (
          <g key="bass-clef" className="text-gray-800">
            <text
              x={clefX}
              y={staffLines[1] + 22}
              fontSize="50"
              fontWeight="bold"
              fill="currentColor"
              textAnchor="middle"
            >
              𝄢
            </text>
          </g>
        );

      case Clef.GRAND:
        return (
          <g key="grand-clef" className="text-gray-800">
            <text
              x={clefX}
              y={trebleStaffLines[3] + 8}
              fontSize="60"
              fontWeight="bold"
              fill="currentColor"
              textAnchor="middle"
            >
              𝄞
            </text>
            <text
              x={clefX}
              y={bassStaffLines[1] + 22}
              fontSize="50"
              fontWeight="bold"
              fill="currentColor"
              textAnchor="middle"
            >
              𝄢
            </text>
          </g>
        );

      case Clef.ALTO:
        return (
          <g key="alto-clef" className="text-gray-800">
            <text
              x={clefX}
              y={staffLines[2] + 8}
              fontSize="50"
              fontWeight="bold"
              fill="currentColor"
              textAnchor="middle"
            >
              𝄡
            </text>
          </g>
        );
    }
  };

  const allNotes = currentNote ? [currentNote, ...noteQueue.slice(0, 10)] : noteQueue.slice(0, 10);

  // Key signature layout
  const keySigInfo = getKeySignatureInfo(keyRoot, keyMode);
  const keySigWidth = keySigInfo.count > 0 ? keySigInfo.count * 14 + 10 : 0;
  const NOTE_START_X = MARGIN + 90 + keySigWidth;
  const NOTE_SPACING = 52;

  const renderKeySignature = () => {
    if (keySigInfo.type === 'none' || keySigInfo.count === 0) return null;
    const keySigStartX = MARGIN + 65;

    // SVG sharp symbol: two vertical lines spanning 2 spaces, two horizontal bars spanning 1 space
    const renderSharp = (x: number, y: number, key: string) => {
      const space = LINE_SPACING;
      const halfW = space * 0.3; // horizontal half-width
      const barGap = space * 0.35; // vertical gap between the two bars
      // Vertical lines extend 1 space above and below center
      const vTop = y - space;
      const vBot = y + space;
      // Slight tilt on horizontal bars
      const tilt = space * 0.1;
      return (
        <g key={key}>
          {/* Two vertical lines */}
          <line x1={x - halfW * 0.45} y1={vTop} x2={x - halfW * 0.45} y2={vBot} stroke="black" strokeWidth="1.5" />
          <line x1={x + halfW * 0.45} y1={vTop} x2={x + halfW * 0.45} y2={vBot} stroke="black" strokeWidth="1.5" />
          {/* Two horizontal bars (slightly tilted) */}
          <line x1={x - halfW} y1={y - barGap + tilt} x2={x + halfW} y2={y - barGap - tilt} stroke="black" strokeWidth="2.5" />
          <line x1={x - halfW} y1={y + barGap + tilt} x2={x + halfW} y2={y + barGap - tilt} stroke="black" strokeWidth="2.5" />
        </g>
      );
    };

    // SVG flat symbol: belly fills one space, stem extends one space above the belly
    const renderFlat = (x: number, y: number, key: string) => {
      const space = LINE_SPACING; // one staff space
      const bulgeWidth = space * 0.55;
      // belly sits in the space: bottom at y, top at y - space
      // stem extends one more space above: y - 2*space
      return (
        <g key={key}>
          {/* Vertical stem: from bottom of belly to one space above belly */}
          <line
            x1={x}
            y1={y - 2 * space}
            x2={x}
            y2={y}
            stroke="black"
            strokeWidth="1.8"
          />
          {/* Belly: one full space tall, round curve from top-of-belly to bottom */}
          <path
            d={`M ${x},${y - space}
                C ${x + bulgeWidth * 1.6},${y - space * 0.9}
                  ${x + bulgeWidth * 1.8},${y - space * 0.1}
                  ${x},${y}`}
            fill="none"
            stroke="black"
            strokeWidth="1.8"
          />
        </g>
      );
    };

    const renderAccidentals = (positions: number[], staffTopY: number, keyPrefix: string) => (
      positions.slice(0, keySigInfo.count).map((pos, i) => {
        let y = staffTopY + (4 - pos / 2) * LINE_SPACING;
        if (keySigInfo.type === 'flat') y += LINE_SPACING / 2;
        const x = keySigStartX + i * 14;
        const key = `${keyPrefix}-${i}`;
        return keySigInfo.type === 'sharp'
          ? renderSharp(x, y, key)
          : renderFlat(x, y, key);
      })
    );

    const treblePositions = keySigInfo.type === 'sharp' ? TREBLE_SHARP_POSITIONS : TREBLE_FLAT_POSITIONS;
    const bassPositions = keySigInfo.type === 'sharp' ? BASS_SHARP_POSITIONS : BASS_FLAT_POSITIONS;

    if (isGrandStaff) {
      return (
        <g key="key-signature">
          {renderAccidentals(treblePositions, STAFF_TOP, 'keysig-treble')}
          {renderAccidentals(bassPositions, bassStaffTop, 'keysig-bass')}
        </g>
      );
    }

    const positions = (clef === Clef.BASS) ? bassPositions : treblePositions;
    return <g key="key-signature">{renderAccidentals(positions, STAFF_TOP, 'keysig')}</g>;
  };

  const getNoteRenderContext = (note: Note) => {
    if (!isGrandStaff) {
      return {
        noteY: positionToY(note.staffPosition),
        position: note.staffPosition,
        lines: staffLines,
      };
    }

    const useTreble = note.midiNumber >= 60;
    const treblePosition = getStaffPosition(note.midiNumber, Clef.TREBLE) ?? 0;
    const bassPosition = getStaffPosition(note.midiNumber, Clef.BASS) ?? 0;
    const position = useTreble ? treblePosition : bassPosition;
    const lines = useTreble ? trebleStaffLines : bassStaffLines;
    const staffTop = useTreble ? STAFF_TOP : bassStaffTop;
    const noteY = staffTop + (4 - position / 2) * LINE_SPACING;

    return { noteY, position, lines };
  };

  const renderNote = (note: Note, index: number) => {
    const noteX = NOTE_START_X + index * NOTE_SPACING;
    const renderContext = getNoteRenderContext(note);
    const noteY = renderContext.noteY;
    const notePosition = renderContext.position;
    const activeStaffLines = renderContext.lines;
    const isCurrent = index === 0;
    const color = isCurrent ? '#2563eb' : '#6b7280';

    return (
      <g key={`${note.midiNumber}-${index}`} className="text-gray-800">
        {notePosition > 8 && (
          <>
            {Array.from({ length: Math.ceil((notePosition - 8) / 2) }).map((_, i) => {
              const ledgerY = activeStaffLines[0] - (i + 1) * LINE_SPACING;
              return (
                <line
                  key={`ledger-top-${index}-${i}`}
                  x1={noteX - 20}
                  y1={ledgerY}
                  x2={noteX + 20}
                  y2={ledgerY}
                  stroke={color}
                  strokeWidth="2"
                />
              );
            })}
          </>
        )}

        {notePosition < 0 && (
          <>
            {Array.from({ length: Math.ceil(-notePosition / 2) }).map((_, i) => {
              const ledgerY = activeStaffLines[4] + (i + 1) * LINE_SPACING;
              return (
                <line
                  key={`ledger-bottom-${index}-${i}`}
                  x1={noteX - 20}
                  y1={ledgerY}
                  x2={noteX + 20}
                  y2={ledgerY}
                  stroke={color}
                  strokeWidth="2"
                />
              );
            })}
          </>
        )}

        <ellipse
          cx={noteX}
          cy={noteY}
          rx="10"
          ry="12"
          fill={color}
          stroke={color}
          strokeWidth="1"
        />

        <line
          x1={noteX + 10}
          y1={noteY}
          x2={noteX + 10}
          y2={noteY - 35}
          stroke={color}
          strokeWidth="2"
        />

        {note.isSharp && (
          <text
            x={noteX - 20}
            y={noteY + 5}
            fontSize="16"
            fontWeight="bold"
            fill={color}
          >
            ♯
          </text>
        )}
        {note.isFlat && (
          <text
            x={noteX - 20}
            y={noteY + 5}
            fontSize="16"
            fontWeight="bold"
            fill={color}
          >
            ♭
          </text>
        )}
      </g>
    );
  };

  const renderWrongNote = (note: Note) => {
    const noteX = NOTE_START_X + 26;
    const renderContext = getNoteRenderContext(note);
    const noteY = renderContext.noteY;
    const notePosition = renderContext.position;
    const activeStaffLines = renderContext.lines;
    const color = '#d1d5db';

    return (
      <g key={`wrong-note-${note.midiNumber}`}>
        {notePosition > 8 && (
          <>
            {Array.from({ length: Math.ceil((notePosition - 8) / 2) }).map((_, i) => {
              const ledgerY = activeStaffLines[0] - (i + 1) * LINE_SPACING;
              return (
                <line
                  key={`wrong-ledger-top-${i}`}
                  x1={noteX - 20}
                  y1={ledgerY}
                  x2={noteX + 20}
                  y2={ledgerY}
                  stroke={color}
                  strokeWidth="2"
                />
              );
            })}
          </>
        )}

        {notePosition < 0 && (
          <>
            {Array.from({ length: Math.ceil(-notePosition / 2) }).map((_, i) => {
              const ledgerY = activeStaffLines[4] + (i + 1) * LINE_SPACING;
              return (
                <line
                  key={`wrong-ledger-bottom-${i}`}
                  x1={noteX - 20}
                  y1={ledgerY}
                  x2={noteX + 20}
                  y2={ledgerY}
                  stroke={color}
                  strokeWidth="2"
                />
              );
            })}
          </>
        )}

        <ellipse
          cx={noteX}
          cy={noteY}
          rx="10"
          ry="12"
          fill={color}
          stroke={color}
          strokeWidth="1"
        />

        <line
          x1={noteX + 10}
          y1={noteY}
          x2={noteX + 10}
          y2={noteY - 35}
          stroke={color}
          strokeWidth="2"
        />

        {note.isSharp && (
          <text
            x={noteX - 20}
            y={noteY + 5}
            fontSize="16"
            fontWeight="bold"
            fill={color}
          >
            ♯
          </text>
        )}
        {note.isFlat && (
          <text
            x={noteX - 20}
            y={noteY + 5}
            fontSize="16"
            fontWeight="bold"
            fill={color}
          >
            ♭
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="w-full max-w-full flex flex-col items-center gap-4 p-4 bg-white rounded-lg border border-gray-300">
      {/* Staff SVG */}
      <svg
        viewBox={`0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`}
        width="100%"
        className={`w-full border border-gray-200 ${isGrandStaff ? 'h-[520px] md:h-[560px]' : 'h-[380px] md:h-[430px]'}`}
      >
        {/* Staff lines */}
        {!isGrandStaff &&
          staffLines.map((y, i) => (
            <line
              key={`staff-line-${i}`}
              x1={MARGIN}
              y1={y}
              x2={STAFF_WIDTH - MARGIN}
              y2={y}
              stroke="black"
              strokeWidth="1.5"
            />
          ))}

        {isGrandStaff && (
          <>
            {trebleStaffLines.map((y, i) => (
              <line
                key={`treble-line-${i}`}
                x1={MARGIN}
                y1={y}
                x2={STAFF_WIDTH - MARGIN}
                y2={y}
                stroke="black"
                strokeWidth="1.5"
              />
            ))}
            {bassStaffLines.map((y, i) => (
              <line
                key={`bass-line-${i}`}
                x1={MARGIN}
                y1={y}
                x2={STAFF_WIDTH - MARGIN}
                y2={y}
                stroke="black"
                strokeWidth="1.5"
              />
            ))}
          </>
        )}

        {/* Bar lines */}
        {!isGrandStaff && (
          <>
            <line
              x1={MARGIN}
              y1={staffLines[0]}
              x2={MARGIN}
              y2={staffLines[4]}
              stroke="black"
              strokeWidth="2"
            />
            <line
              x1={STAFF_WIDTH - MARGIN}
              y1={staffLines[0]}
              x2={STAFF_WIDTH - MARGIN}
              y2={staffLines[4]}
              stroke="black"
              strokeWidth="2"
            />
          </>
        )}

        {isGrandStaff && (
          <>
            <line
              x1={MARGIN}
              y1={trebleStaffLines[0]}
              x2={MARGIN}
              y2={bassStaffLines[4]}
              stroke="black"
              strokeWidth="2"
            />
            <line
              x1={STAFF_WIDTH - MARGIN}
              y1={trebleStaffLines[0]}
              x2={STAFF_WIDTH - MARGIN}
              y2={bassStaffLines[4]}
              stroke="black"
              strokeWidth="2"
            />
          </>
        )}

        {/* Render clef */}
        {renderClef()}

        {/* Render key signature */}
        {renderKeySignature()}

        {/* Render note queue on staff */}
        {allNotes.map((note, index) => renderNote(note, index))}

        {/* Show incorrect played note in light gray for feedback */}
        {showWrongNote && lastPlayedNote && renderWrongNote(lastPlayedNote)}
      </svg>

      {/* Note information and feedback */}
      <div className="text-center space-y-3">
        {currentNote && showAnswer && (
          <div className="text-lg font-semibold text-gray-800">
            Note: {currentNote.name}
            {currentNote.isSharp && '♯'}
            {currentNote.isFlat && '♭'}
            {currentNote.octave}
          </div>
        )}

        {feedbackMessage && (
          <div
            className={`text-lg font-bold ${
              feedbackMessage.includes('Correct') ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {feedbackMessage}
          </div>
        )}

        {!currentNote && (
          <div className="text-gray-500 italic">Press "Start" to begin</div>
        )}
      </div>
    </div>
  );
};
