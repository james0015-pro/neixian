import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
  ColorType,
} from 'lightweight-charts';

interface ChartPanelProps {
  ticker: string;
}

// Deterministic price generator based on ticker string
function seedFrom(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function generateOHLCV(ticker: string, count = 90) {
  const seed = seedFrom(ticker + '_ohlcv');
  const rng = (i: number) => {
    const x = Math.sin(seed + i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const basePrice = 50 + rng(0) * 200;
  const drift = rng(1) > 0.5 ? 1.002 : 0.998;

  const data: { time: Time; open: number; high: number; low: number; close: number }[] = [];
  const volumes: { time: Time; value: number; color: string }[] = [];
  let price = basePrice;

  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0) { d.setDate(d.getDate() - 2); }
    else if (d.getDay() === 6) { d.setDate(d.getDate() - 1); }

    const timeStr = d.toISOString().slice(0, 10) as Time;
    const volatility = 0.015;
    const step = price * drift * (1 + (rng(i * 3) - 0.5) * volatility * 4);

    const open = price;
    const close = step;
    const high = Math.max(open, close) * (1 + rng(i * 3 + 1) * volatility);
    const low = Math.min(open, close) * (1 - rng(i * 3 + 2) * volatility);

    data.push({ time: timeStr, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2) });
    const vol = Math.floor(rng(i * 7) * 20_000_000 + 2_000_000);
    volumes.push({ time: timeStr, value: vol, color: close >= open ? 'rgba(0,204,102,0.5)' : 'rgba(255,51,51,0.5)' });

    price = close;
  }

  return { ohlcv: data, volumes };
}

export default function ChartPanel({ ticker }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { ohlcv, volumes } = generateOHLCV(ticker);

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000' },
        textColor: '#888',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#1f1f1f',
        scaleMargins: { top: 0.1, bottom: 0.3 },
      },
      timeScale: {
        borderColor: '#1f1f1f',
        timeVisible: false,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth || 400,
      height: 180,
    });

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0c6',
      borderUpColor: '#0c6',
      wickUpColor: '#0c6',
      downColor: '#f33',
      borderDownColor: '#f33',
      wickDownColor: '#f33',
    });
    candleSeries.setData(ohlcv as CandlestickData[]);

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.setData(volumes as HistogramData[]);

    // Configure volume scale
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.7, bottom: 0.02 },
      borderVisible: false,
    });

    chart.timeScale().fitContent();

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [ticker]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 180,
        minHeight: 180,
        marginTop: 8,
        border: '1px solid #1f1f1f',
        borderRadius: 2,
      }}
    />
  );
}
