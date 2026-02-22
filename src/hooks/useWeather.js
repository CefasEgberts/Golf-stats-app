import { useState } from 'react';

export const useWeather = () => {
  const [splashWeather, setSplashWeather] = useState(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const fetchSplashWeather = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
            );
            const data = await response.json();
            const temp = Math.round(data.current.temperature_2m);
            const weatherCode = data.current.weathercode;
            let condition = 'sunny';
            if (weatherCode >= 51 && weatherCode <= 99) condition = 'rainy';
            else if (weatherCode >= 1 && weatherCode <= 48) condition = 'cloudy';
            setSplashWeather({ temp, condition });
          } catch {
            setSplashWeather({ temp: 15, condition: 'cloudy' });
          }
        },
        () => {
          const temps = [2, 5, 8, 12, 15, 18, 21, 24];
          const conditions = ['sunny', 'cloudy', 'rainy'];
          setSplashWeather({
            temp: temps[Math.floor(Math.random() * temps.length)],
            condition: conditions[Math.floor(Math.random() * conditions.length)]
          });
        }
      );
    } else {
      setSplashWeather({ temp: 15, condition: 'cloudy' });
    }
  };

  const fetchCourseWeather = async (lat, lng, onResult) => {
    setFetchingWeather(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&timezone=auto`
      );
      const data = await response.json();
      onResult(Math.round(data.current.temperature_2m));
    } catch {
      onResult(15);
    } finally {
      setFetchingWeather(false);
    }
  };

  return { splashWeather, setSplashWeather, fetchingWeather, fetchSplashWeather, fetchCourseWeather };
};
