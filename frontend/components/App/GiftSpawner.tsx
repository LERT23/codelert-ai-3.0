import React, { useState, useEffect } from 'react';

export const GiftSpawner = () => {
  const [gifts, setGifts] = useState<{id: number, x: number, y: number, exploding: boolean}[]>([]);

  useEffect(() => {
    const spawnGift = () => {
      setGifts(prev => [...prev, {
        id: Date.now(),
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 100) + 50,
        exploding: false
      }]);
    };

    spawnGift(); // Spawn one initially
    const interval = setInterval(() => {
      if (Math.random() < 0.5) spawnGift();
    }, 5 * 60 * 1000); // Check every 5 mins

    return () => clearInterval(interval);
  }, []);

  const handleExplode = (id: number) => {
    setGifts(prev => prev.map(g => g.id === id ? { ...g, exploding: true } : g));
    setTimeout(() => {
      setGifts(prev => prev.filter(g => g.id !== id));
    }, 500);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {gifts.map(g => (
        <div 
          key={g.id} 
          className={`absolute cursor-pointer pointer-events-auto text-4xl transition-all duration-500 ${g.exploding ? 'scale-[3] opacity-0 blur-md' : 'animate-bounce hover:scale-110'}`}
          style={{ left: g.x, top: g.y }}
          onClick={() => handleExplode(g.id)}
        >
          {g.exploding ? '💥' : '🎁'}
        </div>
      ))}
    </div>
  );
};
