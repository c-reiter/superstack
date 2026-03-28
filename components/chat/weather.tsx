"use client";

import cx from "classnames";
import { format, isWithinInterval } from "date-fns";
import { useMemo } from "react";

const SunIcon = ({ size = 40 }: { size?: number }) => (
  <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <circle cx="12" cy="12" fill="currentColor" r="5" />
    <line stroke="currentColor" strokeWidth="2" x1="12" x2="12" y1="1" y2="3" />
    <line
      stroke="currentColor"
      strokeWidth="2"
      x1="12"
      x2="12"
      y1="21"
      y2="23"
    />
    <line
      stroke="currentColor"
      strokeWidth="2"
      x1="4.22"
      x2="5.64"
      y1="4.22"
      y2="5.64"
    />
    <line
      stroke="currentColor"
      strokeWidth="2"
      x1="18.36"
      x2="19.78"
      y1="18.36"
      y2="19.78"
    />
    <line stroke="currentColor" strokeWidth="2" x1="1" x2="3" y1="12" y2="12" />
    <line
      stroke="currentColor"
      strokeWidth="2"
      x1="21"
      x2="23"
      y1="12"
      y2="12"
    />
    <line
      stroke="currentColor"
      strokeWidth="2"
      x1="4.22"
      x2="5.64"
      y1="19.78"
      y2="18.36"
    />
    <line
      stroke="currentColor"
      strokeWidth="2"
      x1="18.36"
      x2="19.78"
      y1="5.64"
      y2="4.22"
    />
  </svg>
);

const MoonIcon = ({ size = 40 }: { size?: number }) => (
  <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z"
      fill="currentColor"
    />
  </svg>
);

