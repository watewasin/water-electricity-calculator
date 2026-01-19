// Default Thai PEA Electricity Rates (Residential Type 1.1.2 - >150 kWh/month)
// Ref: https://www.pea.co.th/Portals/0/demand_response/Electricity%20Rerates.pdf
const DEFAULT_ELEC_TIERS = [
    { max: 150, rate: 3.2484 },
    { max: 400, rate: 4.2218 },
    { max: Infinity, rate: 4.4217 }
];
const DEFAULT_FT_RATE = 0.3972; // Sep-Dec 2024 Rate
const DEFAULT_ELEC_SERVICE_FEE = 38.22;

// Default Thai PWA Water Rates (Residential Type 1)
// Ref: https://www.pwa.co.th/contents/service/table-price
const DEFAULT_WATER_TIERS = [
    { max: 10, rate: 10.20 },
    { max: 20, rate: 16.00 },
    { max: 30, rate: 19.00 },
    { max: 50, rate: 21.20 },
    { max: 80, rate: 21.60 },
    { max: 100, rate: 21.65 },
    { max: 300, rate: 21.70 },
    { max: Infinity, rate: 21.75 }
];
const DEFAULT_WATER_SERVICE_FEE = 30.00; // 1/2 inch pipe

const DEFAULT_VAT_RATE = 1.07;

// Load custom rates from localStorage or use defaults
function getRates() {
    const customRates = localStorage.getItem('custom-rates');
    if (customRates) {
        try {
            const rates = JSON.parse(customRates);
            return {
                elecTiers: [
                    { max: 150, rate: rates.electricity.tiers[0] },
                    { max: 400, rate: rates.electricity.tiers[1] },
                    { max: Infinity, rate: rates.electricity.tiers[2] }
                ],
                ftRate: rates.electricity.ftRate,
                elecServiceFee: rates.electricity.serviceFee,
                waterTiers: [
                    { max: 10, rate: rates.water.tiers[0] },
                    { max: 20, rate: rates.water.tiers[1] },
                    { max: 30, rate: rates.water.tiers[2] },
                    { max: 50, rate: rates.water.tiers[3] },
                    { max: 80, rate: rates.water.tiers[4] },
                    { max: 100, rate: rates.water.tiers[5] },
                    { max: 300, rate: rates.water.tiers[6] },
                    { max: Infinity, rate: rates.water.tiers[7] }
                ],
                waterServiceFee: rates.water.serviceFee,
                vatRate: rates.electricity.vat // Use electricity VAT for both
            };
        } catch (e) {
            console.error('Error loading custom rates:', e);
        }
    }

    // Return defaults if no custom rates or error
    return {
        elecTiers: DEFAULT_ELEC_TIERS,
        ftRate: DEFAULT_FT_RATE,
        elecServiceFee: DEFAULT_ELEC_SERVICE_FEE,
        waterTiers: DEFAULT_WATER_TIERS,
        waterServiceFee: DEFAULT_WATER_SERVICE_FEE,
        vatRate: DEFAULT_VAT_RATE
    };
}

// Calculate progressive tier cost
function calculateTieredCost(units, tiers) {
    let totalCost = 0;
    let remaining = units;
    let prevMax = 0;

    for (const tier of tiers) {
        if (remaining <= 0) break;
        const tierUnits = Math.min(remaining, tier.max - prevMax);
        totalCost += tierUnits * tier.rate;
        remaining -= tierUnits;
        prevMax = tier.max;
    }
    return totalCost;
}

// Electricity bill calculation
export function calculateElectricityBill(prevReading, currReading) {
    const rates = getRates();
    const units = currReading - prevReading;
    // Removed validation for units < 0 as per user request

    // If units < 0, simple calculation would result in negative FT and 0 Base Cost.
    // We'll proceed with the math as is, which handles adjustments.

    const baseCost = calculateTieredCost(units, rates.elecTiers);
    const ftCost = units * rates.ftRate;
    const serviceFee = rates.elecServiceFee;
    const subtotal = baseCost + ftCost + serviceFee;
    const vat = subtotal * 0.07;
    const total = subtotal * rates.vatRate;

    return {
        units,
        baseCost: Math.round(baseCost * 100) / 100,
        ftCost: Math.round(ftCost * 100) / 100,
        serviceFee,
        vat: Math.round(vat * 100) / 100,
        total: Math.round(total * 100) / 100
    };
}

// Water bill calculation
export function calculateWaterBill(prevReading, currReading) {
    const rates = getRates();
    const units = currReading - prevReading;
    // Removed validation for units < 0

    const baseCost = calculateTieredCost(units, rates.waterTiers);
    const serviceFee = rates.waterServiceFee;
    const subtotal = baseCost + serviceFee;
    const vat = subtotal * 0.07;
    const total = subtotal * rates.vatRate;

    return {
        units,
        baseCost: Math.round(baseCost * 100) / 100,
        serviceFee,
        vat: Math.round(vat * 100) / 100,
        total: Math.round(total * 100) / 100
    };
}

// Combined bill calculation
export function calculateTotalBill(elecPrev, elecCurr, waterPrev, waterCurr) {
    const elec = calculateElectricityBill(elecPrev, elecCurr);
    const water = calculateWaterBill(waterPrev, waterCurr);
    return {
        electricity: elec,
        water: water,
        grandTotal: Math.round((elec.total + water.total) * 100) / 100
    };
}
