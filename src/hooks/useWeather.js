import { useState } from 'react';

const kmhToBeaufort = (kmh) => {
  if (kmh < 1) return 0;
  if (kmh < 6) return 1;
  if (kmh < 12) return 2;
  if (kmh < 20) return 3;
  if (kmh < 29) return 4;
  if (kmh < 39) return 5;
  if (kmh < 50) return 6;
  if (kmh < 62) return 7;
  if (kmh < 75) return 8;
  if (kmh < 89) return 9;
  return 10;
};

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

  const [courseWind, setCourseWind] = useState(null);

  const fetchCourseWeather = async (lat, lng, onResult) => {
    setFetchingWeather(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`
      );
      const data = await response.json();
      onResult(Math.round(data.current.temperature_2m));
      setCourseWind({
        speed: Math.round(data.current.wind_speed_10m),
        gusts: Math.round(data.current.wind_gusts_10m),
        direction: Math.round(data.current.wind_direction_10m),
        beaufort: kmhToBeaufort(data.current.wind_speed_10m)
      });
    } catch {
      onResult(15);
      setCourseWind(null);
    } finally {
      setFetchingWeather(false);
    }
  };

  return { splashWeather, setSplashWeather, fetchingWeather, courseWind, fetchSplashWeather, fetchCourseWeather };
};
