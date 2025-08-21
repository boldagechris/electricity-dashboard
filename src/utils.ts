import { PriceRecord, CO2Record, CO2ApiResponse, ApiResponse } from './types';

// API Configuration
export const API_CONFIG = {
  PRICE_URL: 'https://api.energidataservice.dk/dataset/Elspotprices?limit=48&filter={"PriceArea":"DK2"}',
  CO2_URL: 'https://api.energidataservice.dk/dataset/CO2Emis?limit=288&filter={"PriceArea":"DK2"}',
  PROXIES: [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/get?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors.bridged.cc/',
    'https://api.codetabs.com/v1/proxy?quest='
  ]
};

// Helper Functions
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('da-DK', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen'
  });
};

export const formatPrice = (price: number): string => {
  return (price / 1000).toFixed(3);
};

export const getCurrentHour = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('da-DK', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen'
  });
};

export const getCurrentHourOnly = (): number => {
  const now = new Date();
  return now.getHours();
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('da-DK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTimeUntil = (targetDate: Date): string => {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}t ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
};

// Mock Data Generators
export const generateMockData = (): ApiResponse => {
  const now = new Date();
  const records: PriceRecord[] = [];
  
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now);
    hour.setHours(i, 0, 0, 0);
    
    let basePrice = 1500;
    if (i >= 17 && i <= 20) basePrice += 800;
    else if (i >= 7 && i <= 9) basePrice += 400;
    else if (i >= 23 || i <= 6) basePrice -= 600;
    
    basePrice += (Math.random() - 0.5) * 400;
    
    records.push({
      HourUTC: hour.toISOString(),
      HourDK: hour.toISOString(),
      SpotPriceDKK: Math.max(100, basePrice),
      PriceArea: "DK2"
    });
  }
  
  return { 
    total: records.length,
    limit: records.length,
    dataset: "Elspotprices",
    records 
  };
};

export const generateMockCO2Data = (): CO2ApiResponse => {
  const now = new Date();
  const records: CO2Record[] = [];
  
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now);
    hour.setHours(i, 0, 0, 0);
    
    let baseCO2 = 150;
    if (i >= 1 && i <= 6) baseCO2 -= 80;
    else if (i >= 22 || i <= 1) baseCO2 -= 50;
    else if (i >= 12 && i <= 16) baseCO2 += 100;
    else if (i >= 17 && i <= 20) baseCO2 += 150;
    
    baseCO2 += (Math.random() - 0.5) * 60;
    
    records.push({
      Minutes5UTC: hour.toISOString(),
      Minutes5DK: hour.toISOString(),
      CO2Emission: Math.max(30, Math.min(400, baseCO2)),
      PriceArea: "DK2"
    });
  }
  
  return { 
    total: records.length,
    limit: records.length,
    dataset: "CO2Emis",
    records 
  };
};
