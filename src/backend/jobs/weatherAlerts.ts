/* ============================================================================
   jobs/weatherAlerts.ts — Frost alert cron job
   Checks Open-Meteo forecast for sub-zero temps and emails cabin members.
   ============================================================================ */

import prisma from "../../utils/prisma";
import logger from "../../utils/logger";
import { sendFrostAlertEmail } from "../../utils/email";

const MODULE = "FROST_ALERT";

/** Minimum days between two frost alerts for the same cabin */
const ALERT_COOLDOWN_DAYS = 7;

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_min: number[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

/**
 * Fetch coordinates from Open-Meteo Geocoding API by location string.
 */
async function fetchCoordinates(location: string): Promise<{ lat: number; lon: number } | null> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=cs&format=json`;
  try {
    const res = await fetch(geoUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data.results || data.results.length === 0) return null;
    return {
      lat: data.results[0].latitude,
      lon: data.results[0].longitude,
    };
  } catch (error) {
    logger.error(MODULE, "Open-Meteo Geocoding failed", { error: String(error), location });
    return null;
  }
}

/**
 * Fetch 3-day minimum temperature forecast from Open-Meteo (no API key needed).
 */
async function fetchMinTemps(
  lat: number,
  lon: number
): Promise<{ dates: string[]; temps: number[] } | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_min&timezone=auto&forecast_days=3`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(MODULE, `Open-Meteo responded ${res.status} for ${lat},${lon}`);
      return null;
    }
    const data = (await res.json()) as OpenMeteoResponse;
    return {
      dates: data.daily.time,
      temps: data.daily.temperature_2m_min,
    };
  } catch (error) {
    logger.error(MODULE, "Open-Meteo fetch failed", { error: String(error), lat, lon });
    return null;
  }
}

/**
 * Main cron handler — called once a day (noon).
 * 1. Find cabins eligible for frost check.
 * 2. Query Open-Meteo for each.
 * 3. If any day ≤ 0 °C → email all cabin members → update cooldown.
 */
export async function checkFrostAlerts(): Promise<void> {
  logger.info(MODULE, "Starting frost alert check…");

  try {
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - ALERT_COOLDOWN_DAYS);

    // 1) Find eligible cabins — has weatherLocation, not winterized, cooldown expired
    const cabins = await prisma.cabin.findMany({
      where: {
        weatherLocation: { not: null },
        isWinterized: false,
        OR: [
          { lastFrostAlertAt: null },
          { lastFrostAlertAt: { lt: cooldownDate } },
        ],
      },
      include: {
        users: {
          where: {
            email: { not: null },
            isVerified: true,
            isBanned: false,
          },
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (cabins.length === 0) {
      logger.info(MODULE, "No eligible cabins for frost check.");
      return;
    }

    logger.info(MODULE, `Checking ${cabins.length} cabin(s)…`);

    let alertsSent = 0;

    for (const cabin of cabins) {
      // Skip cabins with no members with email
      if (cabin.users.length === 0) continue;

      if (!cabin.weatherLocation) continue;

      const coords = await fetchCoordinates(cabin.weatherLocation);
      if (!coords) {
        logger.warn(MODULE, `Could not geocode location for cabin "${cabin.name}"`, { location: cabin.weatherLocation });
        continue;
      }

      const forecast = await fetchMinTemps(coords.lat, coords.lon);
      if (!forecast) continue;

      // 2) Check for sub-zero temps
      const frostDays: { date: string; temp: number }[] = [];
      for (let i = 0; i < forecast.temps.length; i++) {
        if (forecast.temps[i] <= 0) {
          frostDays.push({ date: forecast.dates[i], temp: forecast.temps[i] });
        }
      }

      if (frostDays.length === 0) continue;

      // 3) Send emails to all cabin members
      const lowestTemp = Math.min(...frostDays.map((d) => d.temp));
      const frostDatesFormatted = frostDays
        .map((d) => {
          const dateObj = new Date(d.date + "T00:00:00");
          return `${dateObj.toLocaleDateString("cs-CZ")} (${d.temp} °C)`;
        })
        .join(", ");

      logger.warn(MODULE, `Frost detected for cabin "${cabin.name}"`, {
        cabinId: cabin.id,
        frostDays,
        lowestTemp,
      });

      const emailPromises = cabin.users
        .filter((u) => u.email)
        .map((user) =>
          sendFrostAlertEmail(
            user.email!,
            user.username,
            cabin.name,
            lowestTemp,
            frostDatesFormatted
          ).catch((err) => {
            logger.error(MODULE, `Failed to send frost email to ${user.email}`, {
              error: String(err),
              userId: user.id,
              cabinId: cabin.id,
            });
          })
        );

      await Promise.allSettled(emailPromises);

      // 4) Update cooldown timestamp
      await prisma.cabin.update({
        where: { id: cabin.id },
        data: { lastFrostAlertAt: new Date() },
      });

      alertsSent++;
    }

    logger.info(MODULE, `Frost check complete. Alerts sent for ${alertsSent} cabin(s).`);
  } catch (error) {
    logger.error(MODULE, "Frost alert cron failed", { error: String(error) });
  }
}
