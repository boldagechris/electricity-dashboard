import { ApiResponse, CO2ApiResponse, ApiStatus } from './types';
import { API_CONFIG, generateMockData, generateMockCO2Data } from './utils';

// API Service Class
export class ApiService {
  static async fetchWithProxies(url: string): Promise<any> {
    // Try direct API call first
    try {
      console.log('Trying direct API call...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Direct API call successful:', data.records?.length || 0, 'records');
        return { data, proxy: 'direct' };
      }
    } catch (error) {
      console.log('Direct API call failed (expected due to CORS):', (error as Error).message);
    }
    
    // Try CORS proxies
    for (const proxy of API_CONFIG.PROXIES) {
      try {
        console.log(`Trying proxy: ${proxy}`);
        let response: Response;
        let data: any;
        
        if (proxy.includes('allorigins')) {
          response = await fetch(proxy + encodeURIComponent(url));
          data = await response.json();
          data = JSON.parse(data.contents);
        } else if (proxy.includes('codetabs')) {
          response = await fetch(proxy + url);
          data = await response.json();
        } else {
          response = await fetch(proxy + url);
          data = await response.json();
        }
        
        if (data && data.records && data.records.length > 0) {
          console.log('✅ Proxy successful:', proxy, data.records.length, 'records');
          return { data, proxy };
        }
      } catch (error) {
        console.log(`❌ Proxy ${proxy} failed:`, (error as Error).message);
        continue;
      }
    }
    
    return null;
  }
  
  static async fetchPriceData(): Promise<{ data: ApiResponse; status: ApiStatus; proxy: string | null }> {
    try {
      const result = await this.fetchWithProxies(API_CONFIG.PRICE_URL);
      
      if (result) {
        return { data: result.data, status: 'working', proxy: result.proxy };
      } else {
        console.log('❌ All price API attempts failed, using mock data');
        return { data: generateMockData(), status: 'failed', proxy: null };
      }
    } catch (error) {
      console.error('❌ Failed to fetch price data:', error);
      return { data: generateMockData(), status: 'failed', proxy: null };
    }
  }
  
  static async fetchCO2Data(): Promise<{ data: CO2ApiResponse; status: ApiStatus }> {
    try {
      const result = await this.fetchWithProxies(API_CONFIG.CO2_URL);
      
      if (result) {
        return { data: result.data, status: 'working' };
      } else {
        console.log('❌ All CO2 API attempts failed, using mock data');
        return { data: generateMockCO2Data(), status: 'failed' };
      }
    } catch (error) {
      console.error('❌ Failed to fetch CO2 data:', error);
      return { data: generateMockCO2Data(), status: 'failed' };
    }
  }
  
  static async testAPIs(): Promise<{ priceStatus: ApiStatus; co2Status: ApiStatus }> {
    console.log('🧪 Testing API endpoints...');
    
    const testPriceUrl = 'https://api.energidataservice.dk/dataset/Elspotprices?limit=5&filter={"PriceArea":"DK2"}';
    const testCO2Url = 'https://api.energidataservice.dk/dataset/CO2Emis?limit=5&filter={"PriceArea":"DK2"}';
    
    let priceStatus: ApiStatus = 'unknown';
    let co2Status: ApiStatus = 'unknown';
    
    // Test price API
    try {
      const response = await fetch(testPriceUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Price API direct call successful:', data.records?.length || 0, 'records');
        priceStatus = 'working';
      } else {
        console.log('❌ Price API direct call failed:', response.status, response.statusText);
        priceStatus = 'failed';
      }
    } catch (error) {
      console.log('❌ Price API direct call error:', (error as Error).message);
      priceStatus = 'failed';
    }
    
    // Test CO2 API
    try {
      const response = await fetch(testCO2Url);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ CO2 API direct call successful:', data.records?.length || 0, 'records');
        co2Status = 'working';
      } else {
        console.log('❌ CO2 API direct call failed:', response.status, response.statusText);
        co2Status = 'failed';
      }
    } catch (error) {
      console.log('❌ CO2 API direct call error:', (error as Error).message);
      co2Status = 'failed';
    }
    
    return { priceStatus, co2Status };
  }
}
