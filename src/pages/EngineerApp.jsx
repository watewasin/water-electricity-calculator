import { useState, useEffect } from 'react';
import villageLayout from '../data/villageMap.json';
import VillageMap from '../components/VillageMap';
import { calculateElectricityBill, calculateWaterBill } from '../utils/billingCalculator';
import { imagesAPI, housesAPI, periodsAPI } from '../services/api';
import { readMeterValue } from '../utils/geminiReader';

export default function EngineerApp() {
    const [step, setStep] = useState(1);
    const [selectedMonth, setSelectedMonth] = useState('2026-01');
    const [selectedZone, setSelectedZone] = useState('');
    const [selectedHouse, setSelectedHouse] = useState(null);
    const [elecReading, setElecReading] = useState('');
    const [waterReading, setWaterReading] = useState('');
    const [elecPhoto, setElecPhoto] = useState(null);
    const [waterPhoto, setWaterPhoto] = useState(null);
    const [customPeriods, setCustomPeriods] = useState([]);
    const [houses, setHouses] = useState([]);
    const [isReadingElec, setIsReadingElec] = useState(false);
    const [isReadingWater, setIsReadingWater] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'billed'
    const [highlightedHouse, setHighlightedHouse] = useState(null);
    const [mapZoom, setMapZoom] = useState(1); // For map zoom

    // Load custom periods from API
    useEffect(() => {
        const loadPeriods = async () => {
            try {
                const periods = await periodsAPI.getAll();
                setCustomPeriods(periods);
            } catch (error) {
                console.error('Failed to load periods:', error);
            }
        };
        loadPeriods();
    }, []);

    // Load houses for selected month from API
    useEffect(() => {
        const loadHouses = async () => {
            try {
                const savedHouses = await housesAPI.getByPeriod(selectedMonth);

                // Merge with layout
                const mergedHouses = villageLayout.map(layoutHouse => {
                    const saved = savedHouses.find(s => s.label === layoutHouse.label);
                    // Ensure we preserve the ID from the layout or DB as appropriate, here layout ID is fine for selection
                    return saved ? { ...layoutHouse, ...saved } : {
                        ...layoutHouse,
                        status: 'pending',
                        meterData: { elec: { prev: 0, curr: null }, water: { prev: 0, curr: null } },
                        billData: null
                    };
                });
                setHouses(mergedHouses);
            } catch (error) {
                console.error('Failed to load houses:', error);
                // Fallback to layout
                setHouses(villageLayout.map(h => ({
                    ...h,
                    status: 'pending',
                    meterData: { elec: { prev: 0, curr: null }, water: { prev: 0, curr: null } },
                    billData: null
                })));
            }
        };
        loadHouses();
    }, [selectedMonth]);

    const defaultMonths = [
        { value: '2026-01', label: 'Jan 2026' }
    ];

    const allMonths = [...defaultMonths, ...customPeriods].sort((a, b) => b.value.localeCompare(a.value));

    // Zone grouping configuration
    const ZONE_MAPPING = {
        'Zone W': ['Zone_W', 'Zone_Pyramid'],
        'Zone C': ['Zone_C', 'Zone_18'],
        'Zone N': ['Zone_N'],
        'Zone S': ['Zone_S'],
        'Zone E': ['Zone_E']
    };

    const displayZones = Object.keys(ZONE_MAPPING);

    // Get houses for selected zone from local state
    const getHousesInZone = () => {
        if (!selectedZone) return [];
        let filtered = houses
            .filter(h => {
                const mappedZones = ZONE_MAPPING[selectedZone];
                return mappedZones && mappedZones.includes(h.zone);
            });

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(h => h.status === statusFilter);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(h => h.label.toString().includes(searchQuery.trim()));
        }

        return filtered.sort((a, b) => a.label.localeCompare(b.label));
    };

    const housesInZone = getHousesInZone();

    const handlePhotoUpload = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Image = event.target.result;
                if (type === 'elec') {
                    setElecPhoto(base64Image);
                    setElecReading(''); // Clear previous reading
                } else {
                    setWaterPhoto(base64Image);
                    setWaterReading(''); // Clear previous reading
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAIRead = async (type) => {
        if (type === 'elec' && elecPhoto) {
            setIsReadingElec(true);
            try {
                const reading = await readMeterValue(elecPhoto, 'electricity');
                setElecReading(reading.toString());
            } catch (error) {
                console.error('Failed to read electricity meter:', error);
                setElecReading('Please enter the value');
            } finally {
                setIsReadingElec(false);
            }
        } else if (type === 'water' && waterPhoto) {
            setIsReadingWater(true);
            try {
                const reading = await readMeterValue(waterPhoto, 'water');
                setWaterReading(reading.toString());
            } catch (error) {
                console.error('Failed to read water meter:', error);
                setWaterReading('Please enter the value');
            } finally {
                setIsReadingWater(false);
            }
        }
    };

    const validateReading = (reading) => {
        const number = parseFloat(reading);
        return !isNaN(number) && number >= 0;
    };

    const handleSubmit = async () => {
        if (!validateReading(elecReading) || !validateReading(waterReading)) {
            alert('Please ensure all readings are valid numbers.');
            return;
        }

        setIsSubmitting(true);
        try {
            const elecBill = calculateElectricityBill(0, parseInt(elecReading));
            const waterBill = calculateWaterBill(0, parseInt(waterReading));

            if (elecPhoto) {
                try {
                    await imagesAPI.upload(selectedHouse.label, selectedMonth, 'electricity', elecPhoto);
                } catch (e) {
                    console.error('Failed to upload electricity photo', e);
                }
            }
            if (waterPhoto) {
                try {
                    await imagesAPI.upload(selectedHouse.label, selectedMonth, 'water', waterPhoto);
                } catch (e) {
                    console.error('Failed to upload water photo', e);
                }
            }

            const houseToUpdate = houses.find(h => h.label === selectedHouse.label);
            if (!houseToUpdate) throw new Error("Selected house not found in state");

            const updatedHouseData = {
                label: houseToUpdate.label,
                period: selectedMonth,
                zone: houseToUpdate.zone,
                status: 'billed',
                meterData: {
                    elec: { prev: houseToUpdate.meterData.elec?.curr || 0, curr: parseInt(elecReading) },
                    water: { prev: houseToUpdate.meterData.water?.curr || 0, curr: parseInt(waterReading) }
                },
                billData: {
                    elecBill,
                    waterBill,
                    total: Math.round((elecBill.total + waterBill.total) * 100) / 100,
                    hasImages: !!(elecPhoto || waterPhoto)
                }
            };

            await housesAPI.saveHouse(updatedHouseData);

            setHouses(prev => prev.map(h =>
                h.label === selectedHouse.label ? { ...h, ...updatedHouseData } : h
            ));

            // Reset for next entry and return to house selection page
            setStep(2);
            setSelectedHouse(null);
            setElecReading('');
            setWaterReading('');
            setElecPhoto(null);
            setWaterPhoto(null);

        } catch (error) {
            console.error('Error submitting data:', error);
            alert('An error occurred while submitting the data. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddBillingPeriod = async (newPeriod) => {
        const existingPeriod = customPeriods.find(period => period.value === newPeriod);
        if (existingPeriod) {
            alert('This billing period already exists. Please choose a different year and month.');
            return;
        }

        try {
            await periodsAPI.add(newPeriod);
            setCustomPeriods(prev => [...prev, { value: newPeriod, label: newPeriod }]);
            alert('Billing period added successfully.');
        } catch (error) {
            console.error('Failed to add billing period:', error);
            alert('Failed to add billing period. Please try again.');
        }
    };

    const canProceedStep2 = selectedZone !== '';
    const canProceedStep3 = selectedHouse !== null;

    const handleMapZoom = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setMapZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col lg:flex-row gap-4 p-4">
            {/* Left Side: Zoomable Map Area */}
            <div className="hidden lg:block lg:flex-1 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                <div
                    className="w-full h-full overflow-auto"
                    onWheel={handleMapZoom}
                    style={{ cursor: 'grab' }}
                >
                    <div
                        style={{
                            transform: `scale(${mapZoom})`,
                            transformOrigin: 'top left',
                            transition: 'transform 0.1s ease-out',
                        }}
                    >
                        <VillageMap houses={houses} onHouseClick={(house) => {
                            setSelectedHouse(house);
                            setStep(3);
                        }} />
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-4 right-4 bg-slate-900/90 rounded-lg border border-slate-600 shadow-lg">
                    <button
                        onClick={() => setMapZoom(prev => Math.max(0.5, prev - 0.2))}
                        className="block w-10 h-10 flex items-center justify-center hover:bg-slate-700 text-white font-bold border-b border-slate-600"
                    >
                        −
                    </button>
                    <div className="px-3 py-1 text-center text-sm text-slate-300 font-mono bg-slate-800">
                        {(mapZoom * 100).toFixed(0)}%
                    </div>
                    <button
                        onClick={() => setMapZoom(prev => Math.min(3, prev + 0.2))}
                        className="block w-10 h-10 flex items-center justify-center hover:bg-slate-700 text-white font-bold"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Right Side: Scrollable Dashboard */}
            <div className="w-full lg:w-96 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-4 shadow-2xl flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">📱 Engineer Portal</h1>
                        <p className="text-indigo-200 text-sm">Meter Reading Entry System</p>
                    </div>
                    <div className="text-right">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white/20 border border-white/30 rounded px-2 py-1 text-white text-sm outline-none cursor-pointer hover:bg-white/30"
                        >
                            {allMonths.map(m => (
                                <option key={m.value} value={m.value} className="text-black">
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
                    <div className="flex justify-between mb-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex flex-col items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg'
                                    : 'bg-slate-700 text-slate-400'
                                    }`}>
                                    {s}
                                </div>
                                <span className="text-xs text-slate-400 mt-1">
                                    {s === 1 ? 'Zone' : s === 2 ? 'House' : 'Data'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl">
                    {/* Step 1: Select Zone */}
                    {step === 1 && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-2">Select Zone</h2>
                            <p className="text-slate-400 text-sm mb-6">Choose a zone to start entering meter readings</p>
                            <div className="grid grid-cols-2 gap-3">
                                {displayZones.map(zone => {
                                    const zoneCount = houses.filter(h => {
                                        const mappedZones = ZONE_MAPPING[zone];
                                        return mappedZones && mappedZones.includes(h.zone);
                                    }).length;
                                    const zonePending = houses.filter(h => {
                                        const mappedZones = ZONE_MAPPING[zone];
                                        return mappedZones && mappedZones.includes(h.zone) && h.status === 'pending';
                                    }).length;

                                    return (
                                        <button
                                            key={zone}
                                            onClick={() => {
                                                setSelectedZone(zone);
                                                setSearchQuery('');
                                                setStatusFilter('all');
                                                setHighlightedHouse(null);
                                                setStep(2);
                                            }}
                                            className="p-4 rounded-xl font-semibold transition-all bg-gradient-to-br from-indigo-600 to-indigo-700 text-white hover:from-indigo-500 hover:to-indigo-600 shadow-lg hover:shadow-xl active:scale-95"
                                        >
                                            <div className="text-lg mb-1">{zone}</div>
                                            <div className="text-xs text-indigo-200">
                                                {zonePending} of {zoneCount} pending
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select House */}
                    {step === 2 && (
                        <div className="p-6 flex flex-col h-[calc(100vh-280px)]">
                            {/* Header with Zone Info */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-white">Select House</h2>
                                    <span className="text-sm text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full font-semibold">
                                        {selectedZone}
                                    </span>
                                </div>

                                {/* Search Bar */}
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search house number..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (e.target.value.trim()) {
                                                const found = houses.find(h => h.label.toString() === e.target.value.trim());
                                                setHighlightedHouse(found?.id || null);
                                            } else {
                                                setHighlightedHouse(null);
                                            }
                                        }}
                                        className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium transition-all"
                                    />
                                </div>

                                {/* Status Filters */}
                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={() => {
                                            setStatusFilter('all');
                                            setSearchQuery('');
                                            setHighlightedHouse(null);
                                        }}
                                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${statusFilter === 'all'
                                            ? 'bg-indigo-500 text-white shadow-lg'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        All ({housesInZone.length})
                                    </button>
                                    <button
                                        onClick={() => {
                                            setStatusFilter('pending');
                                            setSearchQuery('');
                                            setHighlightedHouse(null);
                                        }}
                                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${statusFilter === 'pending'
                                            ? 'bg-blue-500 text-white shadow-lg'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        ⏳ Pending ({houses.filter(h => h.zone === ZONE_MAPPING[selectedZone]?.[0] && h.status === 'pending').length})
                                    </button>
                                    <button
                                        onClick={() => {
                                            setStatusFilter('billed');
                                            setSearchQuery('');
                                            setHighlightedHouse(null);
                                        }}
                                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${statusFilter === 'billed'
                                            ? 'bg-emerald-500 text-white shadow-lg'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        ✓ Done ({houses.filter(h => h.zone === ZONE_MAPPING[selectedZone]?.[0] && h.status === 'billed').length})
                                    </button>
                                </div>
                            </div>

                            {/* Houses Grid - Scrollable */}
                            <div className="flex-1 overflow-y-auto mb-4 pr-2 bg-slate-700/30 rounded-lg p-4">
                                {housesInZone.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        {housesInZone.map(house => (
                                            <button
                                                key={house.id}
                                                onClick={() => {
                                                    setSelectedHouse(house);
                                                    // Prefill data if available
                                                    if (house.status === 'billed' && house.meterData) {
                                                        setElecReading(house.meterData.elec?.curr?.toString() || '');
                                                        setWaterReading(house.meterData.water?.curr?.toString() || '');

                                                        // Load images for this house
                                                        const loadImages = async () => {
                                                            try {
                                                                const elec = await imagesAPI.get(house.label, selectedMonth, 'electricity');
                                                                if (elec?.imageData) setElecPhoto(elec.imageData);
                                                                else setElecPhoto(null);
                                                            } catch (e) { setElecPhoto(null); }

                                                            try {
                                                                const water = await imagesAPI.get(house.label, selectedMonth, 'water');
                                                                if (water?.imageData) setWaterPhoto(water.imageData);
                                                                else setWaterPhoto(null);
                                                            } catch (e) { setWaterPhoto(null); }
                                                        };
                                                        loadImages();
                                                    } else {
                                                        // Reset if not billed
                                                        setElecReading('');
                                                        setWaterReading('');
                                                        setElecPhoto(null);
                                                        setWaterPhoto(null);
                                                    }
                                                    // Auto-advance to step 3
                                                    setStep(3);
                                                }}
                                                className={`p-3 rounded-lg font-bold text-sm transition-all relative overflow-hidden ${highlightedHouse === house.id
                                                    ? 'ring-2 ring-yellow-400 scale-110'
                                                    : selectedHouse?.id === house.id
                                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg scale-105'
                                                        : house.status === 'billed'
                                                            ? 'bg-emerald-900/50 text-emerald-100 border-2 border-emerald-500/50 hover:border-emerald-400'
                                                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {house.label}
                                                {house.status === 'billed' && (
                                                    <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] px-1 rounded">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <div className="text-3xl mb-2">🔍</div>
                                        <p className="font-medium">No houses found</p>
                                        <p className="text-sm">Try different search or filter</p>
                                    </div>
                                )}
                            </div>

                            {/* Back Button */}
                            <button
                                onClick={() => {
                                    setStep(1);
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                    setHighlightedHouse(null);
                                }}
                                className="w-full py-4 rounded-xl font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                            >
                                ← Back to Zones
                            </button>
                        </div>
                    )}

                    {/* Step 3: Enter Data with AI */}
                    {step === 3 && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">Meter Readings</h2>
                                <span className="text-sm text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full">
                                    House {selectedHouse?.label}
                                </span>
                            </div>

                            {/* Electricity */}
                            <div className="bg-slate-700/50 rounded-xl p-4 mb-4 border border-slate-600">
                                <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                                    <span className="text-xl">⚡</span> Electricity Meter
                                </h3>

                                {/* Photo Upload First */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handlePhotoUpload(e, 'elec')}
                                    className="hidden"
                                    id="elec-photo"
                                />
                                {!elecPhoto ? (
                                    <label htmlFor="elec-photo" className="w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 cursor-pointer hover:border-amber-500 hover:text-amber-400 transition-colors">
                                        <span className="text-4xl">📷</span>
                                        <span className="font-medium text-lg">Take Photo of Meter</span>
                                        <span className="text-xs text-slate-500">AI will read it automatically</span>
                                    </label>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <img src={elecPhoto} alt="Electricity meter" className="w-full h-40 object-cover rounded-lg" />
                                            <label htmlFor="elec-photo" className="absolute bottom-2 right-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer shadow-lg hover:bg-indigo-500">
                                                📷 Retake
                                            </label>
                                        </div>

                                        {/* AI Reading Status */}
                                        {isReadingElec ? (
                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
                                                <div className="animate-spin text-2xl">🤖</div>
                                                <div>
                                                    <div className="text-amber-400 font-medium">AI is reading the meter...</div>
                                                    <div className="text-slate-400 text-xs">This may take a few seconds</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="text-slate-400 text-sm block mb-1">Reading (kWh) - Edit if needed</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={elecReading}
                                                        onChange={(e) => setElecReading(e.target.value)}
                                                        placeholder="AI reading will appear here"
                                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-4 pr-12 py-3 text-white text-lg font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">kWh</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {elecPhoto && (
                                    <button
                                        onClick={() => handleAIRead('elec')}
                                        className="mt-2 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                                    >
                                        Read Electricity Meter
                                    </button>
                                )}
                            </div>

                            {/* Water */}
                            <div className="bg-slate-700/50 rounded-xl p-4 mb-6 border border-slate-600">
                                <h3 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                                    <span className="text-xl">💧</span> Water Meter
                                </h3>

                                {/* Photo Upload First */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handlePhotoUpload(e, 'water')}
                                    className="hidden"
                                    id="water-photo"
                                />
                                {!waterPhoto ? (
                                    <label htmlFor="water-photo" className="w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 cursor-pointer hover:border-cyan-500 hover:text-cyan-400 transition-colors">
                                        <span className="text-4xl">📷</span>
                                        <span className="font-medium text-lg">Take Photo of Meter</span>
                                        <span className="text-xs text-slate-500">AI will read it automatically</span>
                                    </label>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <img src={waterPhoto} alt="Water meter" className="w-full h-40 object-cover rounded-lg" />
                                            <label htmlFor="water-photo" className="absolute bottom-2 right-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer shadow-lg hover:bg-indigo-500">
                                                📷 Retake
                                            </label>
                                        </div>

                                        {/* AI Reading Status */}
                                        {isReadingWater ? (
                                            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 flex items-center gap-3">
                                                <div className="animate-spin text-2xl">🤖</div>
                                                <div>
                                                    <div className="text-cyan-400 font-medium">AI is reading the meter...</div>
                                                    <div className="text-slate-400 text-xs">This may take a few seconds</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="text-slate-400 text-sm block mb-1">Reading (m³) - Edit if needed</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={waterReading}
                                                        onChange={(e) => setWaterReading(e.target.value)}
                                                        placeholder="AI reading will appear here"
                                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-4 pr-12 py-3 text-white text-lg font-mono focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">m³</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {waterPhoto && (
                                    <button
                                        onClick={() => handleAIRead('water')}
                                        className="mt-2 py-2 px-4 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
                                    >
                                        Read Water Meter
                                    </button>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setStep(2);
                                        setSearchQuery('');
                                        setStatusFilter('all');
                                        setHighlightedHouse(null);
                                    }}
                                    className="flex-1 py-4 rounded-xl font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    ← Back to Houses
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!elecReading || !waterReading || isSubmitting || isReadingElec || isReadingWater}
                                    className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${(!elecReading || !waterReading || isSubmitting || isReadingElec || isReadingWater)
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:from-emerald-400 hover:to-teal-400'
                                        }`}
                                >
                                    {isSubmitting ? '⏳ Saving...' : '💾 Save Readings'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
