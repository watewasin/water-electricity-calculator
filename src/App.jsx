import { useState, useEffect } from 'react';
import VillageMap from './components/VillageMap';
import MeterEntryModal from './components/MeterEntryModal';
import SummarySidebar from './components/SummarySidebar';
import MonthSelector from './components/MonthSelector';
import villageLayout from './data/villageMap.json';
import { housesAPI } from './services/api';

import EngineerApp from './pages/EngineerApp';
import ConfigPage from './pages/ConfigPage';

function App() {
  const getViewFromHash = () => {
    const hash = window.location.hash;
    if (hash === '#engineer') return 'engineer';
    if (hash === '#config') return 'config';
    return 'admin';
  };

  const [currentView, setCurrentView] = useState(getViewFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getViewFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);



  const [selectedMonth, setSelectedMonth] = useState('2026-01');
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // For forcing refreshes

  // Listen for storage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = () => setLastUpdate(Date.now());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load houses from API or initialize with layout
  useEffect(() => {
    const fetchHouses = async () => {
      try {
        const savedHouses = await housesAPI.getByPeriod(selectedMonth);

        // Merge saved billing data with current layout from villageMap.json
        const mergedHouses = villageLayout.map(layoutHouse => {
          const savedHouse = savedHouses.find(s => s.label === layoutHouse.label);

          if (savedHouse) {
            // Keep billing data, but use current layout structure
            return {
              ...layoutHouse,
              ...savedHouse, // Use all saved properties (status, meterData, billData)
              // Ensure we don't overwrite layout-specific props if they exist in DB incorrectly
              id: layoutHouse.id,
              zone: layoutHouse.zone
            };
          } else {
            // New house in layout, initialize with pending status
            return {
              ...layoutHouse,
              period: selectedMonth,
              status: 'pending',
              meterData: { elec: { prev: 0, curr: null }, water: { prev: 0, curr: null } },
              billData: null
            };
          }
        });

        setHouses(mergedHouses);
      } catch (error) {
        console.error('Failed to fetch houses:', error);
        // Fallback to layout only on error
        setHouses(villageLayout.map(h => ({
          ...h,
          period: selectedMonth,
          status: 'pending',
          meterData: { elec: { prev: 0, curr: null }, water: { prev: 0, curr: null } },
          billData: null
        })));
      }
    };

    fetchHouses();
  }, [selectedMonth, lastUpdate]);

  // Remove the localStorage saving effect - saving is now done explicitly via API

  const handleHouseClick = (house) => {
    setSelectedHouse(house);
  };

  const handleSaveBill = async (houseId, billData) => {
    try {
      const houseToUpdate = houses.find(h => h.id === houseId);
      if (!houseToUpdate) return;

      const updatedHouseData = {
        label: houseToUpdate.label,
        period: selectedMonth,
        zone: houseToUpdate.zone,
        status: 'billed',
        meterData: {
          elec: { prev: houseToUpdate.meterData?.elec?.prev ?? 0, curr: billData.elec },
          water: { prev: houseToUpdate.meterData?.water?.prev ?? 0, curr: billData.water }
        },
        billData: {
          elecBill: billData.elecBill,
          waterBill: billData.waterBill,
          total: billData.total,
          hasImages: billData.hasImages
        }
      };

      // Save to API
      await housesAPI.saveHouse(updatedHouseData);

      // Update local state
      setHouses(prevHouses => prevHouses.map(h => {
        if (h.id === houseId) {
          return {
            ...h,
            ...updatedHouseData
          };
        }
        return h;
      }));
    } catch (error) {
      console.error('Failed to save bill:', error);
      alert('Failed to save bill data. Please try again.');
    }
  };

  if (currentView === 'config') {
    return <ConfigPage />;
  }

  if (currentView === 'engineer') {
    return <EngineerApp />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ระบบจัดการสาธารณูปโภคหมู่บ้าน
          </h1>
          <p className="text-slate-400 text-base">ระบบคำนวณค่าน้ำ-ค่าไฟ ตามมาตรฐาน กฟภ./กปภ.</p>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="#engineer"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-base"
          >
            โหมดช่าง
          </a>
          <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <VillageMap houses={houses} onHouseClick={handleHouseClick} />
        <SummarySidebar houses={houses} selectedMonth={selectedMonth} onHouseSearch={handleHouseClick} />
      </div>

      {/* Modal */}
      {selectedHouse && (
        <MeterEntryModal
          house={selectedHouse}
          onClose={() => setSelectedHouse(null)}
          onSave={handleSaveBill}
          selectedMonth={selectedMonth}
        />
      )}
    </div>
  );
}

export default App;
