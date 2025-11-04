
import React from 'react';

interface ChartData {
    date: string;
    units: number;
}

interface SalesChartProps {
    data: ChartData[];
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
    if (!data || data.length < 2) {
        return <div className="flex items-center justify-center h-full text-gray-500">Not enough data to display a chart.</div>;
    }
    
    const width = 500;
    const height = 200;
    const padding = 20;

    const maxUnits = Math.max(...data.map(d => d.units), 0);
    const minUnits = 0;

    const getX = (index: number) => {
        return padding + (index / (data.length - 1)) * (width - padding * 2);
    };

    const getY = (units: number) => {
        if (maxUnits === minUnits) return height - padding;
        return height - padding - ((units - minUnits) / (maxUnits - minUnits)) * (height - padding * 2);
    };

    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.units)}`).join(' ');
    
    const areaPath = `${linePath} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
    
    const yAxisLabels = [maxUnits, maxUnits * 0.75, maxUnits * 0.5, maxUnits * 0.25, 0].map(val => ({
        value: Math.round(val),
        y: getY(val)
    }));
    
    const xAxisLabels = [
        { value: new Date(data[0].date).toLocaleDateString('en-us', {month: 'short', day: 'numeric'}), x: getX(0) },
        { value: new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString('en-us', {month: 'short', day: 'numeric'}), x: getX(Math.floor(data.length / 2))},
        { value: new Date(data[data.length - 1].date).toLocaleDateString('en-us', {month: 'short', day: 'numeric'}), x: getX(data.length-1) }
    ];

    return (
       <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="Sales chart" role="img">
           <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
            </defs>
            
            {/* Y-Axis Grid Lines and Labels */}
            {yAxisLabels.map(({ value, y }, i) => (
                <g key={i} className="text-gray-500">
                    <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
                    <text x={padding - 5} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor">{value}</text>
                </g>
            ))}

            {/* X-Axis Labels */}
            {xAxisLabels.map(({ value, x }, i) => (
                 <text key={i} x={x} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="currentColor" className="text-gray-500">
                    {value}
                </text>
            ))}
            
            {/* Area Path */}
            <path d={areaPath} fill="url(#areaGradient)">
                <animate attributeName="d" from={`${linePath} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`} to={areaPath} dur="0.5s" fill="freeze" />
            </path>
            
            {/* Line Path */}
            <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <animate attributeName="d" from={data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(0)}`).join(' ')} to={linePath} dur="0.5s" fill="freeze" />
            </path>
       </svg>
    );
};
