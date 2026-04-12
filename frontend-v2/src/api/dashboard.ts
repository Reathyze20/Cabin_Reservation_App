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

export interface LastStay {
  username: string;
  userColor: string | null;
  userAnimalIcon: string | null;
  from: string;
  to: string;
  isCheckoutCompleted: boolean;
  daysEmpty: number;
}

export interface DashboardReservationsData {
  activeReservation: ActiveReservation | null;
  upcomingReservations: UpcomingReservation[];
  myNextReservation: { from: string; to: string; purpose: string } | null;
  departingToday: boolean;
  nextFreeWeekend: { start: string; end: string } | null;
  lastStay: LastStay | null;
  stats: {
    myNightsThisYear: number;
    totalStaysThisMonth: number;
  };
}

export interface DashboardShoppingData {
  pendingShoppingItems: PendingShoppingItem[];
  totalPendingShoppingCount: number;
  totalItemsCount: number;
  essentialWarning: { count: number; items: { name: string }[] } | null;
}

export interface DashboardNotesData {
  latestNotes: { id: string; username: string; message: string; createdAt: string }[];
  pinnedHandoverNote: string | null;
  handoverNoteAuthor: string | null;
  handoverNoteUpdatedAt: string | null;
}

export interface DashboardReconstructionItem {
  id: string;
  title: string;
  category: string;
  status: string;
  votesCount: number;
  createdBy: string;
  deadline: string | null;
}

export interface DashboardReconstructionData {
  totalActiveCount: number;
  items: DashboardReconstructionItem[];
}

export interface DashboardGalleryPhoto {
  id: string;
  thumb: string;
  folderName: string;
  uploadedBy: string | null;
  createdAt: string;
}

export interface DashboardGalleryData {
  photos: DashboardGalleryPhoto[];
}

export interface WeatherForecastDay {
  dayName: string;
  icon: string;
  color: string;
  tempMax: number;
  tempMin: number;
  precipProbability: number;
  precipSum: number;
}

export interface HourlyRainPoint {
  hour: string;
  probability: number;
}

export interface HourlyWindPoint {
  hour: string;
  speed: number;
}

