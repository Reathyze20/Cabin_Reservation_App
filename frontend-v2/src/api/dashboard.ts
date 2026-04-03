// ─── Types ────────────────────────────────────────────────────────────

export interface PendingShoppingItem {
  id: string;
  name: string;
  listId: string;
  listName: string;
  isEssential: boolean;
}

export interface UpcomingReservation {
  id: string;
  userId: string;
  username: string;
  userColor: string | null;
  userAnimalIcon: string | null;
  from: string;
  to: string;
  purpose: string;
  status: string;
}

export interface ActiveReservation {
  id: string;
  username: string;
  userColor: string | null;
  userAnimalIcon: string | null;
  from: string;
  to: string;
  purpose: string;
  handoverNote: string | null;
  isCheckoutCompleted: boolean;
}

export interface DashboardReservationsData {
  activeReservation: ActiveReservation | null;
  upcomingReservations: UpcomingReservation[];
  myNextReservation: { from: string; to: string; purpose: string } | null;
  departingToday: boolean;
  nextFreeWeekend: { start: string; end: string } | null;
}

export interface DashboardShoppingData {
  pendingShoppingItems: PendingShoppingItem[];
  totalPendingShoppingCount: number;
  essentialWarning: { count: number; items: { name: string }[] } | null;
}

export interface DashboardNotesData {
  latestNotes: { id: string; username: string; message: string; createdAt: string }[];
  pinnedHandoverNote: string | null;
}

export interface WeatherForecastDay {
  dayName: string;
  icon: string;
  color: string;
  tempMax: number;
  tempMin: number;
}

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  color: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  city: string;
  sunriseTime: string | null;
  sunsetTime: string | null;
  forecast: WeatherForecastDay[];
}

export type WeatherResult = WeatherData | null | "EMPTY_LOCATION" | "LOCATION_NOT_FOUND";

export interface CabinSettings {
  id: string;
  name: string;
  weatherLocation: string | null;
  departureChecklist: string[];
  isWinterized?: boolean;
  features?: Record<string, boolean> | null;
}

// ─── WMO code mapping ─────────────────────────────────────────────────

const COL_SUN = "#f59e0b";
const COL_CLOUD = "#94a3b8";
const COL_FOG = "#b0bec5";
const COL_DRIZZLE = "#64b5f6";
const COL_RAIN = "#1976d2";
const COL_SNOW = "#4dd0e1";
const COL_SHOWER = "#42a5f5";
const COL_THUNDER = "#7c4dff";

function mapWMOCode(code: number, isNight: boolean): { description: string; icon: string; color: string } {
  const rainSun = isNight ? "fa-cloud-moon-rain" : "fa-cloud-sun-rain";
  if (code === 0) return { description: "Jasno", icon: isNight ? "fa-moon" : "fa-sun", color: COL_SUN };
  if (code <= 2) return { description: "Polojasno", icon: isNight ? "fa-cloud-moon" : "fa-cloud-sun", color: COL_CLOUD };
  if (code === 3) return { description: "Zataženo", icon: "fa-cloud", color: COL_CLOUD };
  if (code <= 49) return { description: "Mlha", icon: "fa-smog", color: COL_FOG };
  if (code <= 59) return { description: "Mrholení", icon: "fa-cloud-drizzle", color: COL_DRIZZLE };
  if (code <= 69) return { description: "Déšť", icon: "fa-cloud-showers-heavy", color: COL_RAIN };
  if (code <= 79) return { description: "Sněžení", icon: "fa-snowflake", color: COL_SNOW };
  if (code <= 84) return { description: "Přeháňky", icon: rainSun, color: COL_SHOWER };
  if (code <= 94) return { description: "Sněhové přeháňky", icon: "fa-snowflake", color: COL_SNOW };
  if (code <= 99) return { description: "Bouřka", icon: "fa-bolt", color: COL_THUNDER };
  return { description: "Neznámé", icon: "fa-cloud", color: COL_CLOUD };
}

// ─── fetchWeather ─────────────────────────────────────────────────────

export async function fetchWeather(location: string | null | undefined): Promise<WeatherResult> {
  if (!location || location.trim() === "") return "EMPTY_LOCATION";

  try {
    // Step 1: Geocoding
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location.trim())}&count=1&language=cs&format=json`,
    );
    const geoData = await geoRes.json() as { results?: { latitude: number; longitude: number; name: string }[] };

    if (!geoData.results || geoData.results.length === 0) return "LOCATION_NOT_FOUND";

    const { latitude: lat, longitude: lon, name: city } = geoData.results[0];

    // Step 2: Forecast
    const fxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
      `&timezone=auto&forecast_days=4`,
    );
    const fx = await fxRes.json() as {
      current: { temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number };
      daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; sunrise: string[]; sunset: string[] };
    };

    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 20;
    const current = fx.current;
    const { description, icon, color } = mapWMOCode(current.weather_code, isNight);

    // Sunrise / sunset from today (index 0)
    const sunriseRaw = fx.daily.sunrise?.[0];
    const sunsetRaw = fx.daily.sunset?.[0];
    const sunriseTime = sunriseRaw ? sunriseRaw.split("T")[1]?.slice(0, 5) ?? null : null;
    const sunsetTime = sunsetRaw ? sunsetRaw.split("T")[1]?.slice(0, 5) ?? null : null;

    const DAY_NAMES_CZ = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

    // Forecast: days 1–3 (tomorrow + 2)
    const forecast: WeatherForecastDay[] = [1, 2, 3].map((i) => {
      const dateStr = fx.daily.time[i];
      const dayName = dateStr ? DAY_NAMES_CZ[new Date(dateStr + "T12:00:00").getDay()] : "";
      const { icon: fIcon, color: fColor } = mapWMOCode(fx.daily.weather_code[i] ?? 0, false);
      return {
        dayName,
        icon: fIcon,
        color: fColor,
        tempMax: Math.round(fx.daily.temperature_2m_max[i] ?? 0),
        tempMin: Math.round(fx.daily.temperature_2m_min[i] ?? 0),
      };
    });

    return {
      temp: Math.round(current.temperature_2m),
      description,
      icon,
      color,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      feelsLike: Math.round(current.apparent_temperature),
      city,
      sunriseTime,
      sunsetTime,
      forecast,
    };
  } catch {
    return null;
  }
}
