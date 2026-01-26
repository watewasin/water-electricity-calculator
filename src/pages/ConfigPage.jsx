import { useState, useEffect } from 'react';
import { ratesAPI } from '../services/api';

export default function ConfigPage() {
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

    // Load rates from API
    useEffect(() => {
        const loadRates = async () => {
            try {
                const rates = await ratesAPI.get();
                if (rates) {
                    // Populate fields with fetched values
                    if (rates.electricity) {
                        document.getElementById('elec-tier1').value = rates.electricity.tiers[0];
                        document.getElementById('elec-tier2').value = rates.electricity.tiers[1];
                        document.getElementById('elec-tier3').value = rates.electricity.tiers[2];
                        document.getElementById('elec-ft').value = rates.electricity.ftRate;
                        document.getElementById('elec-service').value = rates.electricity.serviceFee;
                        document.getElementById('elec-vat').value = rates.electricity.vat;
                    }
                    if (rates.water) {
                        document.getElementById('water-tier1').value = rates.water.tiers[0];
                        document.getElementById('water-tier2').value = rates.water.tiers[1];
                        document.getElementById('water-tier3').value = rates.water.tiers[2];
                        document.getElementById('water-tier4').value = rates.water.tiers[3];
                        document.getElementById('water-tier5').value = rates.water.tiers[4];
                        document.getElementById('water-tier6').value = rates.water.tiers[5];
                        document.getElementById('water-tier7').value = rates.water.tiers[6];
                        document.getElementById('water-tier8').value = rates.water.tiers[7];
                        document.getElementById('water-service').value = rates.water.serviceFee;
                        document.getElementById('water-vat').value = rates.water.vat;
                    }
                }
            } catch (error) {
                console.error('Failed to load rates:', error);
            }
        };
        loadRates();
    }, []);

    const handleReset = async () => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตเป็นค่าเริ่มต้น?')) {
            try {
                await ratesAPI.reset();
                alert('รีเซ็ตอัตราค่าบริการเป็นค่าเริ่มต้นของ กฟภ./กปภ. เรียบร้อยแล้ว');
                window.location.reload();
            } catch (error) {
                console.error('Failed to reset rates:', error);
                alert('ไม่สามารถรีเซ็ตค่าได้');
            }
        }
    };

    const handleSave = async () => {
        const electricity = {
            tiers: [
                parseFloat(document.getElementById('elec-tier1').value),
                parseFloat(document.getElementById('elec-tier2').value),
                parseFloat(document.getElementById('elec-tier3').value)
            ],
            ftRate: parseFloat(document.getElementById('elec-ft').value),
            serviceFee: parseFloat(document.getElementById('elec-service').value),
            vat: parseFloat(document.getElementById('elec-vat').value)
        };

        const water = {
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
        };

        try {
            await ratesAPI.update(electricity, water);
            alert('บันทึกอัตราค่าบริการเรียบร้อยแล้ว! กำลังกลับสู่หน้าหลัก...');
            window.location.hash = '';
        } catch (error) {
            console.error('Failed to save rates:', error);
            alert('ไม่สามารถบันทึกค่าได้');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold">ตั้งค่าอัตราค่าบริการ</h1>
                <button
                    onClick={() => window.location.hash = ''}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                    กลับไปหน้าหลัก
                </button>
            </div>

            {/* Content */}
            <div className="p-8 max-w-7xl mx-auto">
                <div className="space-y-8">
                    {/* Electricity Rates Section */}
                    <div>
                        <h2 className="text-amber-400 font-bold text-2xl mb-4">อัตราค่าไฟฟ้า</h2>
                        <div className="space-y-4 bg-slate-800/50 p-6 rounded-xl">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ขั้นที่ 1 (0-150 หน่วย)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        defaultValue={DEFAULT_RATES.electricity.tiers[0]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="elec-tier1"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ขั้นที่ 2 (151-400 หน่วย)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        defaultValue={DEFAULT_RATES.electricity.tiers[1]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="elec-tier2"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ขั้นที่ 3 (&gt;400 หน่วย)</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        defaultValue={DEFAULT_RATES.electricity.tiers[2]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="elec-tier3"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ค่า Ft</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        defaultValue={DEFAULT_RATES.electricity.ftRate}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="elec-ft"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ค่าบริการรายเดือน</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.electricity.serviceFee}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="elec-service"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ภาษีมูลค่าเพิ่ม (ตัวคูณ)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.electricity.vat}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="elec-vat"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Water Rates Section */}
                    <div>
                        <h2 className="text-cyan-400 font-bold text-2xl mb-4">อัตราค่าน้ำประปา</h2>
                        <div className="space-y-4 bg-slate-800/50 p-6 rounded-xl">
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">0-10 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[0]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier1"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">11-20 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[1]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier2"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">21-30 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[2]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier3"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">31-50 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[3]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier4"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">51-80 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[4]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier5"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">81-100 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[5]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier6"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">101-300 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[6]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier7"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">&gt;300 ลบ.ม.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.tiers[7]}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-tier8"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ค่าบริการรายเดือน</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.serviceFee}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-service"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 block mb-2 font-semibold">ภาษีมูลค่าเพิ่ม (ตัวคูณ)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={DEFAULT_RATES.water.vat}
                                        className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-lg"
                                        id="water-vat"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex gap-4 justify-end">
                    <button
                        onClick={handleReset}
                        className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-lg transition-colors"
                    >
                        คืนค่าเริ่มต้น
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-lg transition-colors"
                    >
                        บันทึกการตั้งค่า
                    </button>
                </div>
            </div>
        </div>
    );
}