export interface HourlyTempPoint {
  hour: string;
  temp: number;
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
  uvIndex: number;
  precipProbabilityToday: number;
  stormAlert: { day: string; description: string } | null;
  hourlyRain: HourlyRainPoint[];
  hourlyWind: HourlyWindPoint[];
  hourlyTemp: HourlyTempPoint[];
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
  const rainSun = isNight ? "cloud-moon-rain" : "cloud-sun-rain";
  if (code === 0) return { description: "Jasno", icon: isNight ? "moon" : "sun", color: COL_SUN };
  if (code <= 2) return { description: "Polojasno", icon: isNight ? "cloud-moon" : "cloud-sun", color: COL_CLOUD };
  if (code === 3) return { description: "Zataženo", icon: "cloud", color: COL_CLOUD };
  if (code <= 49) return { description: "Mlha", icon: "fog", color: COL_FOG };
  if (code <= 59) return { description: "Mrholení", icon: "cloud-drizzle", color: COL_DRIZZLE };
  if (code <= 69) return { description: "Déšť", icon: "cloud-rain", color: COL_RAIN };
  if (code <= 79) return { description: "Sněžení", icon: "snowflake", color: COL_SNOW };
  if (code <= 84) return { description: "Přeháňky", icon: rainSun, color: COL_SHOWER };
  if (code <= 94) return { description: "Sněhové přeháňky", icon: "snowflake", color: COL_SNOW };
  if (code <= 99) return { description: "Bouřka", icon: "cloud-lightning", color: COL_THUNDER };
  return { description: "Neznámé", icon: "cloud", color: COL_CLOUD };
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
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
      `&hourly=precipitation_probability,wind_speed_10m,temperature_2m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,precipitation_sum` +
      `&timezone=auto&forecast_days=6`,
    );
    const fx = await fxRes.json() as {
      current: { temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number; uv_index: number };
      hourly: { time: string[]; precipitation_probability: number[]; wind_speed_10m: number[]; temperature_2m: number[] };
      daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; sunrise: string[]; sunset: string[]; precipitation_probability_max: number[]; precipitation_sum: number[] };
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

    // Forecast: days 1–5 (tomorrow + 4)
    const forecast: WeatherForecastDay[] = [1, 2, 3, 4, 5].map((i) => {
      const dateStr = fx.daily.time[i];
      const dayName = dateStr ? DAY_NAMES_CZ[new Date(dateStr + "T12:00:00").getDay()] : "";
      const { icon: fIcon, color: fColor } = mapWMOCode(fx.daily.weather_code[i] ?? 0, false);
      return {
        dayName,
        icon: fIcon,
        color: fColor,
        tempMax: Math.round(fx.daily.temperature_2m_max[i] ?? 0),
        tempMin: Math.round(fx.daily.temperature_2m_min[i] ?? 0),
        precipProbability: fx.daily.precipitation_probability_max[i] ?? 0,
        precipSum: Math.round((fx.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      };
    });

    // Storm alert: check next 3 days for WMO ≥ 80 (thunderstorm / heavy precip)
    let stormAlert: { day: string; description: string } | null = null;
    for (let i = 0; i <= 2; i++) {
      const wmo = fx.daily.weather_code[i] ?? 0;
      if (wmo >= 80) {
        const dateStr = fx.daily.time[i];
        const dayLabel = i === 0 ? "Dnes" : i === 1 ? "Zítra" : (dateStr ? DAY_NAMES_CZ[new Date(dateStr + "T12:00:00").getDay()] : "");
        const { description: stormDesc } = mapWMOCode(wmo, false);
        stormAlert = { day: dayLabel, description: stormDesc };
        break;
      }
    }

    // Hourly rain probability: next 12 hours from current hour
    const hourlyRain: HourlyRainPoint[] = [];
    if (fx.hourly?.time && fx.hourly?.precipitation_probability) {
      const nowHour = new Date().getHours();
      const todayStr = fx.daily.time[0]; // "YYYY-MM-DD"
      for (let h = 0; h < 12; h++) {
        const targetHour = nowHour + h;
        const dayOffset = Math.floor(targetHour / 24);
        const hourInDay = targetHour % 24;
        const targetDateStr = fx.daily.time[dayOffset] ?? todayStr;
        const targetTimeStr = `${targetDateStr}T${String(hourInDay).padStart(2, "0")}:00`;
        const idx = fx.hourly.time.indexOf(targetTimeStr);
        if (idx >= 0) {
          hourlyRain.push({
            hour: h === 0 ? "Teď" : `${String(hourInDay).padStart(2, "0")}h`,
            probability: fx.hourly.precipitation_probability[idx] ?? 0,
          });
        }
      }
    }

    // Hourly wind speed: next 12 hours from current hour
    const hourlyWind: HourlyWindPoint[] = [];
    if (fx.hourly?.time && fx.hourly?.wind_speed_10m) {
      const nowHour = new Date().getHours();
      const todayStr = fx.daily.time[0];
      for (let h = 0; h < 12; h++) {
        const targetHour = nowHour + h;
        const dayOffset = Math.floor(targetHour / 24);
        const hourInDay = targetHour % 24;
        const targetDateStr = fx.daily.time[dayOffset] ?? todayStr;
        const targetTimeStr = `${targetDateStr}T${String(hourInDay).padStart(2, "0")}:00`;
        const idx = fx.hourly.time.indexOf(targetTimeStr);
        if (idx >= 0) {
          hourlyWind.push({
            hour: h === 0 ? "Teď" : `${String(hourInDay).padStart(2, "0")}h`,
            speed: Math.round(fx.hourly.wind_speed_10m[idx] ?? 0),
          });
        }
      }
    }

    // Hourly temperature: next 12 hours from current hour
    const hourlyTemp: HourlyTempPoint[] = [];
    if (fx.hourly?.time && fx.hourly?.temperature_2m) {
      const nowHour = new Date().getHours();
      const todayStr = fx.daily.time[0];
      for (let h = 0; h < 12; h++) {
        const targetHour = nowHour + h;
        const dayOffset = Math.floor(targetHour / 24);
        const hourInDay = targetHour % 24;
        const targetDateStr = fx.daily.time[dayOffset] ?? todayStr;
        const targetTimeStr = `${targetDateStr}T${String(hourInDay).padStart(2, "0")}:00`;
        const idx = fx.hourly.time.indexOf(targetTimeStr);
        if (idx >= 0) {
          hourlyTemp.push({
            hour: h === 0 ? "Teď" : `${String(hourInDay).padStart(2, "0")}h`,
            temp: Math.round(fx.hourly.temperature_2m[idx] ?? 0),
          });
        }
      }
    }

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
      uvIndex: Math.round(current.uv_index * 10) / 10,
      precipProbabilityToday: fx.daily.precipitation_probability_max[0] ?? 0,
      stormAlert,
      hourlyRain,
      hourlyWind,
      hourlyTemp,
      forecast,
    };
  } catch {
    return null;
  }
}
