import type { WeatherResult } from "@/api/dashboard";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { WeatherIcon } from "./WeatherIcon";
import { CloudRain, Zap, Sun, CloudOff, Wind, Thermometer, Sunrise, Sunset } from "lucide-react";

function dayLength(sunrise: string | null, sunset: string | null): string | null {
  if (!sunrise || !sunset) return null;
  const [sh, sm] = sunrise.split(":").map(Number);
  const [eh, em] = sunset.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function uvLabel(uv: number): { text: string; className: string } {
  if (uv < 3) return { text: "Nízký", className: "uv-low" };
  if (uv < 6) return { text: "Střední", className: "uv-moderate" };
  if (uv < 8) return { text: "Vysoký", className: "uv-high" };
  return { text: "Velmi vysoký", className: "uv-extreme" };
}

function stormSeverity(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("bouřka") || lower.includes("sněhové")) return "storm-severe";
  if (lower.includes("déšť") || lower.includes("přeháňky") || lower.includes("sněžení")) return "storm-warning";
  return "storm-caution";
}

function windLabel(speed: number): string {
  if (speed < 5) return "Bezvětří";
  if (speed < 20) return "Slabý";
  if (speed < 40) return "Mírný";
  if (speed < 60) return "Silný";
  return "Velmi silný";
}

interface Props {
  weather: WeatherResult;
}

function defaultChartTab(w: WeatherResult): "rain" | "wind" | "temp" {
  if (!w || w === "EMPTY_LOCATION" || w === "LOCATION_NOT_FOUND") return "rain";
  const maxProb = w.hourlyRain ? Math.max(...w.hourlyRain.map(h => h.probability)) : 0;
  // If no meaningful rain, show temperature by default
  return maxProb >= 15 ? "rain" : "temp";
}