const CloudIcon = ({ size = 24 }: { size?: number }) => (
  <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
    <path
      d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

type WeatherAtLocation = {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  cityName?: string;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
  daily_units: {
    time: string;
    sunrise: string;
    sunset: string;
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
};

const SAMPLE: WeatherAtLocation = {
  latitude: 37.763_283,
  longitude: -122.412_86,
  generationtime_ms: 0.028,
  utc_offset_seconds: 0,
  timezone: "GMT",
  timezone_abbreviation: "GMT",
  elevation: 18,
  current_units: { time: "iso8601", interval: "seconds", temperature_2m: "°C" },
  current: { time: "2024-10-07T19:30", interval: 900, temperature_2m: 29.3 },
  hourly_units: { time: "iso8601", temperature_2m: "°C" },
  hourly: {
    time: [
      "2024-10-07T18:00",
      "2024-10-07T19:00",
      "2024-10-07T20:00",
      "2024-10-07T21:00",
      "2024-10-07T22:00",
      "2024-10-07T23:00",
      "2024-10-08T00:00",
      "2024-10-08T01:00",
      "2024-10-08T02:00",
      "2024-10-08T03:00",
      "2024-10-08T04:00",
      "2024-10-08T05:00",
      "2024-10-08T06:00",
      "2024-10-08T07:00",
      "2024-10-08T08:00",
      "2024-10-08T09:00",
      "2024-10-08T10:00",
      "2024-10-08T11:00",
      "2024-10-08T12:00",
      "2024-10-08T13:00",
      "2024-10-08T14:00",
      "2024-10-08T15:00",
      "2024-10-08T16:00",
      "2024-10-08T17:00",
    ],
    temperature_2m: [
      31.4, 33.9, 32.1, 28.9, 26.9, 25.2, 23.0, 21.1, 19.6, 18.6, 17.7, 16.8,
      16.2, 15.5, 14.9, 14.4, 14.2, 13.7, 13.3, 12.9, 12.5, 13.5, 15.8, 17.7,
    ],
  },
  daily_units: {
    time: "iso8601",
    sunrise: "iso8601",
    sunset: "iso8601",
  },
  daily: {
    time: ["2024-10-07", "2024-10-08"],
    sunrise: ["2024-10-07T07:15", "2024-10-08T07:16"],
    sunset: ["2024-10-07T19:00", "2024-10-08T18:58"],
  },
};

const MAX_FORECAST_ITEMS = 6;
const MOBILE_FORECAST_ITEMS = 5;

function roundUpTemperature(temperature: number): number {
  return Math.ceil(temperature);
}

function getCurrentForecastStartIndex(weatherAtLocation: WeatherAtLocation) {
  const currentTime = new Date(weatherAtLocation.current.time);
  const startIndex = weatherAtLocation.hourly.time.findIndex(
    (time) => new Date(time) >= currentTime
  );

  return startIndex === -1 ? 0 : startIndex;
}

function getLocationLabel(weatherAtLocation: WeatherAtLocation) {
  return (
    weatherAtLocation.cityName ||
    `${weatherAtLocation.latitude.toFixed(1)}°, ${weatherAtLocation.longitude.toFixed(1)}°`
  );
}

export function Weather({
  weatherAtLocation = SAMPLE,
}: {
  weatherAtLocation?: WeatherAtLocation;
}) {
  const currentDayTemperatures = weatherAtLocation.hourly.temperature_2m.slice(
    0,
    24
  );
  const currentHigh = Math.max(...currentDayTemperatures);
  const currentLow = Math.min(...currentDayTemperatures);

  const isDay = isWithinInterval(new Date(weatherAtLocation.current.time), {
    start: new Date(weatherAtLocation.daily.sunrise[0]),
    end: new Date(weatherAtLocation.daily.sunset[0]),
  });

  const forecastEntries = useMemo(() => {
    const startIndex = getCurrentForecastStartIndex(weatherAtLocation);

    return weatherAtLocation.hourly.time
      .slice(startIndex, startIndex + MAX_FORECAST_ITEMS)
      .map((time, index) => ({
        time,
        temperature:
          weatherAtLocation.hourly.temperature_2m[startIndex + index],
      }));
  }, [weatherAtLocation]);

  const location = getLocationLabel(weatherAtLocation);

  return (
    <div
      className={cx(
        "relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl p-4 shadow-lg backdrop-blur-sm",
        {
          "bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600": isDay,
        },
        {
          "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900":
            !isDay,
        }
      )}
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

      <div className="relative z-10">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-medium text-white/80 text-xs">{location}</div>
          <div className="text-white/60 text-xs">
            {format(new Date(weatherAtLocation.current.time), "MMM d, h:mm a")}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cx("text-white/90", {
                "text-yellow-200": isDay,
                "text-blue-200": !isDay,
              })}
            >
              {isDay ? <SunIcon size={32} /> : <MoonIcon size={32} />}
            </div>
            <div className="font-light text-3xl text-white">
              {roundUpTemperature(weatherAtLocation.current.temperature_2m)}
              <span className="text-lg text-white/80">
                {weatherAtLocation.current_units.temperature_2m}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="font-medium text-white/90 text-xs">
              H: {roundUpTemperature(currentHigh)}°
            </div>
            <div className="text-white/70 text-xs">
              L: {roundUpTemperature(currentLow)}°
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          <div className="mb-2 font-medium text-white/80 text-xs">
            Hourly Forecast
          </div>
          <div className="flex justify-between gap-1">
            {forecastEntries.map(({ time, temperature }, index) => {
              const hourTime = new Date(time);
              const isCurrentHour =
                hourTime.getHours() ===
                new Date(weatherAtLocation.current.time).getHours();

              return (
                <div
                  className={cx(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5",
                    index >= MOBILE_FORECAST_ITEMS && "hidden md:flex",
                    {
                      "bg-white/20": isCurrentHour,
                    }
                  )}
                  key={time}
                >
                  <div className="font-medium text-white/70 text-xs">
                    {index === 0 ? "Now" : format(hourTime, "ha")}
                  </div>

                  <div
                    className={cx("text-white/60", {
                      "text-yellow-200": isDay,
                      "text-blue-200": !isDay,
                    })}
                  >
                    <CloudIcon size={16} />
                  </div>

                  <div className="font-medium text-white text-xs">
                    {roundUpTemperature(temperature)}°
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex justify-between text-white/60 text-xs">
          <div>
            Sunrise:{" "}
            {format(new Date(weatherAtLocation.daily.sunrise[0]), "h:mm a")}
          </div>
          <div>
            Sunset:{" "}
            {format(new Date(weatherAtLocation.daily.sunset[0]), "h:mm a")}
          </div>
        </div>
      </div>
    </div>
  );
}
