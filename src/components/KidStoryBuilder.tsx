import React, { useState } from 'react';
import { Sparkles, Dices, Wand2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChimeSound } from '../utils/kidAudio';

interface KidStoryBuilderProps {
  currentTheme: string;
  childName: string;
  onApplyTheme: (theme: string) => void;
}

interface OptionItem {
  id: string;
  emoji: string;
  label: string;
}

const HEROES: OptionItem[] = [
  { id: 'dino', emoji: '🦖', label: 'T-Rex Dino' },
  { id: 'unicorn', emoji: '🦄', label: 'Magical Unicorn' },
  { id: 'cat', emoji: '🐱', label: 'Astronaut Cat' },
  { id: 'puppy', emoji: '🐶', label: 'Super Puppy' },
  { id: 'robot', emoji: '🤖', label: 'Dancing Robot' },
  { id: 'mermaid', emoji: '🧜‍♀️', label: 'Mermaid' },
  { id: 'racecar', emoji: '🏎️', label: 'Turbo Race Car' },
  { id: 'lion', emoji: '🦁', label: 'Friendly Lion' },
  { id: 'bear', emoji: '🐻', label: 'Teddy Hero' },
  { id: 'dragon', emoji: '🐲', label: 'Baby Dragon' },
];

const ACTIVITIES: OptionItem[] = [
  { id: 'rocket', emoji: '🚀', label: 'Flying a Rocket' },
  { id: 'pizza', emoji: '🍕', label: 'Pizza Party' },
  { id: 'surfing', emoji: '🏄', label: 'Surfing Big Waves' },
  { id: 'guitar', emoji: '🎸', label: 'Rocking on Guitar' },
  { id: 'skate', emoji: '🛹', label: 'Skateboarding' },
  { id: 'treasure', emoji: '💎', label: 'Hunting Treasure' },
  { id: 'cupcake', emoji: '🧁', label: 'Baking Cupcakes' },
  { id: 'painting', emoji: '🎨', label: 'Painting Rainbows' },
];

const WORLDS: OptionItem[] = [
  { id: 'space', emoji: '🪐', label: 'Outer Space Planet' },
  { id: 'candyland', emoji: '🍭', label: 'Candy & Donut Kingdom' },
  { id: 'jungle', emoji: '🌴', label: 'Prehistoric Jungle' },
  { id: 'ocean', emoji: '🌊', label: 'Deep Ocean Coral Reef' },
  { id: 'clouds', emoji: '☁️', label: 'Fluffy Cloud Kingdom' },
  { id: 'castle', emoji: '🏰', label: 'Enchanted Fairy Castle' },
  { id: 'circus', emoji: '🎪', label: 'Whimsical Carnival' },
];

