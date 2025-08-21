# ⚡ Electricity Dashboard - Danish Energy Price Tracker

A comprehensive React TypeScript dashboard for tracking Danish electricity prices and CO2 emissions in real-time. Built with modern web technologies and integrated with Energinet's API.

## 🌟 Features

### 📊 **Real-time Price Tracking**
- Live electricity prices for DK2 (Eastern Denmark)
- Current price status (cheap/neutral/expensive)
- Daily price range and average calculations
- Interactive price graph with chronological display

### 🌱 **CO2 Emission Tracking**
- Real-time CO2 emissions per kWh
- Green energy status indicators
- Environmental impact calculations
- CO2 savings recommendations

### 🧺 **Smart Appliance Recommendations**
- Washing machine, dryer, and dishwasher recommendations
- Optimal usage time suggestions
- Cost savings calculations with provider add-ons
- Annual savings projections

### 💰 **Savings Calculator**
- Daily and annual savings estimates
- Provider-specific add-on calculations
- Realistic compliance assumptions
- CO2 savings in "trees equivalent"

### 🌍 **Multi-language Support**
- Danish and English interface
- Dynamic language switching
- Localized content and formatting

### 📱 **Modern UI/UX**
- Responsive design for all devices
- Beautiful gradient backgrounds
- Interactive elements with hover effects
- Real-time status indicators

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd electricity-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

## 🏗️ Project Structure

```
src/
├── App.tsx              # Main dashboard component
├── api.ts               # API service and data fetching
├── types.ts             # TypeScript type definitions
├── translations.ts      # Multi-language translations
├── utils.ts             # Utility functions and helpers
├── main.tsx            # Application entry point
└── assets/             # Static assets
```

## 🔧 Configuration

### API Integration
- **Energinet API**: Real-time electricity prices and CO2 data
- **CORS Proxies**: Multiple fallback proxies for reliable data access
- **Smart Refresh**: Automatic updates at optimal times (13:00 daily)

### Provider Add-ons
The dashboard includes calculations for major Danish electricity providers:
- Andel Energi
- Ørsted
- Norlys
- And more...

## 📈 Key Metrics

### Price Analysis
- **Current Price**: Real-time spot price in DKK/kWh
- **Daily Range**: Min/max prices for the day
- **Average Price**: Reference for cheap/expensive classification
- **Price Status**: Visual indicators for optimal usage times

### CO2 Analysis
- **Current CO2**: Real-time emissions in g CO₂/kWh
- **Green Status**: Environmental impact indicators
- **Daily Range**: CO2 emission variations
- **Savings Impact**: Environmental benefits of smart usage

## 🎯 Business Value

### For Consumers
- **Cost Savings**: Up to 30-50% on electricity bills
- **Environmental Impact**: Reduce CO2 footprint
- **Convenience**: Smart recommendations for appliance usage
- **Transparency**: Clear understanding of energy costs

### For Providers
- **Customer Engagement**: Interactive dashboard experience
- **Data Insights**: Usage pattern analysis
- **Sustainability**: Promote green energy consumption
- **Competitive Advantage**: Value-added services

## 🔮 Future Enhancements

- [ ] Smart home integration (IoT devices)
- [ ] Historical data analysis and trends
- [ ] Personalized recommendations
- [ ] Mobile app version
- [ ] Advanced analytics dashboard
- [ ] Integration with smart meters

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Energinet**: For providing the electricity price and CO2 data APIs
- **React & Vite**: For the excellent development experience
- **TypeScript**: For type safety and better development experience
- **Lucide React**: For beautiful icons

---

**Built with ❤️ for the Danish energy market**
