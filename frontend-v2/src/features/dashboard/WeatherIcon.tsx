import { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudDrizzle, CloudLightning, CloudSnow, CloudFog, Snowflake, CloudSunRain, CloudMoonRain } from "lucide-react";

interface Props {
  icon: string;
  color?: string;
  size?: number;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  "cloud-lightning": CloudLightning,
  "cloud-snow": CloudSnow,
  fog: CloudFog,
  snowflake: Snowflake,
  "cloud-sun-rain": CloudSunRain,
  "cloud-moon-rain": CloudMoonRain,
};

export function WeatherIcon({ icon, color, size = 24, className }: Props) {
  const Icon = iconMap[icon] ?? Cloud;
  return <Icon size={size} color={color} className={className} />;
}