export function WeatherCard({ weather }: Props) {
  const navigate = useNavigate();
  const [chartTab, setChartTab] = useState<"rain" | "wind" | "temp">(() => defaultChartTab(weather));
  const hasAutoSwitched = useRef(false);

  // Auto-switch tab once when weather data arrives (lazy init may have run with null)
  useEffect(() => {
    if (!hasAutoSwitched.current && weather && weather !== "EMPTY_LOCATION" && weather !== "LOCATION_NOT_FOUND") {
      hasAutoSwitched.current = true;
      const ideal = defaultChartTab(weather);
      if (ideal !== "rain") {
        setChartTab(ideal);
      }
    }
  }, [weather]);

  if (weather === "EMPTY_LOCATION") {
    return (
      <div className="glass-card weather-card" id="dashboard-weather">
        <div className="card-body-full empty-state-card" style={{ padding: "24px", textAlign: "center" }}>
          <span className="empty-state-icon" style={{ opacity: 0.5 }}>
            <WeatherIcon icon="cloud" color="var(--text-muted)" size={32} />
          </span>
          <p className="empty-text" style={{ marginTop: "12px", marginBottom: "12px" }}>
            Pro zobrazení počasí si v nastavení vyplňte přibližnou lokalitu.
          </p>
          <button className="empty-cta" onClick={() => navigate("/cabin-settings")}>
            Přejít do nastavení
          </button>
        </div>
      </div>
    );
  }

  if (weather === "LOCATION_NOT_FOUND") {
    return (
      <div className="glass-card weather-card" id="dashboard-weather">
        <div className="card-body-full empty-state-card" style={{ padding: "24px", textAlign: "center" }}>
          <span className="empty-state-icon" style={{ opacity: 0.5 }}>
            <WeatherIcon icon="cloud" color="var(--color-danger, #ef4444)" size={32} />
          </span>
          <p
            className="empty-text"
            style={{ marginTop: "12px", marginBottom: "12px", color: "var(--color-danger, #ef4444)" }}
          >
            Lokalita nenalezena. Zkuste v nastavení zadat větší nejbližší město nebo PSČ.
          </p>
          <button className="empty-cta" onClick={() => navigate("/cabin-settings")}>
            Upravit lokalitu
          </button>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="glass-card weather-card" id="dashboard-weather">
        <div className="card-body-full empty-state-card">
          <span className="empty-state-icon">
            <WeatherIcon icon="cloud" color="var(--text-muted)" size={32} />
          </span>
          <p className="empty-text">Nepodařilo se načíst počasí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card weather-card" id="dashboard-weather">
      <div className="card-body-full">
        {/* ── ZONE 1: Hero — icon, temp, conditions, sun, alerts ── */}
        <div className="weather-hero-zone">
          <div className="weather-hero">
            <div
              className="weather-icon-circle"
              style={{ background: `${weather.color}15` }}
            >
              <WeatherIcon icon={weather.icon} color={weather.color} size={28} className="weather-icon-large" />
            </div>
            <div className="weather-hero-text">
              <div className="weather-hero-row">
                <span className="weather-temp">{weather.temp}°</span>
                <span className="weather-desc">{weather.description}</span>
              </div>
              <div className="weather-hero-sub">
                <span className="weather-feels-like">Pocitově {weather.feelsLike}°</span>
                {weather.precipProbabilityToday >= 10 && (
                  <span className={`weather-sub-detail ${weather.precipProbabilityToday >= 50 ? "weather-sub-rain-high" : ""}`}>
                    <CloudRain size={12} /> {weather.precipProbabilityToday}%
                  </span>
                )}
                <span className="weather-sub-detail">
                  <Wind size={12} /> {windLabel(weather.windSpeed)} {weather.windSpeed} km/h
                </span>
              </div>
            </div>
          </div>

          {/* Sunrise/sunset — integrated in hero zone */}
          {(weather.sunriseTime || weather.sunsetTime) && (
            <div className="weather-sun-bar">
              {weather.sunriseTime && (
                <span className="weather-sun-item">
                  <Sunrise size={13} className="weather-sunrise-icon" />
                  {weather.sunriseTime}
                </span>
              )}
              {weather.sunsetTime && (
                <span className="weather-sun-item">
                  <Sunset size={13} className="weather-sunset-icon" />
                  {weather.sunsetTime}
                </span>
              )}
              {(() => { const dl = dayLength(weather.sunriseTime, weather.sunsetTime); return dl ? <span className="weather-day-length">{dl}</span> : null; })()}
            </div>
          )}

          {/* UV chip — only when notable (≥3) */}
          {weather.uvIndex >= 3 && (
            <div className="weather-chips">
              <div className={`weather-chip weather-chip-uv ${uvLabel(weather.uvIndex).className}`}>
                <Sun size={13} />
                <span>UV {uvLabel(weather.uvIndex).text} <strong>{Math.round(weather.uvIndex)}</strong></span>
              </div>
            </div>
          )}

          {/* Storm alert — only for tomorrow+ or severe today (thunderstorms) */}
          {weather.stormAlert && weather.stormAlert.day !== "Dnes" && (
            <div className={`weather-storm-alert ${stormSeverity(weather.stormAlert.description)}`}>
              <Zap size={14} />
              <span><strong>{weather.stormAlert.day}:</strong> {weather.stormAlert.description}</span>
            </div>
          )}
        </div>

        {/* ── ZONE 2: Tabbed hourly chart ── */}
        <div className="weather-chart-section">
          <div className="weather-chart-tabs">
            <button
              className={`weather-chart-tab tab-rain ${chartTab === "rain" ? "active" : ""}`}
              onClick={() => setChartTab("rain")}
            >
              <CloudRain size={12} /> Srážky
            </button>
            <button
              className={`weather-chart-tab tab-wind ${chartTab === "wind" ? "active" : ""}`}
              onClick={() => setChartTab("wind")}
            >
              <Wind size={12} /> Vítr
            </button>
            <button
              className={`weather-chart-tab tab-temp ${chartTab === "temp" ? "active" : ""}`}
              onClick={() => setChartTab("temp")}
            >
              <Thermometer size={12} /> Teplota
            </button>
          </div>

          {chartTab === "rain" && (() => {
            const rain = weather.hourlyRain;
            const maxProb = rain ? Math.max(...rain.map(h => h.probability)) : 0;
            const hasRain = rain && rain.length > 0 && maxProb > 0;

            if (!hasRain || maxProb === 0) {
              return (
                <div className="rain-clear-message">
                  <CloudOff size={20} strokeWidth={1.5} />
                  <span>Bez srážek v příštích 12 h</span>
                </div>
              );
            }

            if (maxProb < 15) {
              return (
                <div className="rain-clear-message">
                  <CloudOff size={20} strokeWidth={1.5} />
                  <span>Minimální šance srážek (do {maxProb} %)</span>
                </div>
              );
            }

            const peakIdx = rain.reduce((best, h, idx) => h.probability > rain[best].probability ? idx : best, 0);
            const peakHour = rain[peakIdx].hour;

            return (
              <>
                <div className="weather-chart-headline">
                  Nejvíc {peakHour === "Teď" ? "nyní" : <>kolem <strong>{peakHour}</strong></>}
                </div>
                <div className="weather-chart-bars">
                  {rain.map((h, i) => {
                    const isPeak = i === peakIdx;
                    return (
                      <div className={`chart-bar-col ${isPeak ? "chart-bar-peak" : ""}`} data-chart="rain" key={i}>
                        <span className={`chart-bar-value ${isPeak ? "chart-bar-value-rain" : "chart-bar-value-dim"}`}>{h.probability}%</span>
                        <div className="chart-bar-track">
                          <div
                            className={`chart-bar-fill chart-bar-fill-rain ${isPeak ? "chart-bar-fill-accent" : ""}`}
                            style={{ height: `${h.probability}%` }}
                            title={`${h.hour}: ${h.probability} %`}
                          />
                        </div>
                        <span className={`chart-bar-label ${isPeak ? "chart-bar-label-accent" : ""} ${h.hour === "Teď" ? "chart-bar-now" : ""}`}>{h.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {chartTab === "temp" && (() => {
            const temps = weather.hourlyTemp;
            if (!temps || temps.length === 0) return null;

            const values = temps.map(t => t.temp);
            const maxTemp = Math.max(...values);
            const minTemp = Math.min(...values);
            const peakIdx = temps.reduce((best, t, idx) => t.temp > temps[best].temp ? idx : best, 0);
            const peakHour = temps[peakIdx].hour;
            // Scale bars relative to range (add padding so min isn't 0-height)
            const range = Math.max(maxTemp - minTemp, 1);
            const scaleMin = minTemp - range * 0.15;
            const scaleMax = maxTemp + range * 0.15;

            return (
              <>
                <div className="weather-chart-headline">
                  Maximum {peakHour === "Teď" ? "nyní" : <>kolem <strong>{peakHour}</strong></>}
                </div>
                <div className="weather-chart-bars">
                  {temps.map((t, i) => {
                    const isPeak = i === peakIdx;
                    const pct = Math.round(((t.temp - scaleMin) / (scaleMax - scaleMin)) * 100);
                    return (
                      <div className={`chart-bar-col ${isPeak ? "chart-bar-peak" : ""}`} data-chart="temp" key={i}>
                        <span className={`chart-bar-value ${isPeak ? "chart-bar-value-temp" : "chart-bar-value-dim"}`}>{t.temp}°</span>
                        <div className="chart-bar-track">
                          <div
                            className={`chart-bar-fill chart-bar-fill-temp ${isPeak ? "chart-bar-fill-accent" : ""}`}
                            style={{ height: `${pct}%` }}
                            title={`${t.hour}: ${t.temp}°C`}
                          />
                        </div>
                        <span className={`chart-bar-label ${isPeak ? "chart-bar-label-accent" : ""} ${t.hour === "Teď" ? "chart-bar-now" : ""}`}>{t.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {chartTab === "wind" && (() => {
            const wind = weather.hourlyWind;
            if (!wind || wind.length === 0) return null;

            const maxSpeed = Math.max(...wind.map(w => w.speed));
            const peakIdx = wind.reduce((best, w, idx) => w.speed > wind[best].speed ? idx : best, 0);
            const peakHour = wind[peakIdx].hour;
            // Scale: 60 km/h = 100% bar height (cap for visual)
            const scaleMax = Math.max(maxSpeed, 60);

            return (
              <>
                <div className="weather-chart-headline">
                  {windLabel(maxSpeed)} {peakHour === "Teď" ? "nyní" : <>kolem <strong>{peakHour}</strong></>}
                </div>
                <div className="weather-chart-bars">
                  {wind.map((w, i) => {
                    const isPeak = i === peakIdx;
                    const pct = Math.round((w.speed / scaleMax) * 100);
                    return (
                      <div className={`chart-bar-col ${isPeak ? "chart-bar-peak" : ""}`} data-chart="wind" key={i}>
                        <span className={`chart-bar-value ${isPeak ? "chart-bar-value-wind" : "chart-bar-value-dim"}`}>{w.speed}</span>
                        <div className="chart-bar-track">
                          <div
                            className={`chart-bar-fill chart-bar-fill-wind ${isPeak ? "chart-bar-fill-accent" : ""}`}
                            style={{ height: `${pct}%` }}
                            title={`${w.hour}: ${w.speed} km/h`}
                          />
                        </div>
                        <span className={`chart-bar-label ${isPeak ? "chart-bar-label-accent" : ""} ${w.hour === "Teď" ? "chart-bar-now" : ""}`}>{w.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* ── ZONE 3: Forecast ── */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="weather-forecast">
            {weather.forecast.map((f, i) => (
              <div className={`forecast-day ${i === 0 ? "forecast-day-today" : ""}`} key={i}>
                <span className="forecast-day-name">{i === 0 ? "Zítra" : f.dayName}</span>
                <WeatherIcon icon={f.icon} color={f.color} size={24} className="forecast-icon" />
                <div className="forecast-temps">
                  <strong>{f.tempMax}°</strong><span className="forecast-temp-min">/{f.tempMin}°</span>
                </div>
                {f.precipProbability >= 5 ? (
                  <span className="forecast-precip">
                    <CloudRain size={10} /> {f.precipProbability}%
                  </span>
                ) : (
                  <span className="forecast-precip forecast-precip-none">&nbsp;</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
