import React from 'react';

export default function SplashScreen({ weather, settings }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (settings.language === 'nl') {
      if (hour < 12) return 'Goedemorgen';
      if (hour < 18) return 'Goedemiddag';
      return 'Goedenavond';
    } else {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
  };

  const getWeatherMessage = () => {
    if (!weather) return '';
    const name = settings.name || 'golfer';
    if (weather.condition === 'rainy') {
      return settings.language === 'nl'
        ? `Het is altijd weer om te golfen, ${name}!`
        : `It's always a good day to golf, ${name}!`;
    }
    if (weather.temp < 10) {
      return settings.language === 'nl'
        ? `Wat ben je toch een bikkel, ${name}!`
        : `You're a tough one, ${name}!`;
    }
    return settings.language === 'nl'
      ? `Wat een topweer om een rondje te spelen, ${name}!`
      : `Perfect weather for a round, ${name}!`;
  };

  const weatherIcon = !weather ? '⛅' : weather.condition === 'rainy' ? '🌧️' : weather.condition === 'cloudy' ? '⛅' : '☀️';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8">
      <div className="animate-slide-up">
        <div className="text-8xl mb-6">⛳</div>
        <div className="font-display text-7xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
          GOLF STATS
        </div>
        <div className="font-body text-emerald-200/60 text-lg mb-8">Track. Analyze. Improve.</div>
        {weather && (
          <div className="glass-card rounded-2xl px-8 py-4 inline-block">
            <div className="font-display text-4xl mb-1">{weatherIcon} {weather.temp}°C</div>
            <div className="font-body text-sm text-emerald-200/70">{getGreeting()}</div>
            <div className="font-body text-xs text-emerald-200/50 mt-1">{getWeatherMessage()}</div>
          </div>
        )}
        {!weather && (
          <div className="glass-card rounded-2xl px-8 py-4 inline-block">
            <div className="font-body text-emerald-200/60">Weer laden...</div>
          </div>
        )}
      </div>
    </div>
  );
}
