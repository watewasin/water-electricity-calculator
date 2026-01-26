import { jsPDF } from 'jspdf';
import { useState, useEffect } from 'react';
import { periodsAPI } from '../services/api';

export default function SummarySidebar({ houses, selectedMonth, onHouseSearch }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [showRatesModal, setShowRatesModal] = useState(false);
    const [newMonth, setNewMonth] = useState('');
    const [newYear, setNewYear] = useState('2026');
    const [customPeriods, setCustomPeriods] = useState([]);
    const [searchHouseNumber, setSearchHouseNumber] = useState('');

    // Default rates (Thai PEA/PWA official rates)
    const DEFAULT_RATES = {
        electricity: {
            tiers: [3.2484, 4.2218, 4.4217],
            ftRate: 0.3972,
            serviceFee: 38.22,
            vat: 1.07
        },
        water: {
            tiers: [10.20, 16.00, 19.00, 21.20, 21.60, 21.65, 21.70, 21.75],
            serviceFee: 30.00,
            vat: 1.07
        }
    };

    // Load saved periods from API on mount
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

    const defaultMonths = [];

    // Helper to format month to Thai
    const formatMonthThai = (value) => {
        if (!value) return '';
        const [year, month] = value.split('-');
        const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฏาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        return `${monthNames[parseInt(month) - 1]} ${parseInt(year) + 543}`;
    };

    const handleAddPeriod = async () => {
        if (!newMonth || !newYear) {
            alert('กรุณาเลือกทั้งเดือนและปี');
            return;
        }

        const monthNum = String(newMonth).padStart(2, '0');
        const value = `${newYear}-${monthNum}`;

        const exists = [...defaultMonths, ...customPeriods].some(p => p.value === value);
        if (exists) {
            alert('รอบบิลนี้มีอยู่แล้ว!');
            return;
        }

        const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฏาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const monthIndex = parseInt(newMonth) - 1;
        const label = `${monthNames[monthIndex]} ${parseInt(newYear) + 543}`;

        try {
            const newPeriod = await periodsAPI.add(value, label);
            setCustomPeriods(prev => [...prev, newPeriod]);
            setShowAddModal(false);
            setNewMonth('');
            setNewYear('2026');
        } catch (error) {
            console.error('Failed to add period:', error);
            alert('Failed to add period');
        }
    };

    const handleRemovePeriod = async (periodValue) => {
        try {
            await periodsAPI.remove(periodValue);
            setCustomPeriods(prev => prev.filter(p => p.value !== periodValue));
            // Force reload if current month was removed? handled by parent or user action
        } catch (error) {
            console.error('Failed to remove period:', error);
            alert('ไม่สามารถลบรอบบิลได้');
        }
    };

    const handleSearchHouse = () => {
        if (!searchHouseNumber.trim()) return;
        const house = houses.find(h => h.label === searchHouseNumber.trim());
        if (house && onHouseSearch) {
            onHouseSearch(house);
            setSearchHouseNumber('');
        } else {
            alert(`ไม่พบบ้านเลขที่ ${searchHouseNumber}`);
        }
    };

    const billedHouses = houses.filter(h => h.status === 'billed');
    const pendingHouses = houses.filter(h => h.status === 'pending');

    const totalCollection = billedHouses.reduce((sum, h) => sum + (h.billData?.total || 0), 0);
    const totalElec = billedHouses.reduce((sum, h) => sum + (h.billData?.elecBill?.total || 0), 0);
    const totalWater = billedHouses.reduce((sum, h) => sum + (h.billData?.waterBill?.total || 0), 0);

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Village Utility Bill Summary', 20, 20);
        doc.setFontSize(12);
        doc.text(`Billing Period: ${selectedMonth}`, 20, 35);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);

        doc.setFontSize(14);
        doc.text('Summary', 20, 60);
        doc.setFontSize(11);
        doc.text(`Total Houses: ${houses.length}`, 20, 72);
        doc.text(`Billed: ${billedHouses.length}`, 20, 80);
        doc.text(`Pending: ${pendingHouses.length}`, 20, 88);
        doc.text(`Total Collection: ${totalCollection.toFixed(2)} THB`, 20, 100);

        if (billedHouses.length > 0) {
            doc.setFontSize(14);
            doc.text('Billed Houses', 20, 120);
            let y = 132;
            doc.setFontSize(10);
            billedHouses.slice(0, 30).forEach((h, i) => {
                doc.text(`House ${h.label}: ${h.billData?.total?.toFixed(2) || 0} THB`, 20, y);
                y += 8;
                if (y > 270) { doc.addPage(); y = 20; }
            });
        }

        doc.save(`village-bills-${selectedMonth}.pdf`);
    };

    return (
        <div className="bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 p-8 flex flex-col gap-6 overflow-y-auto" style={{ width: '400px' }}>
            {/* Period Management Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-3 rounded-lg font-medium text-base transition-colors flex items-center justify-center gap-1"
                >
                    เพิ่ม
                </button>

                <button
                    onClick={() => setShowRemoveModal(true)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-3 rounded-lg font-medium text-base transition-colors flex items-center justify-center gap-1"
                >
                    ลบ
                </button>
            </div>

            {/* Configure Rates Button */}
            <button
                onClick={() => {
                    const password = prompt('กรุณาใส่รหัสผ่านเพื่อตั้งค่า:');
                    if (password === '1234') {
                        window.location.hash = 'config';
                    } else if (password !== null) {
                        alert('รหัสผ่านไม่ถูกต้อง!');
                    }
                }}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-3 py-3 rounded-lg font-medium text-base transition-colors flex items-center justify-center gap-2"
            >
                ตั้งค่าอัตราค่าบริการ
            </button>

            {/* Search House */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <label className="text-slate-400 text-xs uppercase tracking-wide block mb-2">ค้นหาบ้านเลขที่</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchHouseNumber}
                        onChange={(e) => setSearchHouseNumber(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchHouse()}
                        placeholder="ระบุบ้านเลขที่"
                        className="flex-1 bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <button
                        onClick={handleSearchHouse}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                        ค้นหา
                    </button>
                </div>
            </div>

            <div>
                <h2 className="text-3xl font-bold text-white mb-2">สรุปภาพรวม ({houses.length} หลัง)</h2>
                <p className="text-slate-400 text-base">{selectedMonth}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 rounded-xl p-5 border border-emerald-500/30">
                    <p className="text-emerald-400 text-xs uppercase tracking-wide">จดแล้ว</p>
                    <p className="text-4xl font-bold text-emerald-400">{billedHouses.length}</p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-5 border border-red-500/30">
                    <p className="text-red-400 text-xs uppercase tracking-wide">รอดำเนินการ</p>
                    <p className="text-4xl font-bold text-red-400">{pendingHouses.length}</p>
                </div>
            </div>

            {/* Collection Breakdown */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 space-y-3">
                <h3 className="text-white font-semibold text-lg">สรุปยอดเงิน</h3>
                <div className="flex justify-between text-base">
                    <span className="text-amber-400">ค่าไฟ</span>
                    <span className="text-white">฿{totalElec.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base">
                    <span className="text-cyan-400">ค่าน้ำ</span>
                    <span className="text-white">฿{totalWater.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-slate-600 flex justify-between">
                    <span className="text-emerald-400 font-semibold text-base">ยอดรวมทั้งหมด</span>
                    <span className="text-emerald-400 font-bold text-xl">฿{totalCollection.toFixed(2)}</span>
                </div>
            </div>

            {/* Export Button */}
            <button
                onClick={exportPDF}
                disabled={billedHouses.length === 0}
                className={`py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${billedHouses.length > 0
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
            >
                บันทึกเป็น PDF
            </button>

            {/* Legend */}
            <div className="mt-auto pt-6 border-t border-slate-700">
                <h3 className="text-white font-semibold mb-3"></h3>
                <div className="space-y-2 text-base">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-slate-200 to-slate-300" />
                        <span className="text-slate-300"> - รอการบันทึกค่า</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-emerald-700" />
                        <span className="text-slate-300"> - บันทึกค่าแล้ว</span>
                    </div>
                </div>
            </div>

            {/* Add Period Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999]" style={{ padding: '20px' }}>
                    <div className="bg-slate-900 rounded-3xl border-2 border-indigo-500 shadow-2xl" style={{ width: '500px', padding: '48px' }}>
                        <h3 className="text-white font-bold mb-8" style={{ fontSize: '32px' }}>เพิ่มรอบบิลใหม่</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-slate-200 font-semibold block mb-3" style={{ fontSize: '18px' }}>เดือน</label>
                                <select
                                    value={newMonth}
                                    onChange={(e) => setNewMonth(e.target.value)}
                                    className="w-full bg-slate-800 border-2 border-slate-600 text-white rounded-xl outline-none focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ padding: '16px 20px', fontSize: '18px' }}
                                >
                                    <option value="">เลือกเดือน</option>
                                    {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฏาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((month, i) => (
                                        <option key={i + 1} value={i + 1}>{month}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-slate-200 font-semibold block mb-3" style={{ fontSize: '18px' }}>ปี (ค.ศ.)</label>
                                <input
                                    type="number"
                                    value={newYear}
                                    onChange={(e) => setNewYear(e.target.value)}
                                    className="w-full bg-slate-800 border-2 border-slate-600 text-white rounded-xl outline-none focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ padding: '16px 20px', fontSize: '18px' }}
                                    min="2020"
                                    max="2030"
                                />
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewMonth('');
                                        setNewYear('2026');
                                    }}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all hover:scale-105"
                                    style={{ padding: '18px', fontSize: '18px' }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleAddPeriod}
                                    disabled={!newMonth || !newYear}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                                    style={{ padding: '18px', fontSize: '18px' }}
                                >
                                    ✓ เพิ่มรอบบิล
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Period Modal */}
            {showRemoveModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999]" style={{ padding: '20px' }}>
                    <div className="bg-slate-900 rounded-3xl border-2 border-red-500 shadow-2xl" style={{ width: '500px', padding: '48px' }}>
                        <h3 className="text-white font-bold mb-8" style={{ fontSize: '32px' }}>ลบรอบบิล</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {[...defaultMonths, ...customPeriods].sort((a, b) => b.value.localeCompare(a.value)).map(period => {
                                const isDefault = defaultMonths.some(d => d.value === period.value);
                                return (
                                    <div key={period.value} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl">
                                        <div>
                                            <span className="text-white text-lg">{formatMonthThai(period.value)}</span>
                                            {isDefault && (
                                                <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">ค่าเริ่มต้น</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (isDefault) {
                                                    // Default periods cannot be removed in this version or we use API soft delete
                                                    // For now, let's allow removing them via API too if backend supports it
                                                    // But backend excludes isRemoved: true, so it works same way
                                                    await handleRemovePeriod(period.value);
                                                } else {
                                                    await handleRemovePeriod(period.value);
                                                }
                                                // Reload to update state elsewhere if needed
                                                window.location.reload();
                                            }}
                                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            ลบ
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={() => setShowRemoveModal(false)}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-lg"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Configure Rates Modal */}
            {showRatesModal && (
                <div className="fixed inset-0 bg-slate-900 z-[9999]">
                    <div className="h-full overflow-hidden flex flex-col">
                        <div style={{ padding: '48px', overflowY: 'auto', flex: 1 }}>
                            <h3 className="text-white font-bold mb-6" style={{ fontSize: '32px' }}>⚙️ ตั้งค่าอัตราค่าบริการ</h3>

                            <div className="space-y-8">
                                {/* Electricity Rates Section */}
                                <div>
                                    <h4 className="text-amber-400 font-bold text-xl mb-4">⚡ อัตราค่าไฟฟ้า</h4>
                                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">Tier 1 (0-150 kWh)</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    defaultValue={DEFAULT_RATES.electricity.tiers[0]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="elec-tier1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">Tier 2 (151-400 kWh)</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    defaultValue={DEFAULT_RATES.electricity.tiers[1]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="elec-tier2"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">Tier 3 (&gt;400 kWh)</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    defaultValue={DEFAULT_RATES.electricity.tiers[2]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="elec-tier3"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">Ft Rate</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    defaultValue={DEFAULT_RATES.electricity.ftRate}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="elec-ft"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">Service Fee</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.electricity.serviceFee}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="elec-service"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">VAT Multiplier</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.electricity.vat}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="elec-vat"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Water Rates Section */}
                                <div>
                                    <h4 className="text-cyan-400 font-bold text-xl mb-4">💧 อัตราค่าน้ำประปา</h4>
                                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl">
                                        <div className="grid grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">0-10 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[0]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">11-20 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[1]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier2"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">21-30 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[2]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier3"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">31-50 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[3]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier4"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">51-80 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[4]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier5"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">81-100 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[5]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier6"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">101-300 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[6]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier7"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">&gt;300 m³</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.tiers[7]}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-tier8"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">Service Fee</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.serviceFee}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-service"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-slate-300 text-sm block mb-2">VAT Multiplier</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    defaultValue={DEFAULT_RATES.water.vat}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                                    id="water-vat"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="bg-slate-800 p-6 flex gap-3">
                            <button
                                onClick={() => {
                                    // Reset to defaults
                                    document.getElementById('elec-tier1').value = DEFAULT_RATES.electricity.tiers[0];
                                    document.getElementById('elec-tier2').value = DEFAULT_RATES.electricity.tiers[1];
                                    document.getElementById('elec-tier3').value = DEFAULT_RATES.electricity.tiers[2];
                                    document.getElementById('elec-ft').value = DEFAULT_RATES.electricity.ftRate;
                                    document.getElementById('elec-service').value = DEFAULT_RATES.electricity.serviceFee;
                                    document.getElementById('elec-vat').value = DEFAULT_RATES.electricity.vat;
                                    document.getElementById('water-tier1').value = DEFAULT_RATES.water.tiers[0];
                                    document.getElementById('water-tier2').value = DEFAULT_RATES.water.tiers[1];
                                    document.getElementById('water-tier3').value = DEFAULT_RATES.water.tiers[2];
                                    document.getElementById('water-tier4').value = DEFAULT_RATES.water.tiers[3];
                                    document.getElementById('water-tier5').value = DEFAULT_RATES.water.tiers[4];
                                    document.getElementById('water-tier6').value = DEFAULT_RATES.water.tiers[5];
                                    document.getElementById('water-tier7').value = DEFAULT_RATES.water.tiers[6];
                                    document.getElementById('water-tier8').value = DEFAULT_RATES.water.tiers[7];
                                    document.getElementById('water-service').value = DEFAULT_RATES.water.serviceFee;
                                    document.getElementById('water-vat').value = DEFAULT_RATES.water.vat;
                                    localStorage.removeItem('custom-rates');
                                    alert('Rates reset to Thai PEA/PWA defaults');
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-lg transition-colors"
                            >
                                Reset to Defaults
                            </button>
                            <button
                                onClick={() => setShowRatesModal(false)}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const customRates = {
                                        electricity: {
                                            tiers: [
                                                parseFloat(document.getElementById('elec-tier1').value),
                                                parseFloat(document.getElementById('elec-tier2').value),
                                                parseFloat(document.getElementById('elec-tier3').value)
                                            ],
                                            ftRate: parseFloat(document.getElementById('elec-ft').value),
                                            serviceFee: parseFloat(document.getElementById('elec-service').value),
                                            vat: parseFloat(document.getElementById('elec-vat').value)
                                        },
                                        water: {
                                            tiers: [
                                                parseFloat(document.getElementById('water-tier1').value),
                                                parseFloat(document.getElementById('water-tier2').value),
                                                parseFloat(document.getElementById('water-tier3').value),
                                                parseFloat(document.getElementById('water-tier4').value),
                                                parseFloat(document.getElementById('water-tier5').value),
                                                parseFloat(document.getElementById('water-tier6').value),
                                                parseFloat(document.getElementById('water-tier7').value),
                                                parseFloat(document.getElementById('water-tier8').value)
                                            ],
                                            serviceFee: parseFloat(document.getElementById('water-service').value),
                                            vat: parseFloat(document.getElementById('water-vat').value)
                                        }
                                    };
                                    localStorage.setItem('custom-rates', JSON.stringify(customRates));
                                    setShowRatesModal(false);
                                    alert('Custom rates saved! Page will reload to apply changes.');
                                    window.location.reload();
                                }}
                                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-3 rounded-xl font-bold text-lg transition-colors"
                            >
                                💾 Save Rates
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
