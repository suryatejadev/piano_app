import { useCallback, useState } from 'react';
import { useMidi } from './hooks/useMidi';
import { useAuth } from './hooks/useAuth';
import { GameBoard } from './components/GameBoard';
import { FlashCardsBoard } from './components/FlashCardsBoard';
import { ChordsBoard } from './components/ChordsBoard';
import { EarTrainingBoard } from './components/EarTrainingBoard';
import { ScalesBoard } from './components/ScalesBoard';
import { RhythmBoard } from './components/RhythmBoard';
import { AuthForm } from './components/AuthForm';
import { StatsPage } from './components/StatsPage';
import { saveSession } from './lib/statsService';
import type { SessionRecord } from './lib/statsService';

type Tab = 'sight-reading' | 'flash-cards' | 'chords' | 'ear-training' | 'scales' | 'rhythm' | 'stats';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sight-reading');
  const [timerMinutes, setTimerMinutes] = useState(5);
  const midi = useMidi();
  const auth = useAuth();

  const onSessionComplete = useCallback((record: SessionRecord) => {
    if (auth.user) {
      void saveSession(auth.user.id, record);
    }
  }, [auth.user]);

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!auth.user) {
    return <AuthForm auth={auth} />;
  }

  return (
    <div>
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
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
                Flash Cards
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
              <button
                onClick={() => setActiveTab('rhythm')}
                className={`px-4 py-2 rounded-md font-semibold transition ${
                  activeTab === 'rhythm'
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Rhythm
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-md font-semibold transition ${
                  activeTab === 'stats'
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Stats
              </button>
              <button
                onClick={() => auth.signOut()}
                className="ml-auto px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                Sign Out
              </button>
          </div>
        </div>
      </div>

      {activeTab === 'sight-reading' && <GameBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} onSessionComplete={onSessionComplete} />}
      {activeTab === 'flash-cards' && <FlashCardsBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} onSessionComplete={onSessionComplete} />}
      {activeTab === 'chords' && <ChordsBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} onSessionComplete={onSessionComplete} />}
      {activeTab === 'ear-training' && <EarTrainingBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} onSessionComplete={onSessionComplete} />}
      {activeTab === 'scales' && <ScalesBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} midi={midi} onSessionComplete={onSessionComplete} />}
      {activeTab === 'rhythm' && <RhythmBoard timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes} onSessionComplete={onSessionComplete} />}
      {activeTab === 'stats' && <StatsPage userId={auth.user.id} />}
    </div>
  );
}

export default App;

