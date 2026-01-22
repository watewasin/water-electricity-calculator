import { useState, useEffect } from 'react';
import villageLayout from '../data/villageMap.json';
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
        return houses
            .filter(h => {
                const mappedZones = ZONE_MAPPING[selectedZone];
                return mappedZones && mappedZones.includes(h.zone);
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    const housesInZone = getHousesInZone();

    const handlePhotoCapture = async (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Image = event.target.result;

                if (type === 'elec') {
                    setElecPhoto(base64Image);
                    setIsReadingElec(true);
                    try {
                        const reading = await readMeterValue(base64Image, 'electricity');
                        setElecReading(reading.toString());
                    } catch (error) {
                        console.error('Failed to read electricity meter:', error);
                        setElecReading(''); // Clear the input box for manual entry
                    } finally {
                        setIsReadingElec(false);
                    }
                } else {
                    setWaterPhoto(base64Image);
                    setIsReadingWater(true);
                    try {
                        const reading = await readMeterValue(base64Image, 'water');
                        setWaterReading(reading.toString());
                    } catch (error) {
                        console.error('Failed to read water meter:', error);
                        setWaterReading(''); // Clear the input box for manual entry
                    } finally {
                        setIsReadingWater(false);
                    }
                }
            };
            reader.readAsDataURL(file);
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
                    elec: { prev: 0, curr: parseInt(elecReading) },
                    water: { prev: 0, curr: parseInt(waterReading) }
                },
                billData: {
                    elecBill,
                    waterBill,
                    total: Math.round((elecBill.total + waterBill.total) * 100) / 100,
                    hasImages: true
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

    const canProceedStep2 = selectedZone !== '';
    const canProceedStep3 = selectedHouse !== null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 shadow-2xl flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">📱 Engineer Portal</h1>
                        <p className="text-indigo-200 text-sm">Meter Reading Entry System</p>
                    </div>
                    <div className="text-right">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white/20 border border-white/30 rounded px-2 py-1 text-white text-sm outline-none cursor-pointer"
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
                <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
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

                {/* Step Content */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                    {/* Step 1: Select Zone */}
                    {step === 1 && (
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Select Zone</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {displayZones.map(zone => (
                                    <button
                                        key={zone}
                                        onClick={() => {
                                            setSelectedZone(zone);
                                            setStep(2);
                                        }}
                                        className="p-4 rounded-xl font-semibold transition-all bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-indigo-500 active:text-white"
                                    >
                                        {zone}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select House */}
                    {step === 2 && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">Select House</h2>
                                <span className="text-sm text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full">
                                    {selectedZone}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto mb-4">
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
                                        className={`p-3 rounded-lg font-bold transition-all relative overflow-hidden ${selectedHouse?.id === house.id
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg scale-105'
                                            : house.status === 'billed'
                                                ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {house.label}
                                        {house.status === 'billed' && (
                                            <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] px-1 rounded-bl">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="w-full py-4 rounded-xl font-bold bg-slate-700 text-white hover:bg-slate-600"
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
                                    onChange={(e) => handlePhotoCapture(e, 'elec')}
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
                                    onChange={(e) => handlePhotoCapture(e, 'water')}
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
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-4 rounded-xl font-bold bg-slate-700 text-white hover:bg-slate-600"
                                    disabled={isSubmitting}
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!elecReading || !waterReading || isSubmitting || isReadingElec || isReadingWater}
                                    className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${(!elecReading || !waterReading || isSubmitting || isReadingElec || isReadingWater)
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg'
                                        }`}
                                >
                                    {isSubmitting ? '⏳ Submitting...' : '✓ Submit'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
