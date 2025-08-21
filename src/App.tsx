import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, TrendingDown, Clock, Wifi, WifiOff, Lightbulb, Globe } from 'lucide-react';
import type { 
  PriceRecord, 
  DailyRange, 
  CheapHour, 
  GreenHour, 
  PriceStatus, 
  GreenStatus, 
  Language, 
  ApiStatus 
} from './types';
import { t } from './translations';
import { 
  formatTime, 
  formatPrice, 
  getCurrentHour, 
  getCurrentHourOnly,
  formatDate,
  formatTimeUntil
} from './utils';
import { ApiService } from './api';

const ElectricityDashboard: React.FC = () => {
  // UI State
  const [language, setLanguage] = useState<Language>('da');
  const [selectedProvider, setSelectedProvider] = useState<string>('andel');
  const [updateFrequency, setUpdateFrequency] = useState<'smart' | 'hourly'>('smart');
  
  // Price Data State
  const [priceData, setPriceData] = useState<PriceRecord[] | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceStatus, setPriceStatus] = useState<PriceStatus>('loading');
  const [dailyRange, setDailyRange] = useState<DailyRange>({ min: 0, max: 0 });
  const [priceDate, setPriceDate] = useState<Date | null>(null);
  const [nextCheapHours, setNextCheapHours] = useState<CheapHour[]>([]);
  
  // CO2 Data State
  const [currentCO2, setCurrentCO2] = useState<number | null>(null);
  const [greenStatus, setGreenStatus] = useState<GreenStatus>('loading');
  const [nextGreenHours, setNextGreenHours] = useState<GreenHour[]>([]);
  const [dailyCO2Range, setDailyCO2Range] = useState<{min: number, max: number}>({ min: 0, max: 0 });
  
  // API Status State
  const [priceApiStatus, setPriceApiStatus] = useState<ApiStatus>('unknown');
  const [co2ApiStatus, setCo2ApiStatus] = useState<ApiStatus>('unknown');
  const [workingProxy, setWorkingProxy] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [usingMockData, setUsingMockData] = useState<boolean>(false);
  
  // Update State
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);

  // Layout Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    maxWidth: { maxWidth: '1000px', margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' },
    
    // Header Styles
    header: { textAlign: 'center' as const, padding: '40px 0', position: 'relative' as const },
    title: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' },
    titleText: { fontSize: '2.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 },
    subtitle: { color: '#6b7280', fontSize: '1.125rem', margin: 0 },
    
    // Card Styles
    card: {
      backgroundColor: 'white',
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '32px',
      marginBottom: '24px'
    },
    mainCard: {
      backgroundColor: 'white',
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '32px',
      textAlign: 'center' as const,
      marginBottom: '24px'
    },
    
    // Price Display Styles
    statusCircle: {
      width: '128px',
      height: '128px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      transition: 'transform 0.3s ease',
      cursor: 'pointer'
    },
    priceDisplay: { fontSize: '3rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' },
    priceUnit: { fontSize: '1.5rem', color: '#6b7280', marginLeft: '8px' },
    
    // Button Styles
    button: {
      backgroundColor: '#4f46e5',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '12px',
      fontWeight: '500',
      fontSize: '1rem',
      cursor: 'pointer',
      boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
      transition: 'all 0.3s ease'
    }
  };

  // UI Helper Functions
  const getStatusColor = (): string => {
    switch (priceStatus) {
      case 'cheap': return '#22c55e';
      case 'expensive': return '#ef4444';
      case 'neutral': return '#eab308';
      default: return '#9ca3af';
    }
  };

  const getStatusText = (): string => {
    switch (priceStatus) {
      case 'cheap': return t(language, 'perfectTime');
      case 'expensive': return t(language, 'waitPeak');
      case 'neutral': return t(language, 'waitBetter');
      default: return t(language, 'loadingRecommendations');
    }
  };

  // Recommendation Logic Helper Functions
  const getTodayRecords = () => {
    if (!priceData || priceData.length === 0) return [];
    return priceData.filter(record => {
      const recordDate = new Date(record.HourDK);
      return recordDate.getDate() === new Date().getDate();
    });
  };

  const getCheapestHours = (todayRecords: PriceRecord[]) => {
    const prices = todayRecords.map(r => r.SpotPriceDKK);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const cheapThreshold = avgPrice * 0.8;
    
    return todayRecords
      .filter(record => record.SpotPriceDKK <= cheapThreshold)
      .sort((a, b) => a.SpotPriceDKK - b.SpotPriceDKK)
      .slice(0, 3);
  };

  const getCurrentRecord = (todayRecords: PriceRecord[]) => {
    const currentHour = getCurrentHourOnly();
    return todayRecords.find(record => {
      const recordDate = new Date(record.HourDK);
      return recordDate.getHours() === currentHour;
    });
  };

  const getApplianceRecommendation = () => {
    const currentHour = getCurrentHourOnly();
    const isPriceGood = priceStatus === 'cheap';
    const isGreenGood = greenStatus === 'very-green' || greenStatus === 'green';
    const isNightHour = currentHour >= 23 || currentHour <= 6;
    const isPeakHour = currentHour >= 17 && currentHour <= 20;
    
    // Try to get recommendation from API data
    const todayRecords = getTodayRecords();
    if (todayRecords.length > 0) {
      const cheapestHours = getCheapestHours(todayRecords);
      const currentRecord = getCurrentRecord(todayRecords);
      const avgPrice = todayRecords.map(r => r.SpotPriceDKK).reduce((sum, price) => sum + price, 0) / todayRecords.length;
      const cheapThreshold = avgPrice * 0.8;
      
      // Check if current hour is one of the cheapest
      if (currentRecord && currentRecord.SpotPriceDKK <= cheapThreshold) {
        return { 
          shouldStart: true, 
          message: `🎯 Perfekt tidspunkt! Nuværende pris: ${(currentRecord.SpotPriceDKK/1000).toFixed(3)} DKK/kWh - en af dagens billigste timer!`, 
          nextBestTime: null, 
          waitReason: "" 
        };
      }
      
      // Find next best time
      const nextCheapHour = cheapestHours.find(record => {
        const recordDate = new Date(record.HourDK);
        return recordDate.getHours() > currentHour;
      });
      
      if (nextCheapHour) {
        const nextTime = new Date(nextCheapHour.HourDK);
        return {
          shouldStart: false,
          message: `⏳ Vent til ${formatTime(nextTime)} - pris: ${(nextCheapHour.SpotPriceDKK/1000).toFixed(3)} DKK/kWh`,
          nextBestTime: formatTime(nextTime),
          waitReason: `Billigere timer kommer senere i dag`
        };
      }
      
      // If no cheap hours left today, recommend tomorrow
      if (cheapestHours.length > 0) {
        const bestTime = new Date(cheapestHours[0].HourDK);
        return {
          shouldStart: false,
          message: `🌙 Vent til i morgen ${formatTime(bestTime)} - pris: ${(cheapestHours[0].SpotPriceDKK/1000).toFixed(3)} DKK/kWh`,
          nextBestTime: formatTime(bestTime),
          waitReason: `Dagens billigste timer er allerede passeret`
        };
      }
    }
    
    // Fallback to original logic
    if (isPriceGood && isGreenGood) {
      return { shouldStart: true, message: t(language, 'perfectTime'), nextBestTime: null, waitReason: "" };
    }
    if (isPriceGood) {
      return { shouldStart: true, message: t(language, 'goodTime'), nextBestTime: null, waitReason: "" };
    }
    if (isNightHour && !isPeakHour) {
      return { shouldStart: true, message: t(language, 'nightGood'), nextBestTime: null, waitReason: "" };
    }
    if (isPeakHour) {
      return { shouldStart: false, message: t(language, 'waitPeak'), nextBestTime: "23:00", waitReason: t(language, 'peakReason') };
    }
    return {
      shouldStart: false,
      message: t(language, 'waitBetter'),
      nextBestTime: nextCheapHours.length > 0 ? formatTime(nextCheapHours[0].time) : "23:00",
      waitReason: t(language, 'waitReason')
    };
  };

  // Data Processing Helper Functions
  const processPriceData = (records: PriceRecord[]) => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find current hour's record (for today or tomorrow)
    let currentRecord = records.find(record => {
      const recordDate = new Date(record.HourDK);
      const recordHour = recordDate.getHours();
      const recordDay = recordDate.getDate();
      const nowDay = now.getDate();
      
      return recordDay === nowDay && recordHour === currentHour;
    });
    
    // If not found, get the first record for today
    if (!currentRecord) {
      currentRecord = records.find(record => {
        const recordDate = new Date(record.HourDK);
        return recordDate.getDate() === now.getDate();
      });
    }
    
    // If still not found, get the first available record
    if (!currentRecord) {
      currentRecord = records[0];
    }
    
    if (currentRecord) {
      setCurrentPrice(currentRecord.SpotPriceDKK);
      setLastUpdate(new Date(currentRecord.HourDK));
      setPriceDate(new Date(currentRecord.HourDK));
    }
    
    // Get today's records for calculations
    const todayRecords = records.filter(record => {
      const recordDate = new Date(record.HourDK);
      return recordDate.getDate() === now.getDate();
    });
    
    const prices = todayRecords.length > 0 ? todayRecords.map(r => r.SpotPriceDKK) : records.map(r => r.SpotPriceDKK);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    setDailyRange({ min: minPrice, max: maxPrice });
    
    // Store average price for display
    setDailyRange(prev => ({ ...prev, avg: avgPrice }));
    
    // Use average price for status calculation
    const priceRatio = currentRecord.SpotPriceDKK / avgPrice;
    let status: PriceStatus = 'neutral';
    if (priceRatio <= 0.8) status = 'cheap';
    else if (priceRatio >= 1.2) status = 'expensive';
    setPriceStatus(status);
    
    // Use average price for cheap threshold
    const cheapThreshold = avgPrice * 0.8;
    const upcomingCheap = records
      .filter(record => {
        const recordTime = new Date(record.HourDK);
        return recordTime > now && record.SpotPriceDKK <= cheapThreshold;
      })
      .slice(0, 3)
      .map(record => ({
        time: new Date(record.HourDK),
        price: record.SpotPriceDKK
      }));
    
    setNextCheapHours(upcomingCheap);
    setPriceData(records);
    setIsOnline(true);
  };

  const processCO2Data = (records: any[]) => {
    const now = new Date();
    const currentHour = now.getHours();
    
    const currentHourRecords = records.filter(record => {
      const recordDate = new Date(record.Minutes5DK);
      return recordDate.getHours() === currentHour;
    });
    
    if (currentHourRecords.length > 0) {
      const avgCO2 = currentHourRecords.reduce((sum, record) => sum + record.CO2Emission, 0) / currentHourRecords.length;
      setCurrentCO2(avgCO2);
    }
    
    const emissions = records.map(r => r.CO2Emission);
    const minCO2 = Math.min(...emissions);
    const maxCO2 = Math.max(...emissions);
    setDailyCO2Range({ min: minCO2, max: maxCO2 });
    
    const currentRecord = currentHourRecords[0];
    if (currentRecord) {
      const co2Position = (currentRecord.CO2Emission - minCO2) / (maxCO2 - minCO2);
      let status: GreenStatus = 'neutral';
      if (co2Position <= 0.2) status = 'very-green';
      else if (co2Position <= 0.4) status = 'green';
      else if (co2Position >= 0.8) status = 'dirty';
      setGreenStatus(status);
    }
  };

  // Main Data Fetching Function
  const fetchData = async () => {
    try {
      // Fetch price data
      const priceResult = await ApiService.fetchPriceData();
      setPriceApiStatus(priceResult.status);
      setWorkingProxy(priceResult.proxy);
      setUsingMockData(priceResult.status === 'failed');
      
      if (priceResult.data.records?.length > 0) {
        processPriceData(priceResult.data.records);
      }
      
      // Fetch CO2 data
      const co2Result = await ApiService.fetchCO2Data();
      setCo2ApiStatus(co2Result.status);
      
      if (co2Result.data.records?.length > 0) {
        processCO2Data(co2Result.data.records);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsOnline(false);
    }
  };

  // API Testing Function
  const testAPIs = async () => {
    const result = await ApiService.testAPIs();
    setPriceApiStatus(result.priceStatus);
    setCo2ApiStatus(result.co2Status);
  };

  // Smart Refresh Strategy - Schedule API updates
  useEffect(() => {
    fetchData(); // Initial fetch
    
    // Schedule next API update based on frequency
    const scheduleNextUpdate = () => {
      const now = new Date();
      
      let nextUpdateTime: Date;
      
      if (updateFrequency === 'hourly') {
        // Hourly updates: next hour + 2 seconds
        nextUpdateTime = new Date(now);
        nextUpdateTime.setHours(nextUpdateTime.getHours() + 1, 0, 2, 0);
      } else {
        // Smart updates: only at 13:00 when Energinet updates
        const hour = now.getHours();
        
        if (hour < 13) {
          // Før kl. 13:00 - vent til kl. 13:00 i dag
          nextUpdateTime = new Date(now);
          nextUpdateTime.setHours(13, 0, 0, 0);
        } else if (hour < 24) {
          // Efter kl. 13:00 - vent til kl. 13:00 i morgen
          nextUpdateTime = new Date(now);
          nextUpdateTime.setDate(nextUpdateTime.getDate() + 1);
          nextUpdateTime.setHours(13, 0, 0, 0);
        } else {
          // Kl. 00:00 - vent til kl. 13:00 i dag
          nextUpdateTime = new Date(now);
          nextUpdateTime.setHours(13, 0, 0, 0);
        }
      }
      
      const timeUntilUpdate = nextUpdateTime.getTime() - now.getTime();
      
      setNextUpdate(nextUpdateTime);

      
      return setTimeout(() => {
        fetchData();
        scheduleNextUpdate(); // Schedule next update
      }, timeUntilUpdate);
    };
    
    const timeoutId = scheduleNextUpdate();
    
    return () => clearTimeout(timeoutId);
  }, [updateFrequency]);

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>
            <Zap size={40} color="#4f46e5" />
            <h1 style={styles.titleText}>{t(language, 'title')}</h1>
          </div>
          <p style={styles.subtitle}>{t(language, 'subtitle')}</p>
          
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'da' ? 'en' : 'da')}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
          >
            <Globe size={16} />
            {language === 'da' ? 'EN' : 'DA'}
          </button>
        </div>

        {/* Status Bar */}
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.875rem', marginBottom: '24px'}}>
          {isOnline && !usingMockData ? (
            <>
              <Wifi size={16} color="#22c55e" />
              <span style={{color: '#22c55e'}}>{t(language, 'liveData')}</span>
            </>
          ) : usingMockData ? (
            <>
              <Wifi size={16} color="#f59e0b" />
              <span style={{color: '#f59e0b'}}>{t(language, 'demoMode')}</span>
            </>
          ) : (
            <>
              <WifiOff size={16} color="#ef4444" />
              <span style={{color: '#ef4444'}}>{t(language, 'connectionError')}</span>
            </>
          )}
          {lastUpdate && (
            <span style={{color: '#6b7280', marginLeft: '16px'}}>
              {t(language, 'lastUpdate')}: {formatTime(lastUpdate)}
            </span>
          )}
          {priceDate && (
            <span style={{color: '#6b7280', marginLeft: '16px'}}>
              📅 {t(language, 'priceDate')}: {formatDate(priceDate)}
            </span>
          )}
          {nextUpdate && (
            <span style={{color: '#6b7280', marginLeft: '16px'}}>
              🔄 Næste opdatering: {nextUpdate.toLocaleTimeString('da-DK', {hour: '2-digit', minute: '2-digit'})} (om {formatTimeUntil(nextUpdate)})
              <span style={{color: updateFrequency === 'hourly' ? '#4f46e5' : '#6b7280', marginLeft: '4px'}}>
                ({updateFrequency === 'hourly' ? 'Hver time' : 'Smart'})
              </span>
            </span>
          )}
        </div>

        {/* Main Price Display */}
        <div style={styles.mainCard}>
          <div 
            style={{...styles.statusCircle, backgroundColor: getStatusColor()}}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{color: 'white', textAlign: 'center' as const}}>
              <Clock size={20} color="white" style={{marginBottom: '4px'}} />
              <div style={{fontSize: '1rem', fontWeight: '600', marginBottom: '4px'}}>
                {getCurrentHour()}
              </div>
              <Zap size={32} color="white" />
              <div style={{fontSize: '0.875rem', fontWeight: '600', marginTop: '8px'}}>
                {priceStatus.toUpperCase()}
              </div>
            </div>
          </div>

          <div>
            <div style={styles.priceDisplay}>
              {currentPrice ? `${formatPrice(currentPrice)}` : '--'}
              <span style={styles.priceUnit}>DKK/kWh</span>
            </div>
            <div style={{fontSize: '1.25rem', color: '#6b7280', fontWeight: '500', marginBottom: '16px'}}>
              {getStatusText()}
            </div>
            
            {/* CO2 Metrics */}
            {currentCO2 && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px'}}>
                  <Globe size={16} color="#10b981" />
                  <span style={{fontSize: '0.9rem', fontWeight: '600', color: '#374151'}}>CO₂ Status</span>
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '12px'}}>
                  <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '2px'}}>
                      {currentCO2.toFixed(0)}
                    </div>
                    <div style={{fontSize: '0.7rem', color: '#6b7280'}}>g CO₂/kWh</div>
                  </div>
                  
                  <div style={{textAlign: 'center'}}>
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: greenStatus === 'very-green' ? '#10b981' : 
                             greenStatus === 'green' ? '#22c55e' : 
                             greenStatus === 'dirty' ? '#ef4444' : '#6b7280',
                      marginBottom: '2px'
                    }}>
                      {greenStatus === 'very-green' ? '🌱 Meget Grøn' :
                       greenStatus === 'green' ? '🌿 Grøn' :
                       greenStatus === 'dirty' ? '🌫️ Beskidt' : '⚪ Neutral'}
                    </div>
                    <div style={{fontSize: '0.7rem', color: '#6b7280'}}>Energi Status</div>
                  </div>
                </div>
                
                {dailyCO2Range.min > 0 && dailyCO2Range.max > 0 && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '6px'
                  }}>
                    Dagens CO₂: {dailyCO2Range.min.toFixed(0)} - {dailyCO2Range.max.toFixed(0)} g/kWh
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Appliance Recommendation */}
        <div style={{
          ...styles.card,
          background: getApplianceRecommendation().shouldStart ? 
            'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 
            'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: getApplianceRecommendation().shouldStart ? 
            '2px solid #22c55e' : '2px solid #f59e0b'
        }}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '1.5rem', marginBottom: '12px'}}>
              {getApplianceRecommendation().shouldStart ? '✅' : '⏳'}
            </div>
            <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: '0 0 12px 0'}}>
              {t(language, 'washingMachine')}
            </h2>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: getApplianceRecommendation().shouldStart ? '#16a34a' : '#d97706',
              marginBottom: '8px'
            }}>
              {getApplianceRecommendation().shouldStart ? t(language, 'startNow') : t(language, 'wait')}
            </div>
            <p style={{fontSize: '1.1rem', color: '#374151', margin: '8px 0', fontWeight: '500'}}>
              {getApplianceRecommendation().message}
            </p>
          </div>
          
          {/* Show cheapest hours for today */}
          {priceData && priceData.length > 0 && (
            <div style={{marginTop: '20px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '12px'}}>
              <h3 style={{fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0', textAlign: 'center'}}>
                💰 Billige Timer i Dag (DK2)
              </h3>
              <p style={{fontSize: '0.8rem', color: '#6b7280', margin: '0 0 12px 0', textAlign: 'center'}}>
                Kronologisk rækkefølge - under 80% af gennemsnitspris
              </p>
              
                             {/* Time periods overview */}
               <div style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px'}}>
                 <h4 style={{fontSize: '0.9rem', fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0', textAlign: 'center'}}>
                   🌅 Billigste Timer per Periode
                 </h4>
                 <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px'}}>
                   {(() => {
                     const todayRecords = priceData.filter(record => {
                       const recordDate = new Date(record.HourDK);
                       return recordDate.getDate() === new Date().getDate();
                     });
                     
                     if (todayRecords.length > 0) {
                       const prices = todayRecords.map((r: PriceRecord) => r.SpotPriceDKK);
                       const avgPrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
                       const cheapThreshold = avgPrice * 0.8;
                       
                       // Find cheapest hour for each period
                       const morningHours = todayRecords.filter((record: PriceRecord) => {
                         const hour = new Date(record.HourDK).getHours();
                         return hour >= 6 && hour < 12;
                       });
                       
                       const afternoonHours = todayRecords.filter((record: PriceRecord) => {
                         const hour = new Date(record.HourDK).getHours();
                         return hour >= 12 && hour < 18;
                       });
                       
                                               const eveningHours = todayRecords.filter((record: PriceRecord) => {
                          const hour = new Date(record.HourDK).getHours();
                          return hour >= 18 && hour < 24;
                        });
                        
                        // Find tomorrow's night hours (00:00-06:00)
                        const tomorrowRecords = priceData.filter(record => {
                          const recordDate = new Date(record.HourDK);
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          return recordDate.getDate() === tomorrow.getDate();
                        });
                        
                        const nightHours = tomorrowRecords.filter((record: PriceRecord) => {
                          const hour = new Date(record.HourDK).getHours();
                          return hour >= 0 && hour < 6;
                        });
                        
                        // Helper function to find cheapest hour in a period
                        const getCheapestHour = (hours: PriceRecord[]) => {
                          return hours
                            .filter(record => record.SpotPriceDKK <= cheapThreshold)
                            .sort((a, b) => a.SpotPriceDKK - b.SpotPriceDKK)[0];
                        };
                        
                        const morningCheapest = getCheapestHour(morningHours);
                        const afternoonCheapest = getCheapestHour(afternoonHours);
                        const eveningCheapest = getCheapestHour(eveningHours);
                        const nightCheapest = getCheapestHour(nightHours);
                      
                      return (
                        <>
                          <div style={{
                            padding: '8px',
                            backgroundColor: morningCheapest ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '6px',
                            textAlign: 'center',
                            border: morningCheapest ? '1px solid #dcfce7' : '1px solid #fecaca'
                          }}>
                            <div style={{fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px'}}>
                              🌅 Morgen (06-12)
                            </div>
                            {morningCheapest ? (
                              <>
                                <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#16a34a'}}>
                                  {formatTime(new Date(morningCheapest.HourDK))}
                                </div>
                                <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                                  {(morningCheapest.SpotPriceDKK/1000).toFixed(3)} DKK
                                </div>
                              </>
                            ) : (
                              <div style={{fontSize: '0.7rem', color: '#dc2626'}}>
                                Ingen billige timer
                              </div>
                            )}
                          </div>
                          
                          <div style={{
                            padding: '8px',
                            backgroundColor: afternoonCheapest ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '6px',
                            textAlign: 'center',
                            border: afternoonCheapest ? '1px solid #dcfce7' : '1px solid #fecaca'
                          }}>
                            <div style={{fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px'}}>
                              ☀️ Eftermiddag (12-18)
                            </div>
                            {afternoonCheapest ? (
                              <>
                                <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#16a34a'}}>
                                  {formatTime(new Date(afternoonCheapest.HourDK))}
                                </div>
                                <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                                  {(afternoonCheapest.SpotPriceDKK/1000).toFixed(3)} DKK
                                </div>
                              </>
                            ) : (
                              <div style={{fontSize: '0.7rem', color: '#dc2626'}}>
                                Ingen billige timer
                              </div>
                            )}
                          </div>
                          
                                                     <div style={{
                             padding: '8px',
                             backgroundColor: eveningCheapest ? '#f0fdf4' : '#fef2f2',
                             borderRadius: '6px',
                             textAlign: 'center',
                             border: eveningCheapest ? '1px solid #dcfce7' : '1px solid #fecaca'
                           }}>
                             <div style={{fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px'}}>
                               🌙 Aften (18-00)
                             </div>
                             {eveningCheapest ? (
                               <>
                                 <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#16a34a'}}>
                                   {formatTime(new Date(eveningCheapest.HourDK))}
                                 </div>
                                 <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                                   {(eveningCheapest.SpotPriceDKK/1000).toFixed(3)} DKK
                                 </div>
                               </>
                             ) : (
                               <div style={{fontSize: '0.7rem', color: '#dc2626'}}>
                                 Ingen billige timer
                               </div>
                             )}
                           </div>
                           
                           <div style={{
                             padding: '8px',
                             backgroundColor: nightCheapest ? '#f0fdf4' : '#fef2f2',
                             borderRadius: '6px',
                             textAlign: 'center',
                             border: nightCheapest ? '1px solid #dcfce7' : '1px solid #fecaca'
                           }}>
                             <div style={{fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px'}}>
                               🌌 Nat i morgen (00-06)
                             </div>
                             {nightCheapest ? (
                               <>
                                 <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#16a34a'}}>
                                   {formatTime(new Date(nightCheapest.HourDK))}
                                 </div>
                                 <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                                   {(nightCheapest.SpotPriceDKK/1000).toFixed(3)} DKK
                                 </div>
                               </>
                             ) : (
                               <div style={{fontSize: '0.7rem', color: '#dc2626'}}>
                                 Ingen billige timer
                               </div>
                             )}
                           </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px'}}>
                {(() => {
                  const todayRecords = priceData.filter(record => {
                    const recordDate = new Date(record.HourDK);
                    return recordDate.getDate() === new Date().getDate();
                  });
                  
                                     if (todayRecords.length > 0) {
                     const prices = todayRecords.map(r => r.SpotPriceDKK);
                     const minPrice = Math.min(...prices);
                     const maxPrice = Math.max(...prices);
                     const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
                     const cheapThreshold = avgPrice * 0.8; // Under 80% af gennemsnit
                    
                    const cheapestHours = todayRecords
                      .filter(record => record.SpotPriceDKK <= cheapThreshold)
                      .sort((a, b) => new Date(a.HourDK).getTime() - new Date(b.HourDK).getTime()) // Kronologisk sortering
                      .slice(0, 5);
                    
                    return cheapestHours.map((record, index) => {
                      const recordDate = new Date(record.HourDK);
                      const isCurrentHour = recordDate.getHours() === getCurrentHourOnly();
                      
                      return (
                        <div key={index} style={{
                          padding: '8px',
                          backgroundColor: isCurrentHour ? '#22c55e' : '#f0fdf4',
                          borderRadius: '8px',
                          textAlign: 'center',
                          border: isCurrentHour ? '2px solid #16a34a' : '1px solid #dcfce7'
                        }}>
                          <div style={{fontSize: '0.9rem', fontWeight: '600', color: isCurrentHour ? 'white' : '#16a34a'}}>
                            {formatTime(recordDate)}
                          </div>
                          <div style={{fontSize: '0.8rem', color: isCurrentHour ? 'white' : '#15803d'}}>
                            {(record.SpotPriceDKK/1000).toFixed(3)} DKK
                          </div>
                          {isCurrentHour && (
                            <div style={{fontSize: '0.7rem', color: 'white', marginTop: '2px'}}>
                              NU
                            </div>
                          )}
                        </div>
                      );
                    });
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Savings Calculator */}
        <div style={styles.card}>
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0'}}>
              💰 Besparelsesberegner
            </h2>
            <p style={{fontSize: '1rem', color: '#6b7280', margin: '0 0 12px 0'}}>
              Hvad sparer du ved at bruge billige timer?
            </p>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              <label style={{fontSize: '0.9rem', fontWeight: '500', color: '#374151'}}>
                Vælg udbyder:
              </label>
              <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="energinet">Energinet (kun spotpris)</option>
                <option value="ok">OK (+0.10 DKK/kWh)</option>
                <option value="eon">E.ON (+0.12 DKK/kWh)</option>
                <option value="norlys">Norlys (+0.14 DKK/kWh)</option>
                <option value="andel">Andel Energi (+0.15 DKK/kWh)</option>
                <option value="vattenfall">Vattenfall (+0.18 DKK/kWh)</option>
              </select>
            </div>
          </div>
          
          {priceData && priceData.length > 0 && (() => {
            const todayRecords = priceData.filter(record => {
              const recordDate = new Date(record.HourDK);
              return recordDate.getDate() === new Date().getDate();
            });
            
            if (todayRecords.length > 0) {
              const prices = todayRecords.map((r: PriceRecord) => r.SpotPriceDKK);
              const avgPrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
              const cheapThreshold = avgPrice * 0.8;
              
              // Find cheap and expensive hours
              const cheapHours = todayRecords.filter(record => record.SpotPriceDKK <= cheapThreshold);
              const expensiveHours = todayRecords.filter(record => record.SpotPriceDKK > avgPrice * 1.2);
              
              // Appliance power consumption (kWh per cycle)
              const appliances = {
                vaskemaskine: 1.5,    // kWh per vask
                tørretumbler: 3.0,    // kWh per tørring
                opvasker: 1.2         // kWh per opvask
              };
              
              // Provider add-ons (DKK/kWh on top of spot price)
              const providerAddOns: Record<string, number> = {
                energinet: 0.0,       // Energinet spotpris (basis)
                andel: 0.15,          // Andel Energi tillæg
                eon: 0.12,            // E.ON tillæg
                vattenfall: 0.18,     // Vattenfall tillæg
                ok: 0.10,             // OK tillæg
                norlys: 0.14          // Norlys tillæg
              };
              
              // Savings Calculation Helper Function
              const calculateSavings = (appliance: keyof typeof appliances) => {
                const consumption = appliances[appliance];
                const addOn = providerAddOns[selectedProvider] || 0;
                
                const cheapPrice = cheapHours.length > 0 ? 
                  cheapHours.reduce((sum, record) => sum + record.SpotPriceDKK, 0) / cheapHours.length : 0;
                const expensivePrice = expensiveHours.length > 0 ? 
                  expensiveHours.reduce((sum, record) => sum + record.SpotPriceDKK, 0) / expensiveHours.length : avgPrice;
                
                // Add provider add-on to prices
                const cheapPriceWithAddOn = (cheapPrice / 1000) + addOn;
                const expensivePriceWithAddOn = (expensivePrice / 1000) + addOn;
                
                const cheapCost = cheapPriceWithAddOn * consumption;
                const expensiveCost = expensivePriceWithAddOn * consumption;
                const savings = expensiveCost - cheapCost;
                
                return {
                  cheapCost: cheapCost.toFixed(2),
                  expensiveCost: expensiveCost.toFixed(2),
                  savings: savings.toFixed(2),
                  percentage: ((savings / expensiveCost) * 100).toFixed(1),
                  cheapPriceWithAddOn: cheapPriceWithAddOn.toFixed(3),
                  expensivePriceWithAddOn: expensivePriceWithAddOn.toFixed(3)
                };
              };
              
              const vaskemaskineSavings = calculateSavings('vaskemaskine');
              const tørretumblerSavings = calculateSavings('tørretumbler');
              const opvaskerSavings = calculateSavings('opvasker');
              
              // Total savings if all appliances are used
              const totalSavings = (
                parseFloat(vaskemaskineSavings.savings) + 
                parseFloat(tørretumblerSavings.savings) + 
                parseFloat(opvaskerSavings.savings)
              ).toFixed(2);
              
              return (
                <>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      border: '2px solid #dcfce7',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '1.2rem', marginBottom: '8px'}}>🧺 Vaskemaskine</div>
                      <div style={{fontSize: '0.9rem', color: '#6b7280', marginBottom: '8px'}}>
                        {appliances.vaskemaskine} kWh per vask
                      </div>
                      <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '4px'}}>
                        Sparer {vaskemaskineSavings.savings} DKK
                      </div>
                      <div style={{fontSize: '0.8rem', color: '#15803d'}}>
                        ({vaskemaskineSavings.percentage}% besparelse)
                      </div>
                      <div style={{fontSize: '0.7rem', color: '#6b7280', marginTop: '4px'}}>
                        Billig: {vaskemaskineSavings.cheapCost} DKK | Dyr: {vaskemaskineSavings.expensiveCost} DKK
                      </div>
                      <div style={{fontSize: '0.6rem', color: '#9ca3af', marginTop: '2px'}}>
                        ({vaskemaskineSavings.cheapPriceWithAddOn} DKK/kWh | {vaskemaskineSavings.expensivePriceWithAddOn} DKK/kWh)
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      border: '2px solid #dcfce7',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '1.2rem', marginBottom: '8px'}}>🌀 Tørretumbler</div>
                      <div style={{fontSize: '0.9rem', color: '#6b7280', marginBottom: '8px'}}>
                        {appliances.tørretumbler} kWh per vask
                      </div>
                      <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '4px'}}>
                        Sparer {tørretumblerSavings.savings} DKK
                      </div>
                      <div style={{fontSize: '0.8rem', color: '#15803d'}}>
                        ({tørretumblerSavings.percentage}% besparelse)
                      </div>
                      <div style={{fontSize: '0.7rem', color: '#6b7280', marginTop: '4px'}}>
                        Billig: {tørretumblerSavings.cheapCost} DKK | Dyr: {tørretumblerSavings.expensiveCost} DKK
                      </div>
                      <div style={{fontSize: '0.6rem', color: '#9ca3af', marginTop: '2px'}}>
                        ({tørretumblerSavings.cheapPriceWithAddOn} DKK/kWh | {tørretumblerSavings.expensivePriceWithAddOn} DKK/kWh)
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      border: '2px solid #dcfce7',
                      textAlign: 'center'
                    }}>
                      <div style={{fontSize: '1.2rem', marginBottom: '8px'}}>🍽️ Opvasker</div>
                      <div style={{fontSize: '0.9rem', color: '#6b7280', marginBottom: '8px'}}>
                        {appliances.opvasker} kWh per opvask
                      </div>
                      <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '4px'}}>
                        Sparer {opvaskerSavings.savings} DKK
                      </div>
                      <div style={{fontSize: '0.8rem', color: '#15803d'}}>
                        ({opvaskerSavings.percentage}% besparelse)
                      </div>
                      <div style={{fontSize: '0.7rem', color: '#6b7280', marginTop: '4px'}}>
                        Billig: {opvaskerSavings.cheapCost} DKK | Dyr: {opvaskerSavings.expensiveCost} DKK
                      </div>
                      <div style={{fontSize: '0.6rem', color: '#9ca3af', marginTop: '2px'}}>
                        ({opvaskerSavings.cheapPriceWithAddOn} DKK/kWh | {opvaskerSavings.expensivePriceWithAddOn} DKK/kWh)
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    backgroundColor: '#1f2937',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: 'white'
                  }}>
                    <div style={{fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '4px'}}>
                      💰 Total Besparelse
                    </div>
                    <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '8px'}}>
                      {totalSavings} DKK per dag
                    </div>
                    <div style={{fontSize: '0.9rem', color: '#9ca3af'}}>
                      Hvis alle apparater bruges i billige timer i stedet for dyre timer
                    </div>
                  </div>
                  
                  {/* Årlig Besparelse Beregning */}
                  <div style={{
                    marginTop: '16px',
                    padding: '20px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    border: '2px solid #f59e0b',
                    textAlign: 'center'
                  }}>
                    <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#92400e', marginBottom: '12px'}}>
                      📅 Årlig Besparelse ved at følge anbefalinger
                    </div>
                    
                    {(() => {
                      // Beregn årlig besparelse baseret på forskellige scenarier
                      const dailySavings = parseFloat(totalSavings);
                      
                      // Scenario 1: Optimal (alle apparater i billige timer)
                      const optimalYearly = dailySavings * 365;
                      
                      // Scenario 2: Realistisk (70% af optimal)
                      const realisticYearly = optimalYearly * 0.7;
                      
                      // Scenario 3: Konservativ (50% af optimal)
                      const conservativeYearly = optimalYearly * 0.5;
                      
                      // Beregn også besparelse per apparat per år
                      const vaskemaskineYearly = parseFloat(vaskemaskineSavings.savings) * 365 * 0.7; // 70% compliance
                      const tørretumblerYearly = parseFloat(tørretumblerSavings.savings) * 365 * 0.6; // 60% compliance
                      const opvaskerYearly = parseFloat(opvaskerSavings.savings) * 365 * 0.8; // 80% compliance
                      
                      const totalRealisticYearly = vaskemaskineYearly + tørretumblerYearly + opvaskerYearly;
                      
                      return (
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
                          <div style={{
                            padding: '12px',
                            backgroundColor: '#dcfce7',
                            borderRadius: '8px',
                            border: '1px solid #22c55e'
                          }}>
                            <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#15803d', marginBottom: '4px'}}>
                              🎯 Realistisk Årlig
                            </div>
                            <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a'}}>
                              {totalRealisticYearly.toFixed(0)} DKK
                            </div>
                            <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                              Baseret på realistisk compliance
                            </div>
                          </div>
                          
                          <div style={{
                            padding: '12px',
                            backgroundColor: '#fef3c7',
                            borderRadius: '8px',
                            border: '1px solid #f59e0b'
                          }}>
                            <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#92400e', marginBottom: '4px'}}>
                              ⭐ Optimal Årlig
                            </div>
                            <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706'}}>
                              {optimalYearly.toFixed(0)} DKK
                            </div>
                            <div style={{fontSize: '0.7rem', color: '#92400e'}}>
                              Hvis alle anbefalinger følges
                            </div>
                          </div>
                          
                          <div style={{
                            padding: '12px',
                            backgroundColor: '#fef2f2',
                            borderRadius: '8px',
                            border: '1px solid #ef4444'
                          }}>
                            <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '4px'}}>
                              📊 Gennemsnit per Måned
                            </div>
                            <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626'}}>
                              {(totalRealisticYearly / 12).toFixed(0)} DKK
                            </div>
                            <div style={{fontSize: '0.7rem', color: '#991b1b'}}>
                              Realistisk månedlig besparelse
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                                         <div style={{
                       marginTop: '16px',
                       padding: '12px',
                       backgroundColor: '#f8fafc',
                       borderRadius: '8px',
                       border: '1px solid #cbd5e1'
                     }}>
                       <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px'}}>
                         📋 Compliance Antagelser:
                       </div>
                       <div style={{fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4'}}>
                         • Vaskemaskine: 70% af vaske i billige timer<br/>
                         • Tørretumbler: 60% af tørringer i billige timer<br/>
                         • Opvasker: 80% af opvaske i billige timer<br/>
                         • Baseret på typisk dansk forbrugsmønster
                       </div>
                     </div>
                   </div>
                   
                   {/* CO2 Besparelse Beregning */}
                   <div style={{
                     marginTop: '16px',
                     padding: '20px',
                     backgroundColor: '#ecfdf5',
                     borderRadius: '12px',
                     border: '2px solid #10b981',
                     textAlign: 'center'
                   }}>
                     <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#065f46', marginBottom: '12px'}}>
                       🌱 CO2 Besparelse ved at følge anbefalinger
                     </div>
                     
                     {(() => {
                       if (!currentCO2 || !dailyCO2Range.min || !dailyCO2Range.max) {
                         return (
                           <div style={{fontSize: '0.9rem', color: '#6b7280'}}>
                             CO2-data ikke tilgængelig lige nu
                           </div>
                         );
                       }
                       
                       // Beregn CO2 besparelse baseret på grønne timer
                       const currentCO2Level = currentCO2;
                       const minCO2 = dailyCO2Range.min;
                       const maxCO2 = dailyCO2Range.max;
                       const avgCO2 = (minCO2 + maxCO2) / 2;
                       
                       // Definer grønne timer (under 40% af max CO2)
                       const greenThreshold = minCO2 + (maxCO2 - minCO2) * 0.4;
                       
                       // Appliance CO2 emission per cycle (baseret på dansk energimix)
                       const applianceCO2 = {
                         vaskemaskine: 0.6,    // kg CO2 per vask (1.5 kWh * 0.4 kg/kWh)
                         tørretumbler: 1.2,    // kg CO2 per tørring (3.0 kWh * 0.4 kg/kWh)
                         opvasker: 0.48        // kg CO2 per opvask (1.2 kWh * 0.4 kg/kWh)
                       };
                       
                       // Beregn CO2 besparelse per apparat
                       const calculateCO2Savings = (appliance: keyof typeof applianceCO2) => {
                         const baseCO2 = applianceCO2[appliance];
                         
                         // CO2 i grønne timer vs. dyre timer
                         const greenCO2 = baseCO2 * (greenThreshold / avgCO2);
                         const expensiveCO2 = baseCO2 * (maxCO2 / avgCO2);
                         
                         const co2Savings = expensiveCO2 - greenCO2;
                         
                         return {
                           greenCO2: greenCO2.toFixed(2),
                           expensiveCO2: expensiveCO2.toFixed(2),
                           savings: co2Savings.toFixed(2),
                           percentage: ((co2Savings / expensiveCO2) * 100).toFixed(1)
                         };
                       };
                       
                       const vaskemaskineCO2 = calculateCO2Savings('vaskemaskine');
                       const tørretumblerCO2 = calculateCO2Savings('tørretumbler');
                       const opvaskerCO2 = calculateCO2Savings('opvasker');
                       
                       // Årlig CO2 besparelse
                       const vaskemaskineYearlyCO2 = parseFloat(vaskemaskineCO2.savings) * 365 * 0.7;
                       const tørretumblerYearlyCO2 = parseFloat(tørretumblerCO2.savings) * 365 * 0.6;
                       const opvaskerYearlyCO2 = parseFloat(opvaskerCO2.savings) * 365 * 0.8;
                       
                       const totalYearlyCO2Savings = vaskemaskineYearlyCO2 + tørretumblerYearlyCO2 + opvaskerYearlyCO2;
                       
                       // Konverter til træer (1 træ absorberer ~22 kg CO2/år)
                       const treesEquivalent = totalYearlyCO2Savings / 22;
                       
                       return (
                         <>
                           <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px'}}>
                             <div style={{
                               padding: '12px',
                               backgroundColor: '#dcfce7',
                               borderRadius: '8px',
                               border: '1px solid #22c55e'
                             }}>
                               <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#15803d', marginBottom: '4px'}}>
                                 🧺 Vaskemaskine CO2
                               </div>
                               <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#16a34a'}}>
                                 Sparer {vaskemaskineCO2.savings} kg CO2
                               </div>
                               <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                                 ({vaskemaskineCO2.percentage}% besparelse)
                               </div>
                             </div>
                             
                             <div style={{
                               padding: '12px',
                               backgroundColor: '#dcfce7',
                               borderRadius: '8px',
                               border: '1px solid #22c55e'
                             }}>
                               <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#15803d', marginBottom: '4px'}}>
                                 🌀 Tørretumbler CO2
                               </div>
                               <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#16a34a'}}>
                                 Sparer {tørretumblerCO2.savings} kg CO2
                               </div>
                               <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                                 ({tørretumblerCO2.percentage}% besparelse)
                               </div>
                             </div>
                             
                             <div style={{
                               padding: '12px',
                               backgroundColor: '#dcfce7',
                               borderRadius: '8px',
                               border: '1px solid #22c55e'
                             }}>
                               <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#15803d', marginBottom: '4px'}}>
                                 🍽️ Opvasker CO2
                               </div>
                               <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#16a34a'}}>
                                 Sparer {opvaskerCO2.savings} kg CO2
                               </div>
                               <div style={{fontSize: '0.7rem', color: '#15803d'}}>
                                 ({opvaskerCO2.percentage}% besparelse)
                               </div>
                             </div>
                           </div>
                           
                           <div style={{
                             padding: '16px',
                             backgroundColor: '#10b981',
                             borderRadius: '12px',
                             color: 'white',
                             marginBottom: '16px'
                           }}>
                             <div style={{fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '8px'}}>
                               🌳 Årlig CO2 Besparelse
                             </div>
                             <div style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '4px'}}>
                               {totalYearlyCO2Savings.toFixed(1)} kg CO2
                             </div>
                             <div style={{fontSize: '1rem', marginBottom: '8px'}}>
                               Svarer til {treesEquivalent.toFixed(1)} træer der absorberer CO2
                             </div>
                             <div style={{fontSize: '0.9rem', opacity: 0.9}}>
                               Baseret på realistisk compliance med grønne timer
                             </div>
                           </div>
                           
                           <div style={{
                             padding: '12px',
                             backgroundColor: '#f0fdf4',
                             borderRadius: '8px',
                             border: '1px solid #22c55e'
                           }}>
                             <div style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#15803d', marginBottom: '8px'}}>
                               📊 Nuværende CO2 Status:
                             </div>
                             <div style={{fontSize: '0.8rem', color: '#16a34a', lineHeight: '1.4'}}>
                               • Nuværende CO2: {currentCO2Level.toFixed(0)} g/kWh<br/>
                               • Grøn threshold: {greenThreshold.toFixed(0)} g/kWh<br/>
                               • Dagens range: {minCO2.toFixed(0)} - {maxCO2.toFixed(0)} g/kWh<br/>
                               • Status: {currentCO2Level <= greenThreshold ? '🟢 Grøn' : '🟡 Neutral'}
                             </div>
                           </div>
                         </>
                       );
                     })()}
                   </div>
                </>
              );
            }
            return null;
          })()}
        </div>

        {/* Daily Range */}
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <TrendingDown size={24} color="#22c55e" />
              <h3 style={{fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0}}>{t(language, 'todaysLowest')}</h3>
            </div>
            <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '4px'}}>
              {formatPrice(dailyRange.min)} DKK
            </div>
            <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
              {t(language, 'bestTimeElectricity')}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <TrendingUp size={24} color="#ef4444" />
              <h3 style={{fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0}}>{t(language, 'todaysHighest')}</h3>
            </div>
            <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '4px'}}>
              {formatPrice(dailyRange.max)} DKK
            </div>
            <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
              {t(language, 'avoidHeavyUsage')}
            </div>
          </div>
        </div>

        {/* Price Chart for Today and Tomorrow */}
        {priceData && priceData.length > 0 && (() => {
          const todayRecords = priceData.filter(record => {
            const recordDate = new Date(record.HourDK);
            return recordDate.getDate() === new Date().getDate();
          });
          
          const tomorrowRecords = priceData.filter(record => {
            const recordDate = new Date(record.HourDK);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return recordDate.getDate() === tomorrow.getDate();
          });
          
          // Combine today and tomorrow records
          const allRecords = [...todayRecords, ...tomorrowRecords];
          
          if (allRecords.length > 0) {
                        const prices = allRecords.map(r => r.SpotPriceDKK);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const currentHour = new Date().getHours();
            
            return (
              <div style={styles.card}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'}}>
                  <TrendingUp size={24} color="#4f46e5" />
                  <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0}}>
                    📊 Energipriser - Sidste 4 timer + Fremtid (DK2)
                  </h3>
                </div>
                
                <div style={{
                  height: '200px',
                  display: 'flex',
                  alignItems: 'end',
                  gap: '1px',
                  padding: '20px 0',
                  position: 'relative',
                  overflowX: 'auto',
                  overflowY: 'hidden'
                }}>
                  {(() => {
                    // Sort records chronologically by date and hour
                    const sortedRecords = [...allRecords].sort((a, b) => {
                      const dateA = new Date(a.HourDK);
                      const dateB = new Date(b.HourDK);
                      return dateA.getTime() - dateB.getTime();
                    });
                    
                    // Filter to show last 4 hours + all future hours
                    const currentHour = new Date().getHours();
                    const currentDate = new Date().getDate();
                    
                    const filteredRecords = sortedRecords.filter(record => {
                      const recordHour = new Date(record.HourDK).getHours();
                      const recordDate = new Date(record.HourDK).getDate();
                      
                      // Include last 4 hours from today
                      const last4Hours = recordHour >= (currentHour - 4) && recordDate === currentDate;
                      
                      // Include all future hours (today + tomorrow + beyond)
                      // Calculate if record is in future hours
                      const allFutureHours = (() => {
                        if (recordDate === currentDate) {
                          // Today's future hours
                          return recordHour > currentHour;
                        } else {
                          // All future dates
                          return recordDate > currentDate;
                        }
                      })();
                      
                      return last4Hours || allFutureHours;
                    });
                    
                    return filteredRecords.map((record, index) => {
                      const recordHour = new Date(record.HourDK).getHours();
                      const recordDate = new Date(record.HourDK);
                      const price = record.SpotPriceDKK;
                      const height = ((price - minPrice) / (maxPrice - minPrice)) * 160; // 160px max height
                      
                      // Check if this is the current hour by comparing both date and hour
                      const now = new Date();
                      const isCurrentHour = recordDate.getDate() === now.getDate() && 
                                          recordDate.getHours() === now.getHours();
                      
                      const isCheap = price <= (dailyRange.avg || 0) * 0.8;
                      const isExpensive = price >= (dailyRange.avg || 0) * 1.2;
                      
                      let barColor = '#e5e7eb'; // neutral
                      if (isCheap) barColor = '#22c55e'; // green
                      else if (isExpensive) barColor = '#ef4444'; // red
                      else if (isCurrentHour) barColor = '#4f46e5'; // blue for current
                      
                      return (
                        <div key={index} style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: '100%',
                            height: `${Math.max(height, 4)}px`,
                            backgroundColor: barColor,
                            borderRadius: '4px 4px 0 0',
                            border: isCurrentHour ? '2px solid #1f2937' : 'none',
                            position: 'relative',
                            transition: 'all 0.3s ease'
                          }}>
                            {isCurrentHour && (
                              <div style={{
                                position: 'absolute',
                                top: '-25px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#1f2937',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                whiteSpace: 'nowrap'
                              }}>
                                Nu
                              </div>
                            )}
                          </div>
                                                  <div style={{
                          fontSize: '0.7rem',
                          color: '#6b7280',
                          marginTop: '8px',
                          textAlign: 'center',
                          fontWeight: isCurrentHour ? 'bold' : 'normal'
                        }}>
                          {recordHour}:00
                        </div>
                          <div style={{
                            fontSize: '0.6rem',
                            color: '#9ca3af',
                            marginTop: '2px',
                            textAlign: 'center'
                          }}>
                            {(price/1000).toFixed(2)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#0369a1',
                  marginBottom: '16px'
                }}>
                  Viser sidste 4 timer og alle fremtidige timer som API'et returnerer
                  <br/>
                  <span style={{fontSize: '0.7rem', opacity: 0.8}}>← Scroll for at se alle kolonner →</span>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '2px'}}></div>
                    <span style={{fontSize: '0.8rem', color: '#374151'}}>Billig</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{width: '12px', height: '12px', backgroundColor: '#e5e7eb', borderRadius: '2px'}}></div>
                    <span style={{fontSize: '0.8rem', color: '#374151'}}>Normal</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px'}}></div>
                    <span style={{fontSize: '0.8rem', color: '#374151'}}>Dyr</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <div style={{width: '12px', height: '12px', backgroundColor: '#4f46e5', borderRadius: '2px'}}></div>
                    <span style={{fontSize: '0.8rem', color: '#374151'}}>Nuværende</span>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Average Price Card */}
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <div style={{width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                📊
              </div>
              <h3 style={{fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0}}>Gennemsnit</h3>
            </div>
            <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '4px'}}>
              {dailyRange.avg ? formatPrice(dailyRange.avg) : '--'} DKK
            </div>
            <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
              Reference for billig/dyr
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{textAlign: 'center', marginBottom: '24px'}}>
          <div style={{display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center'}}>
            <button
              onClick={fetchData}
              style={styles.button}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
            >
              {t(language, 'refreshPrices')}
            </button>
            <button
              onClick={testAPIs}
              style={{...styles.button, backgroundColor: '#059669'}}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#047857'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            >
              {t(language, 'testApiEndpoints')}
            </button>
            
            {/* Update Frequency Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '2px solid #e2e8f0'
            }}>
              <span style={{fontSize: '0.875rem', color: '#475569', fontWeight: '500'}}>
                Opdatering:
              </span>
              <button
                onClick={() => setUpdateFrequency('smart')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: updateFrequency === 'smart' ? '#4f46e5' : '#e2e8f0',
                  color: updateFrequency === 'smart' ? 'white' : '#64748b',
                  transition: 'all 0.3s ease'
                }}
              >
                Smart (13:00)
              </button>
              <button
                onClick={() => setUpdateFrequency('hourly')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: updateFrequency === 'hourly' ? '#4f46e5' : '#e2e8f0',
                  color: updateFrequency === 'hourly' ? 'white' : '#64748b',
                  transition: 'all 0.3s ease'
                }}
              >
                Hver time +2s
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{textAlign: 'center' as const, color: '#6b7280', fontSize: '0.875rem', padding: '16px'}}>
          <p><strong>{t(language, 'smartApplianceTiming')}</strong> • {t(language, 'dataFromEnerginet')} • {t(language, 'priceArea')}</p>
          <p>{t(language, 'getRecommendations')}</p>
          <p>{t(language, 'greenPeriods')}</p>
          <div style={{marginTop: '12px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem'}}>
            <div style={{fontWeight: '600', marginBottom: '4px'}}>{t(language, 'apiStatus')}</div>
            <div>{t(language, 'priceApi')}: {priceApiStatus === 'working' ? t(language, 'working') : priceApiStatus === 'failed' ? t(language, 'failed') : t(language, 'unknown')}</div>
            <div>{t(language, 'co2Api')}: {co2ApiStatus === 'working' ? t(language, 'working') : co2ApiStatus === 'failed' ? t(language, 'failed') : t(language, 'unknown')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectricityDashboard;