import { useState } from 'react';
import { useMidi } from './hooks/useMidi';
import { GameBoard } from './components/GameBoard';
import { FlashCardsBoard } from './components/FlashCardsBoard';
import { ChordsBoard } from './components/ChordsBoard';
import { EarTrainingBoard } from './components/EarTrainingBoard';
import { ScalesBoard } from './components/ScalesBoard';

type Tab = 'sight-reading' | 'flash-cards' | 'chords' | 'ear-training' | 'scales';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sight-reading');
  const [timerMinutes, setTimerMinutes] = useState(5);
  const midi = useMidi();

  return (
    <div>
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('sight-reading')}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                activeTab === 'sight-reading'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Sight Reading
            </button>
            <button
              onClick={() => setActiveTab('flash-cards')}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                activeTab === 'flash-cards'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Note Math
            </button>
            <button
              onClick={() => setActiveTab('chords')}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                activeTab === 'chords'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Chords
            </button>
            <button
              onClick={() => setActiveTab('ear-training')}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                activeTab === 'ear-training'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Ear Training
            </button>
            <button
              onClick={() => setActiveTab('scales')}
              className={`px-4 py-2 rounded-md font-semibold transition ${
                activeTab === 'scales'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Scales
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'sight-reading' && <GameBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} />}
      {activeTab === 'flash-cards' && <FlashCardsBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} />}
      {activeTab === 'chords' && <ChordsBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} />}
      {activeTab === 'ear-training' && <EarTrainingBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} />}
      {activeTab === 'scales' && <ScalesBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} />}
    </div>
  );
}

export default App;

