import { useState, useEffect, useRef } from 'react';
import { calculateElectricityBill, calculateWaterBill } from '../utils/billingCalculator';
import { imagesAPI } from '../services/api';

export default function MeterEntryModal({ house, onClose, onSave, selectedMonth }) {
    const [elecCurr, setElecCurr] = useState('');
    const [waterCurr, setWaterCurr] = useState('');
    const [elecBill, setElecBill] = useState(null);
    const [waterBill, setWaterBill] = useState(null);
    const [errors, setErrors] = useState({ elec: '', water: '' });

    // Image states
    const [elecImage, setElecImage] = useState(null);
    const [waterImage, setWaterImage] = useState(null);
    const [elecImagePreview, setElecImagePreview] = useState(null);
    const [waterImagePreview, setWaterImagePreview] = useState(null);

    const elecFileRef = useRef(null);
    const waterFileRef = useRef(null);

    const elecPrev = house.meterData?.elec?.prev ?? 0;
    const waterPrev = house.meterData?.water?.prev ?? 0;

    // Load existing images and current readings
    useEffect(() => {
        // Load images
        const loadImages = async () => {
            try {
                const elec = await imagesAPI.get(house.label, selectedMonth, 'electricity');
                if (elec && elec.imageData) setElecImagePreview(elec.imageData);
            } catch (e) {
                // Ignore 404 or other errors if image doesn't exist
            }
            try {
                const water = await imagesAPI.get(house.label, selectedMonth, 'water');
                if (water && water.imageData) setWaterImagePreview(water.imageData);
            } catch (e) {
                // Ignore errors
            }
        };
        loadImages();

        // Load saved current readings if they exist
        if (house.meterData?.elec?.curr !== null && house.meterData?.elec?.curr !== undefined) {
            setElecCurr(house.meterData.elec.curr.toString());
        }
        if (house.meterData?.water?.curr !== null && house.meterData?.water?.curr !== undefined) {
            setWaterCurr(house.meterData.water.curr.toString());
        }
    }, [house.id, house.label, selectedMonth, house.meterData]);

    // Real-time calculation as user types
    // Real-time calculation as user types
    useEffect(() => {
        if (elecCurr !== '') {
            const curr = parseInt(elecCurr, 10);
            if (!isNaN(curr)) {
                // Treat input as Units Used (Consumption)
                const result = calculateElectricityBill(0, curr);
                if (result.error) {
                    setErrors(e => ({ ...e, elec: result.error }));
                    setElecBill(null);
                } else {
                    setErrors(e => ({ ...e, elec: '' }));
                    setElecBill(result);
                }
            }
        } else {
            setElecBill(null);
            setErrors(e => ({ ...e, elec: '' }));
        }
    }, [elecCurr, elecPrev]);

    useEffect(() => {
        if (waterCurr !== '') {
            const curr = parseInt(waterCurr, 10);
            if (!isNaN(curr)) {
                // Treat input as Units Used (Consumption)
                const result = calculateWaterBill(0, curr);
                if (result.error) {
                    setErrors(e => ({ ...e, water: result.error }));
                    setWaterBill(null);
                } else {
                    setErrors(e => ({ ...e, water: '' }));
                    setWaterBill(result);
                }
            }
        } else {
            setWaterBill(null);
            setErrors(e => ({ ...e, water: '' }));
        }
    }, [waterCurr, waterPrev]);

    const handleImageUpload = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                if (type === 'elec') {
                    setElecImage(dataUrl);
                    setElecImagePreview(dataUrl);
                } else {
                    setWaterImage(dataUrl);
                    setWaterImagePreview(dataUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (elecBill && waterBill && !errors.elec && !errors.water) {
            setIsSaving(true);

            // Call onSave immediately (synchronously handles UI state update)
            const billData = {
                elec: parseInt(elecCurr, 10),
                water: parseInt(waterCurr, 10),
                elecBill,
                waterBill,
                total: Math.round((elecBill.total + waterBill.total) * 100) / 100,
                hasImages: !!(elecImage || waterImage || elecImagePreview || waterImagePreview)
            };

            try {
                await onSave(house.id, billData);
            } catch (error) {
                console.error("Save failed", error);
                setIsSaving(false);
                return;
            }

            // Close modal immediately for instant UI response
            onClose();

            // Upload images in background (fire and forget)
            if (elecImage) {
                imagesAPI.upload(house.label, selectedMonth, 'electricity', elecImage).catch(e => {
                    console.error('Failed to upload electricity photo', e);
                });
            }
            if (waterImage) {
                imagesAPI.upload(house.label, selectedMonth, 'water', waterImage).catch(e => {
                    console.error('Failed to upload water photo', e);
                });
            }
        }
    };

    const grandTotal = (elecBill?.total || 0) + (waterBill?.total || 0);
    const canSave = elecBill && waterBill && !errors.elec && !errors.water;

    const ImageUploadBox = ({ type, preview, fileRef }) => (
        <div className="mt-3">
            <input
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={(e) => handleImageUpload(e, type)}
                className="hidden"
            />
            {preview ? (
                <div className="relative bg-slate-900/50 rounded-lg p-2 flex justify-center">
                    <img src={preview} alt={`${type} meter`} className="max-h-48 h-auto w-auto max-w-full object-contain rounded border border-slate-600" />
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shadow-lg"
                    >
                        📷 เปลี่ยนรูป
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-16 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center gap-2 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
                >
                    📷 อัปโหลดรูปภาพ
                </button>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700 overflow-hidden my-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">บ้านเลขที่ {house.label}</h2>
                        <p className="text-indigo-200 text-sm">บันทึกค่ามิเตอร์ประจำเดือน • {selectedMonth}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-5 max-h-[70vh] overflow-auto">
                    {/* Electricity Section */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="text-xl">⚡</span> ไฟฟ้า
                        </h3>
                        <div>
                            <label className="text-slate-400 text-sm">ค่ามิเตอร์ปัจจุบัน</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={elecCurr}
                                    onChange={(e) => setElecCurr(e.target.value)}
                                    placeholder="ระบุค่า"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-3 pr-10 py-2 text-white font-mono text-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">หน่วย</span>
                            </div>
                        </div>
                        {errors.elec && <p className="text-red-400 text-sm mt-2">{errors.elec}</p>}
                        {elecBill && (
                            <div className="mt-3 pt-3 border-t border-slate-600 grid grid-cols-2 gap-2 text-sm">
                                <span className="text-slate-400">จำนวนหน่วยที่ใช้:</span>
                                <span className="text-white text-right">{elecBill.units}</span>
                                <span className="text-slate-400">ค่าพลังงานไฟฟ้า:</span>
                                <span className="text-white text-right">฿{elecBill.baseCost.toFixed(2)}</span>
                                <span className="text-slate-400">ค่า Ft:</span>
                                <span className="text-white text-right">฿{elecBill.ftCost.toFixed(2)}</span>
                                <span className="text-slate-400">ค่าบริการ:</span>
                                <span className="text-white text-right">฿{elecBill.serviceFee.toFixed(2)}</span>
                                <span className="text-slate-400">ภาษีมูลค่าเพิ่ม (7%):</span>
                                <span className="text-white text-right">฿{elecBill.vat.toFixed(2)}</span>
                                <span className="text-amber-400 font-semibold">รวมเงิน:</span>
                                <span className="text-amber-400 font-semibold text-right">฿{elecBill.total.toFixed(2)}</span>
                            </div>
                        )}
                        <ImageUploadBox type="elec" preview={elecImagePreview} fileRef={elecFileRef} />
                    </div>

                    {/* Water Section */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <h3 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                            <span className="text-xl">💧</span> ประปา
                        </h3>
                        <div>
                            <label className="text-slate-400 text-sm">ค่ามิเตอร์ปัจจุบัน</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={waterCurr}
                                    onChange={(e) => setWaterCurr(e.target.value)}
                                    placeholder="ระบุค่า"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-3 pr-10 py-2 text-white font-mono text-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">ลบ.ม.</span>
                            </div>
                        </div>
                        {errors.water && <p className="text-red-400 text-sm mt-2">{errors.water}</p>}
                        {waterBill && (
                            <div className="mt-3 pt-3 border-t border-slate-600 grid grid-cols-2 gap-2 text-sm">
                                <span className="text-slate-400">จำนวนหน่วยที่ใช้:</span>
                                <span className="text-white text-right">{waterBill.units}</span>
                                <span className="text-slate-400">ค่าน้ำประปา:</span>
                                <span className="text-white text-right">฿{waterBill.baseCost.toFixed(2)}</span>
                                <span className="text-slate-400">ค่าบริการ:</span>
                                <span className="text-white text-right">฿{waterBill.serviceFee.toFixed(2)}</span>
                                <span className="text-slate-400">ภาษีมูลค่าเพิ่ม (7%):</span>
                                <span className="text-white text-right">฿{waterBill.vat.toFixed(2)}</span>
                                <span className="text-cyan-400 font-semibold">รวมเงิน:</span>
                                <span className="text-cyan-400 font-semibold text-right">฿{waterBill.total.toFixed(2)}</span>
                            </div>
                        )}
                        <ImageUploadBox type="water" preview={waterImagePreview} fileRef={waterFileRef} />
                    </div>

                    {/* Grand Total */}
                    {(elecBill || waterBill) && (
                        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-4 flex justify-between items-center">
                            <span className="text-lg text-white font-semibold">ยอดรวมสุทธิ</span>
                            <span className="text-2xl font-bold text-emerald-400">฿{grandTotal.toFixed(2)}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!canSave || isSaving}
                            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${canSave && !isSaving
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกบิล'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
