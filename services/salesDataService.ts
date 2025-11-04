import { SalesRecord } from '../types';

const retailers = ['Amazon', 'Barnes & Noble', 'Apple Books', 'Indie Bookstores', 'Google Play', 'Kobo'];
const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan'];

const genreMultipliers = {
    'default': { base: 10, spike: 100, price: 12.99 },
    'thriller': { base: 20, spike: 250, price: 14.99 },
    'sci-fi': { base: 15, spike: 200, price: 13.99 },
    'fantasy': { base: 18, spike: 220, price: 14.49 },
    'romance': { base: 25, spike: 300, price: 9.99 },
    'non-fiction': { base: 8, spike: 80, price: 19.99 },
};

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateSalesData = (bookTitle: string, genre: string, days: number): SalesRecord[] => {
    const data: SalesRecord[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const genreKey = Object.keys(genreMultipliers).find(k => genre.toLowerCase().includes(k)) || 'default';
    const config = genreMultipliers[genreKey as keyof typeof genreMultipliers];

    // Create a few random "marketing spike" days
    const spikeDays = new Set<string>();
    for (let i = 0; i < Math.floor(days / 30) + 1; i++) {
        const spikeDate = new Date(startDate);
        spikeDate.setDate(startDate.getDate() + Math.floor(Math.random() * days));
        spikeDays.add(spikeDate.toISOString().split('T')[0]);
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const isSpikeDay = spikeDays.has(dateStr);
        const dailyTotalUnits = Math.floor(Math.random() * config.base) + (isSpikeDay ? config.spike : 5) + (Math.sin(d.getTime() / (1000 * 60 * 60 * 24 * 7)) * 5 + 5); // Weekly cycle

        // Generate records for this day, distributed among retailers
        let unitsLeft = Math.round(dailyTotalUnits);
        while (unitsLeft > 0) {
            const unitsForThisRecord = Math.min(unitsLeft, Math.floor(Math.random() * 20) + 1);
            const retailer = getRandomElement(retailers);
            const country = getRandomElement(countries);
            const revenue = parseFloat((unitsForThisRecord * (config.price + (Math.random() - 0.5))).toFixed(2));

            data.push({
                date: dateStr,
                unitsSold: unitsForThisRecord,
                revenue: revenue,
                retailer,
                country,
            });
            unitsLeft -= unitsForThisRecord;
        }
    }
    return data;
};