export const KidStoryBuilder: React.FC<KidStoryBuilderProps> = ({
  childName,
  onApplyTheme,
}) => {
  const [selectedHero, setSelectedHero] = useState<OptionItem>(HEROES[0]);
  const [selectedActivity, setSelectedActivity] = useState<OptionItem>(ACTIVITIES[0]);
  const [selectedWorld, setSelectedWorld] = useState<OptionItem>(WORLDS[0]);
  const [isSurprising, setIsSurprising] = useState(false);

  // Compute theme combination string
  const combinedTheme = `${selectedHero.label} ${selectedActivity.label} in ${selectedWorld.label}`;

  const handleHeroSelect = (hero: OptionItem) => {
    setSelectedHero(hero);
    playChimeSound('pop');
  };

  const handleActivitySelect = (act: OptionItem) => {
    setSelectedActivity(act);
    playChimeSound('pop');
  };

  const handleWorldSelect = (world: OptionItem) => {
    setSelectedWorld(world);
    playChimeSound('pop');
  };

  const handleSurpriseSpin = () => {
    setIsSurprising(true);
    playChimeSound('magic');

    // Fun lottery shuffle effect
    let count = 0;
    const interval = setInterval(() => {
      setSelectedHero(HEROES[Math.floor(Math.random() * HEROES.length)]);
      setSelectedActivity(ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)]);
      setSelectedWorld(WORLDS[Math.floor(Math.random() * WORLDS.length)]);
      count++;
      if (count > 6) {
        clearInterval(interval);
        setIsSurprising(false);
        playChimeSound('sparkle');
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
        });
      }
    }, 80);
  };

  const handleApply = () => {
    playChimeSound('fanfare');
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
    onApplyTheme(combinedTheme);
  };

  return (
    <div className="bg-radial from-amber-50 via-amber-100/50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl select-none">✨</span>
            <h3
              className="text-lg sm:text-xl font-black text-amber-950 tracking-tight"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Kid Magic Adventure Builder
            </h3>
          </div>
          <p className="text-xs text-amber-900 mt-0.5">
            Tap a Hero, Activity, and World to invent {childName ? `${childName}'s` : 'your'} custom story!
          </p>
        </div>

        {/* Surprise Me Button */}
        <button
          type="button"
          onClick={handleSurpriseSpin}
          disabled={isSurprising}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-linear-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <Dices className={`w-4 h-4 ${isSurprising ? 'animate-spin' : ''}`} />
          <span>🎲 Surprise Me!</span>
        </button>
      </div>

      {/* Row 1: Pick a Hero */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold">
              1
            </span>
            <span>Choose Your Hero</span>
          </label>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
            Selected: {selectedHero.emoji} {selectedHero.label}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {HEROES.map((hero) => {
            const isSelected = selectedHero.id === hero.id;
            return (
              <button
                key={hero.id}
                type="button"
                onClick={() => handleHeroSelect(hero)}
                className={`shrink-0 px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-600 bg-amber-500 text-white shadow-sm scale-105'
                    : 'border-amber-200 bg-white hover:bg-amber-50 text-gray-800'
                }`}
              >
                <span className="text-lg select-none">{hero.emoji}</span>
                <span>{hero.label}</span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Pick an Activity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold">
              2
            </span>
            <span>What are they doing?</span>
          </label>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
            Selected: {selectedActivity.emoji} {selectedActivity.label}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {ACTIVITIES.map((act) => {
            const isSelected = selectedActivity.id === act.id;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => handleActivitySelect(act)}
                className={`shrink-0 px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-600 bg-amber-500 text-white shadow-sm scale-105'
                    : 'border-amber-200 bg-white hover:bg-amber-50 text-gray-800'
                }`}
              >
                <span className="text-lg select-none">{act.emoji}</span>
                <span>{act.label}</span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Pick a World */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold">
              3
            </span>
            <span>Where is the adventure?</span>
          </label>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
            Selected: {selectedWorld.emoji} {selectedWorld.label}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {WORLDS.map((world) => {
            const isSelected = selectedWorld.id === world.id;
            return (
              <button
                key={world.id}
                type="button"
                onClick={() => handleWorldSelect(world)}
                className={`shrink-0 px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-600 bg-amber-500 text-white shadow-sm scale-105'
                    : 'border-amber-200 bg-white hover:bg-amber-50 text-gray-800'
                }`}
              >
                <span className="text-lg select-none">{world.emoji}</span>
                <span>{world.label}</span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Callout & Apply Button */}
      <div className="bg-white rounded-xl border-2 border-amber-300 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="text-3xl select-none flex items-center gap-1 bg-amber-100 p-2 rounded-xl border border-amber-200">
            <span>{selectedHero.emoji}</span>
            <span className="text-xs">➕</span>
            <span>{selectedActivity.emoji}</span>
            <span className="text-xs">➕</span>
            <span>{selectedWorld.emoji}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
              Your Child's Magical Adventure Theme:
            </span>
            <p className="text-sm font-black text-gray-900 mt-0.5" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {combinedTheme}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApply}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Use This Adventure!</span>
        </button>
      </div>
    </div>
  );
};
