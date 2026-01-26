import HouseBox from './HouseBox';

export default function VillageMap({ houses, onHouseClick }) {
    // Group houses by zone
    const zones = {
        Zone_TopRight: houses.filter(h => h.zone === 'Zone_TopRight'),
        Zone_N: houses.filter(h => h.zone === 'Zone_N'),
        Zone_18: houses.filter(h => h.zone === 'Zone_18'),
        Zone_C: houses.filter(h => h.zone === 'Zone_C'),
        Zone_E: houses.filter(h => h.zone === 'Zone_E'),
        Zone_S: houses.filter(h => h.zone === 'Zone_S'),
        Zone_W: houses.filter(h => h.zone === 'Zone_W'),
        // Zone_TR: houses.filter(h => h.zone === 'Zone_TR'), // Removed
        Zone_Pyramid: houses.filter(h => h.zone === 'Zone_Pyramid'),
    };

    // Helper function to render a zone
    const renderZone = (zoneHouses, cols, bgColor = 'bg-orange-200/80', label = '', labelBg = 'bg-gray-700') => {
        if (!zoneHouses || zoneHouses.length === 0) return null;

        return (
            <div className={`${bgColor} rounded p-3`}>
                {label && (
                    <div className={`${labelBg} text-white px-2 py-0.5 rounded text-[11px] font-bold inline-block mb-1.5`}>
                        {label}
                    </div>
                )}
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {zoneHouses.map(house => (
                        <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                    ))}
                </div>
            </div>
        );
    };

    // Render Zone E with spacing every 3 rows
    const renderZoneEWithGaps = () => {
        const zoneHouses = zones.Zone_E;
        if (!zoneHouses || zoneHouses.length === 0) return null;

        // 16 rows, 2 cols each, add gap every 3 rows
        const rows = [];
        for (let row = 0; row < 16; row++) {
            const rowHouses = zoneHouses.slice(row * 2, (row + 1) * 2);
            const isGapRow = (row + 1) % 3 === 0 && row < 15;
            rows.push(
                <div key={row} className={`flex gap-0.5 ${isGapRow ? 'mb-2' : 'mb-0.5'}`}>
                    {rowHouses.map(house => (
                        <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-orange-200/80 rounded p-2">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1">
                    Zone E
                </div>
                {rows}
            </div>
        );
    };

    // Render Zone S with spacing every 2 rows and every 3 columns
    const renderZoneSWithGaps = () => {
        const zoneHouses = zones.Zone_S;
        if (!zoneHouses || zoneHouses.length === 0) return null;

        // 5 rows, 10 cols each, add gap every 2 rows and every 3 cols
        const rows = [];
        for (let row = 0; row < 5; row++) {
            const rowHouses = zoneHouses.slice(row * 10, (row + 1) * 10);
            const isGapRow = (row + 1) % 2 === 0 && row < 4;

            // Split into groups of 3 columns: [3, 3, 3, 1]
            rows.push(
                <div key={row} className={`flex gap-3 ${isGapRow ? 'mb-2' : 'mb-0.5'}`}>
                    {[0, 3, 6, 9].map(start => (
                        <div key={start} className="flex gap-0.5">
                            {rowHouses.slice(start, Math.min(start + 3, 10)).map(house => (
                                <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                            ))}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-orange-200/80 rounded p-2">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1">
                    Zone S
                </div>
                {rows}
            </div>
        );
    };

    // Render Zone TR (labeled Zone W) with spacing every 2 rows and every 3 columns
    const renderZoneTRWithGaps = () => {
        const zoneHouses = zones.Zone_TR;
        if (!zoneHouses || zoneHouses.length === 0) return null;

        // 8 rows, 10 cols each, add gap every 2 rows and every 3 cols
        const rows = [];
        for (let row = 0; row < 8; row++) {
            const rowHouses = zoneHouses.slice(row * 10, (row + 1) * 10);
            const isGapRow = (row + 1) % 2 === 0 && row < 7;

            // Split into groups of 3 columns: [3, 3, 3, 1]
            rows.push(
                <div key={row} className={`flex gap-3 ${isGapRow ? 'mb-2' : 'mb-0.5'}`}>
                    {[0, 3, 6, 9].map(start => (
                        <div key={start} className="flex gap-0.5">
                            {rowHouses.slice(start, Math.min(start + 3, 10)).map(house => (
                                <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                            ))}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-orange-200/80 rounded p-2">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1">
                    Zone W
                </div>
                {rows}
            </div>
        );
    };

    // Render Zone Pyramid with spacing every 2 rows
    const renderZonePyramidWithGaps = () => {
        const zoneHouses = zones.Zone_Pyramid;
        if (!zoneHouses || zoneHouses.length === 0) return null;

        // 8 rows with decreasing columns: 20, 20, 18, 18, 16, 16, 14, 14
        const rowConfigs = [20, 20, 18, 18, 16, 16, 14, 14];
        const rows = [];
        let houseIndex = 0;

        for (let row = 0; row < 8; row++) {
            const cols = rowConfigs[row];
            const rowHouses = zoneHouses.slice(houseIndex, houseIndex + cols);
            houseIndex += cols;
            const isGapRow = (row + 1) % 2 === 0 && row < 7;
            const shouldAlignRight = row >= 2; // Rows 3-8 (indices 2-7)

            rows.push(
                <div key={row} className={`flex gap-0.5 ${isGapRow ? 'mb-2' : 'mb-0.5'} ${shouldAlignRight ? 'justify-end' : ''}`}>
                    {rowHouses.map(house => (
                        <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-orange-200/80 rounded p-2">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1">
                    Zone W
                </div>
                {rows}
            </div>
        );
    };

    // Render Zone N with 18 columns in 3 groups of 6
    const renderZoneNWithGaps = () => {
        const zoneHouses = zones.Zone_N;
        if (!zoneHouses || zoneHouses.length === 0) return null;

        // 4 rows, each row has 18 houses split into 3 groups of 6
        const rows = [];
        for (let row = 0; row < 4; row++) {
            const rowHouses = zoneHouses.slice(row * 18, (row + 1) * 18);
            rows.push(
                <div key={row} className="flex gap-3 mb-0.5">
                    {[0, 6, 12].map(start => (
                        <div key={start} className="flex gap-0.5">
                            {rowHouses.slice(start, start + 6).map(house => (
                                <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                            ))}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-orange-200/80 rounded p-2">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1">
                    Zone N
                </div>
                {rows}
            </div>
        );
    };

    // Render Zone 18 (labeled Zone C) with spacing every 2 rows
    const renderZone18WithGaps = () => {
        const zoneHouses = zones.Zone_18;
        if (!zoneHouses || zoneHouses.length === 0) return null;

        // 6 rows, 4 cols each, add gap every 2 rows
        const rows = [];
        for (let row = 0; row < 6; row++) {
            const rowHouses = zoneHouses.slice(row * 4, (row + 1) * 4);
            const isGapRow = (row + 1) % 2 === 0 && row < 5;
            rows.push(
                <div key={row} className={`flex gap-0.5 ${isGapRow ? 'mb-2' : 'mb-0.5'}`}>
                    {rowHouses.map(house => (
                        <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-orange-200/80 rounded p-2">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1">
                    Zone C
                </div>
                {rows}
            </div>
        );
    };

    // Render Zone C (original) with spacing every 2 rows
    const renderZoneCWithGaps = () => {
        const zoneHouses = zones.Zone_C;
        if (!zoneHouses || zoneHouses.length === 0) return null;

        // 6 rows, 3 cols each, add gap every 2 rows
        const rows = [];
        for (let row = 0; row < 6; row++) {
            const rowHouses = zoneHouses.slice(row * 3, (row + 1) * 3);
            const isGapRow = (row + 1) % 2 === 0 && row < 5;
            rows.push(
                <div key={row} className={`flex gap-0.5 ${isGapRow ? 'mb-2' : 'mb-0.5'}`}>
                    {rowHouses.map(house => (
                        <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-orange-200/80 rounded p-2">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-1">
                    Zone C
                </div>
                {rows}
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-auto p-6 bg-white">
            {/* Main container with grid background and dashed border */}
            <div
                className="relative border-4 border-dashed border-amber-800 rounded-lg p-6 min-w-[1800px] min-h-[1000px] bg-gray-50"
                style={{
                    backgroundImage: 'linear-gradient(#e0e0e0 1px, transparent 1px), linear-gradient(90deg, #e0e0e0 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }}
            >

                {/* Zone N: 4 rows × 18 columns (3 groups of 6) with 82/0 label */}
                <div className="absolute" style={{ top: '40px', right: '120px' }}>
                    {renderZoneNWithGaps()}
                </div>

                {/* Parking area - below rightmost 6 columns of Zone N */}
                <div className="absolute" style={{ top: '220px', right: '120px' }}>
                    <div className="bg-emerald-100 border-2 border-emerald-400 rounded px-4 py-3 text-center shadow-md"
                        style={{ width: '252px', height: '52px' }}>
                        <div className="text-emerald-800 font-bold text-xs">ลานจอดรถ</div>
                    </div>
                </div>

                {/* Zone 18: 4 cols × 6 rows - below parking area */}
                <div className="absolute" style={{ top: '330px', right: '520px' }}>
                    {renderZone18WithGaps()}
                </div>

                {/* Zone TR: 10 cols × 8 rows - REMOVED */}
                {/* <div className="absolute" style={{ top: '270px', right: '520px' }}>
                    {renderZoneTRWithGaps()}
                </div> */}

                {/* Zone Pyramid: Pyramid layout - renamed to Zone C */}
                <div className="absolute" style={{ top: '270px', right: '768px' }}>
                    {renderZonePyramidWithGaps()}
                </div>

                {/* Zone C: 3 cols × 6 rows - next to Zone 18 */}
                <div className="absolute" style={{ top: '330px', right: '220px' }}>
                    {renderZoneCWithGaps()}
                </div>

                {/* Zone S: 10 cols × 5 rows - below Zone C/18, left of Zone E */}
                <div className="absolute" style={{ top: '620px', right: '250px' }}>
                    {renderZoneSWithGaps()}
                </div>

                {/* Zone W: 4 cols × 2 rows - to the left of Zone S */}
                <div className="absolute" style={{ top: '620px', right: '804px' }}>
                    <div className="bg-orange-200/80 rounded p-3">
                        <div className="bg-gray-700 text-white px-2 py-0.5 rounded text-[11px] font-bold inline-block mb-1.5">
                            Zone S
                        </div>
                        <div className="grid gap-1 justify-items-end" style={{ gridTemplateColumns: `repeat(4, minmax(0, 1fr))` }}>
                            {zones.Zone_W.map(house => (
                                <HouseBox key={house.id} house={house} onClick={onHouseClick} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Parking area - to the left of Zone W (same size as Zone W: 4 cols × 2 rows) */}
                <div className="absolute" style={{ top: '620px', right: '1088px' }}>
                    <div className="bg-emerald-100 border-2 border-emerald-400 rounded px-4 py-2 text-center shadow-md"
                        style={{ width: '168px', height: '52px' }}>
                        <div className="text-emerald-800 font-bold text-xs">ลานจอดรถ</div>
                    </div>
                </div>

                {/* Zone E: 2 cols × 16 rows - to the right */}
                <div className="absolute" style={{ top: '390px', right: '40px' }}>
                    {renderZoneEWithGaps()}
                </div>

                {/* Parking area - under Zone S (Zone S width, half Zone S height) */}
                <div className="absolute" style={{ top: '830px', right: '250px' }}>
                    <div className="bg-emerald-100 border-2 border-emerald-400 rounded px-4 py-2 text-center shadow-md"
                        style={{ width: '420px', height: '65px' }}>
                        <div className="text-emerald-800 font-bold text-sm">ลานจอดรถ</div>
                    </div>
                </div>

                {/* Zone: Top Right - 1 column × 10 rows (5082-5073) */}
                <div className="absolute" style={{ top: '40px', right: '40px' }}>
                    {renderZone(zones.Zone_TopRight, 1, 'bg-orange-200/80', '', 'bg-gray-700')}
                </div>

            </div>
        </div>
    );
}
