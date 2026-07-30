import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#5d3fd3', '#7d5dfc', '#9b82ff', '#bca8ff', '#e0d4ff'];

export function ChartWidget({ chartSpec }) {
  const chartRef = useRef(null);

  const { type, title, data, xKey = 'name', yKey = 'value' } = chartSpec;

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPng = async () => {
    if (!chartRef.current) return;
    try {
      setIsDownloading(true);
      // We capture the entire widget container (including title and HTML legend)
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2, // High resolution
        style: {
          margin: '0',
          boxShadow: 'none',
          borderRadius: '0'
        }
      });
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `${title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'chart'}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
    } catch (err) {
      console.error('Failed to download chart:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderChartType = () => {
    switch (type.toLowerCase()) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{fontSize: 12}} />
            <YAxis tick={{fontSize: 12}} />
            <Tooltip cursor={{fill: '#f3f4f6'}} />
            <Bar dataKey={yKey} fill="#5d3fd3" radius={[4,4,0,0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{fontSize: 12}} />
            <YAxis tick={{fontSize: 12}} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="#5d3fd3" strokeWidth={2} dot={{r: 4}} />
          </LineChart>
        );
      case 'pie':
      default:
        return (
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} fill="#5d3fd3" label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
    }
  };

  return (
    <div 
      className="my-4 h-96 w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col relative group"
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-semibold text-gray-800 text-lg">{title || 'Data Visualization'}</h3>
        <button 
          onClick={handleDownloadPng}
          disabled={isDownloading}
          className="text-gray-500 hover:text-[#5d3fd3] hover:bg-purple-50 p-1.5 rounded-md transition-colors flex items-center gap-1 text-sm border border-transparent hover:border-purple-100 opacity-0 group-hover:opacity-100 sm:opacity-100 disabled:opacity-50"
          title="Download as PNG"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">{isDownloading ? 'Saving...' : 'Save PNG'}</span>
        </button>
      </div>
      
      <div className="flex-1 min-h-0 bg-white" ref={chartRef} style={{ paddingBottom: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChartType()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
