import type { WeatherResult } from "@/api/dashboard";
import { useNavigate } from "react-router-dom";

interface Props {
  weather: WeatherResult;
}

export function WeatherCard({ weather }: Props) {
  const navigate = useNavigate();

  if (weather === "EMPTY_LOCATION") {
    return (
      <div className="glass-card weather-card" id="dashboard-weather">
        <div className="card-body-full empty-state-card" style={{ padding: "24px", textAlign: "center" }}>
          <span className="empty-state-icon" style={{ opacity: 0.5 }}>
            <i className="fas fa-cloud-slash fa-2x" />
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
            <i className="fas fa-circle-exclamation fa-2x" />
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
            <i className="fas fa-cloud-slash fa-2x" />
          </span>
          <p className="empty-text">Nepodařilo se načíst počasí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card weather-card" id="dashboard-weather">
      <div className="card-body-full">
        <div className="weather-main">
          <div className="weather-current">
            <i className={`fas ${weather.icon} weather-icon-large`} style={{ color: weather.color }} />
            <div className="weather-temp-box">
              <span className="weather-temp">{weather.temp}°C</span>
              <span className="weather-desc">{weather.description}</span>
              {(weather.sunriseTime || weather.sunsetTime) && (
                <div className="weather-sun-below">
                  {weather.sunriseTime && (
                    <span className="weather-sun-chip">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--status-warning, #f59e0b)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v8" />
                        <path d="m8 6 4-4 4 4" />
                        <path d="M16 18a4 4 0 0 0-8 0" />
                        <path d="M2 18h20" />
                      </svg>
                      <span className="weather-sun-time">{weather.sunriseTime}</span>
                    </span>
                  )}
                  {weather.sunsetTime && (
                    <span className="weather-sun-chip">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--brand-primary, #3f7b63)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 10V2" />
                        <path d="m16 6-4 4-4-4" />
                        <path d="M16 18a4 4 0 0 0-8 0" />
                        <path d="M2 18h20" />
                      </svg>
                      <span className="weather-sun-time">{weather.sunsetTime}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="weather-details">
            <div className="weather-detail-item">
              Pocitově <strong>{weather.feelsLike}°</strong>
            </div>
            <div className="weather-detail-item">
              Vlhkost <strong>{weather.humidity}%</strong>
            </div>
            <div className="weather-detail-item">
              Vítr <strong>{weather.windSpeed} km/h</strong>
            </div>
          </div>
        </div>
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="weather-forecast">
            {weather.forecast.map((f, i) => (
              <div className="forecast-day" key={i}>
                <span className="forecast-day-name">{f.dayName}</span>
                <i className={`fas ${f.icon} forecast-icon`} style={{ color: f.color }} />
                <div className="forecast-temps">
                  {f.tempMax}°<span>/ {f.tempMin}°</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
