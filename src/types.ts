// TypeScript interfaces and types
export interface PriceRecord {
  HourUTC: string;
  HourDK: string;
  PriceArea: string;
  SpotPriceDKK: number;
  SpotPriceEUR?: number;
}

export interface ApiResponse {
  total: number;
  limit: number;
  dataset: string;
  records: PriceRecord[];
}

export interface DailyRange {
  min: number;
  max: number;
  avg?: number;
}

export interface CheapHour {
  time: Date;
  price: number;
}

export interface GreenHour {
  time: Date;
  co2Emission: number;
}

export interface CO2Record {
  Minutes5UTC: string;
  Minutes5DK: string;
  PriceArea: string;
  CO2Emission: number;
}

export interface CO2ApiResponse {
  total: number;
  limit: number;
  dataset: string;
  records: CO2Record[];
}

export type PriceStatus = 'loading' | 'cheap' | 'neutral' | 'expensive';
export type GreenStatus = 'loading' | 'very-green' | 'green' | 'neutral' | 'dirty';
export type Language = 'da' | 'en';
export type ApiStatus = 'unknown' | 'working' | 'failed';
