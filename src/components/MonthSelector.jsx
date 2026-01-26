import { useState, useEffect } from 'react';
import { periodsAPI } from '../services/api';

export default function MonthSelector({ selectedMonth, onChange, onAddPeriod }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [newMonth, setNewMonth] = useState('');
    const [newYear, setNewYear] = useState('2026');
    const [customPeriods, setCustomPeriods] = useState([]);

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

    const allMonths = [...defaultMonths, ...customPeriods].map(p => ({
        ...p,
        label: formatMonthThai(p.value) // Override label with Thai format
    })).sort((a, b) => b.value.localeCompare(a.value));

    const handleAddPeriod = async () => {
        if (!newMonth || !newYear) {
            alert('กรุณาเลือกทั้งเดือนและปี');
            return;
        }

        // Format the value properly
        const monthNum = String(newMonth).padStart(2, '0');
        const value = `${newYear}-${monthNum}`;

        // Check if period already exists
        const exists = [...defaultMonths, ...customPeriods].some(p => p.value === value);
        if (exists) {
            alert('รอบบิลนี้มีอยู่แล้ว!');
            return;
        }

        // Create label
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

            // Notify parent and switch to new period
            if (onAddPeriod) onAddPeriod(value);
            onChange(value);
        } catch (error) {
            console.error('Failed to add period:', error);
            alert('ไม่สามารถเพิ่มรอบบิลได้');
        }
    };

    const handleRemovePeriod = async (periodValue) => {
        try {
            await periodsAPI.remove(periodValue);
            setCustomPeriods(prev => prev.filter(p => p.value !== periodValue));

            // If the removed period was selected, switch to the first available period
            if (selectedMonth === periodValue) {
                const firstPeriod = allMonths.find(m => m.value !== periodValue);
                if (firstPeriod) onChange(firstPeriod.value);
            }
        } catch (error) {
            console.error('Failed to remove period:', error);
            alert('ไม่สามารถลบรอบบิลได้');
        }
    };

    return (
        <div className="flex items-center gap-3">
            <label className="text-slate-400 text-sm font-medium">รอบบิล:</label>
            <select
                value={selectedMonth}
                onChange={(e) => onChange(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
            >
                {allMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </select>

            {/* Add Period Modal */}
            {showAddModal && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-end z-[9999]"
                    style={{ padding: '20px' }}
                >
                    <div
                        className="bg-slate-900 rounded-3xl border-2 border-indigo-500 shadow-2xl"
                        style={{
                            width: '90%',
                            maxWidth: '600px',
                            padding: '48px'
                        }}
                    >
                        <h3 className="text-white font-bold mb-8" style={{ fontSize: '32px' }}>
                            เพิ่มรอบบิลใหม่
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-slate-200 font-semibold block mb-3" style={{ fontSize: '18px' }}>
                                    เดือน
                                </label>
                                <select
                                    value={newMonth}
                                    onChange={(e) => setNewMonth(e.target.value)}
                                    className="w-full bg-slate-800 border-2 border-slate-600 text-white rounded-xl outline-none focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{
                                        padding: '16px 20px',
                                        fontSize: '18px'
                                    }}
                                >
                                    <option value="">เลือกเดือน</option>
                                    {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฏาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((month, i) => (
                                        <option key={i + 1} value={i + 1}>{month}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-slate-200 font-semibold block mb-3" style={{ fontSize: '18px' }}>
                                    ปี (ค.ศ.)
                                </label>
                                <input
                                    type="number"
                                    value={newYear}
                                    onChange={(e) => setNewYear(e.target.value)}
                                    className="w-full bg-slate-800 border-2 border-slate-600 text-white rounded-xl outline-none focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{
                                        padding: '16px 20px',
                                        fontSize: '18px'
                                    }}
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
                                    style={{
                                        padding: '18px',
                                        fontSize: '18px'
                                    }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleAddPeriod}
                                    disabled={!newMonth || !newYear}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                                    style={{
                                        padding: '18px',
                                        fontSize: '18px'
                                    }}
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 pt-16">
                    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 w-80">
                        <h3 className="text-white font-bold mb-4">ลบรอบบิล</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {customPeriods.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">ไม่มีรอบบิลที่ลบได้</p>
                            ) : (
                                customPeriods.map(period => (
                                    <div key={period.value} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                                        <span className="text-white">{period.label}</span>
                                        <button
                                            onClick={() => {
                                                handleRemovePeriod(period.value);
                                                if (customPeriods.length === 1) setShowRemoveModal(false);
                                            }}
                                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition-colors"
                                        >
                                            ลบ
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={() => setShowRemoveModal(false)}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
