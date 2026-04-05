import React from 'react';
import type { Note } from '../types';
import { Clef } from '../types';
import { getStaffPosition } from '../utils/midiNoteMap';

interface StaffDisplayProps {
  currentNote: Note | null;
  noteQueue: Note[];
  clef: Clef;
  showAnswer: boolean;
  feedbackMessage: string;
  lastPlayedNote: Note | null;
  showWrongNote: boolean;
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
  const NOTE_START_X = MARGIN + 90;
  const NOTE_SPACING = 52;

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
