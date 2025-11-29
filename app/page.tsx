'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Sun, AlertTriangle, TrendingUp, Calendar, MapPin, CloudRain, Loader2, ChevronDown, ChevronUp, Thermometer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

// Tipos existentes
interface RegistroPrecipitacion {
  fecha: string;
  P42_Ramon_Huanuna: number;
  P43_Limboasi: number;
  P55_Diguchi: number;
  precip: number;
  year: number;
  month: number;
  quarter: number;
}

interface EventoExtremo {
  fecha: string;
  precipitacion: number;
  año: number;
  mes: number;
  esP99: boolean;
}

interface DatosExtremos {
  resumen: {
    totalEventos: number;
    percentil95: number;
    percentil99: number;
    maxPrecipitacion: number;
    fechaMaxima: string;
  };
  porMes: { mes: string; eventos: number }[];
  porAño: { año: number; eventos: number }[];
  eventos: EventoExtremo[];
}

interface RachaSequia {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  duracion: number;
  año: number;
  mes: number;
}

interface DatosSequias {
  resumen: {
    totalRachas: number;
    diasTotalesSinLluvia: number;
    sequiaMaxima: number;
    fechaSequiaMaxima: string;
    promedioRachas: number;
    porcentajeDiasSecos: number;
  };
  porAño: { año: number; rachas: number; diasSecos: number; maxDuracion: number }[];
  frecuenciaPorAño: { año: number; frecuencia: number }[];   // ⬅ NUEVO
  porMes: { mes: string; rachas: number }[];
  porDuracion: { rango: string; cantidad: number }[];
  rachas: RachaSequia[];
}

// NUEVOS TIPOS para Estacionalidad
interface EstadisticaMensual {
  mes: number;
  nombreMes: string;
  precipPromedio: number;
  precipMaxima: number;
  precipMinima: number;
  diasConLluvia: number;
  diasSinLluvia: number;
  clasificacion: string;
}

interface DatosEstacionalidad {
  resumen: {
    precipitacionAnualPromedio: number;
    mesMasLluvioso: { mes: string; promedio: number };
    mesMasSeco: { mes: string; promedio: number };
    epocaHumeda: string;
    epocaSeca: string;
    variabilidadEstacional: number;
  };
  porMes: EstadisticaMensual[];
  porTrimestre: {
    trimestre: number;
    nombreTrimestre: string;
    meses: string;
    precipPromedio: number;
    clasificacion: string;
  }[];
  comparativaEstaciones: {
    P42_Ramon_Huanuna: { promedio: number; mesMax: string };
    P43_Limboasi: { promedio: number; mesMax: string };
    P55_Diguchi: { promedio: number; mesMax: string };
  };
}

const calcularPercentil = (valores: number[], p: number): number => {
  const sorted = [...valores].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};

const analizarExtremos = (data: RegistroPrecipitacion[]): DatosExtremos => {
  const precipitaciones = data.map(d => d.precip).filter(p => p > 0);
  const p95 = calcularPercentil(precipitaciones, 95);
  const p99 = calcularPercentil(precipitaciones, 99);
  
  const eventos: EventoExtremo[] = data
    .filter(d => d.precip > p95)
    .map(d => ({
      fecha: d.fecha.split(' ')[0],
      precipitacion: Math.round(d.precip * 100) / 100,
      año: d.year,
      mes: d.month,
      esP99: d.precip > p99
    }))
    .sort((a, b) => b.precipitacion - a.precipitacion);

  const mesesNombres = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const porMesObj: Record<number, number> = {};
  const porAñoObj: Record<number, number> = {};
  
  eventos.forEach(e => {
    porMesObj[e.mes] = (porMesObj[e.mes] || 0) + 1;
    porAñoObj[e.año] = (porAñoObj[e.año] || 0) + 1;
  });

  return {
    resumen: {
      totalEventos: eventos.length,
      percentil95: Math.round(p95 * 100) / 100,
      percentil99: Math.round(p99 * 100) / 100,
      maxPrecipitacion: eventos[0]?.precipitacion || 0,
      fechaMaxima: eventos[0]?.fecha || '-',
    },
    porMes: Object.entries(porMesObj).map(([mes, count]) => ({ mes: mesesNombres[parseInt(mes)], eventos: count })).sort((a, b) => b.eventos - a.eventos),
    porAño: Object.entries(porAñoObj).map(([año, count]) => ({ año: parseInt(año), eventos: count })).sort((a, b) => a.año - b.año),
    eventos
  };
};

const estaciones = [
  { id: 'P42', nombre: 'Ramón Huañuna', altitud: '4200m', color: 'bg-blue-500' },
  { id: 'P43', nombre: 'Limboasi', altitud: '4350m', color: 'bg-emerald-500' },
  { id: 'P55', nombre: 'Diguchi', altitud: '4100m', color: 'bg-violet-500' }
];

const StatCard = ({ icon: Icon, title, value, unit, color, subtitle }: { icon: React.ElementType; title: string; value: string | number; unit: string; color: string; subtitle?: string }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-xs font-medium">{title}</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{value}<span className="text-xs font-normal text-gray-400 ml-1">{unit}</span></p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4 text-white" /></div>
    </div>
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<'extremos' | 'sequias' | 'estacionalidad'>('extremos');
  const [datosExtremos, setDatosExtremos] = useState<DatosExtremos>({ resumen: { totalEventos: 0, percentil95: 0, percentil99: 0, maxPrecipitacion: 0, fechaMaxima: '-' }, porMes: [], porAño: [], eventos: [] });
const [datosSequias, setDatosSequias] = useState<DatosSequias>({
  resumen: {
    totalRachas: 0,
    diasTotalesSinLluvia: 0,
    sequiaMaxima: 0,
    fechaSequiaMaxima: "-",
    promedioRachas: 0,
    porcentajeDiasSecos: 0
  },
  porAño: [],
  frecuenciaPorAño: [],     // ⬅⬅⬅ NUEVO Y OBLIGATORIO
  porMes: [],
  porDuracion: [],
  rachas: []
});


  const [datosEstacionalidad, setDatosEstacionalidad] = useState<DatosEstacionalidad | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [añoFiltro, setAñoFiltro] = useState('todos');
  const [años, setAños] = useState<number[]>([]);
  const [datosOriginales, setDatosOriginales] = useState<RegistroPrecipitacion[]>([]);
  const [loadingSequias, setLoadingSequias] = useState(false);
  const [loadingEstacionalidad, setLoadingEstacionalidad] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await fetch('/data/precipitaciones.json');
        if (!res.ok) throw new Error('No se pudo cargar el archivo JSON');
        const datos: RegistroPrecipitacion[] = await res.json();
        setDatosOriginales(datos);
        setAños([...new Set(datos.map(d => d.year))].sort());
        setDatosExtremos(analizarExtremos(datos));
        cargarSequias('todos');
        cargarEstacionalidad('todos');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const cargarSequias = async (año: string) => {
    setLoadingSequias(true);
    try {
      const params = new URLSearchParams();
      if (año !== 'todos') params.append('año', año);
      const res = await fetch(`/api/sequias?${params}`);
      const json = await res.json();
      if (json.success) setDatosSequias(json.data);
    } catch (err) {
      console.error('Error cargando sequías:', err);
    } finally {
      setLoadingSequias(false);
    }
  };

  const cargarEstacionalidad = async (año: string) => {
    setLoadingEstacionalidad(true);
    try {
      const params = new URLSearchParams();
      if (año !== 'todos') params.append('año', año);
      const res = await fetch(`/api/estacionalidad?${params}`);
      const json = await res.json();
      if (json.success) setDatosEstacionalidad(json.data);
    } catch (err) {
      console.error('Error cargando estacionalidad:', err);
    } finally {
      setLoadingEstacionalidad(false);
    }
  };

  useEffect(() => {
    if (datosOriginales.length === 0) return;
    const datosFiltrados = añoFiltro === 'todos' ? datosOriginales : datosOriginales.filter(d => d.year === parseInt(añoFiltro));
    setDatosExtremos(analizarExtremos(datosFiltrados));
    cargarSequias(añoFiltro);
    cargarEstacionalidad(añoFiltro);
  }, [añoFiltro, datosOriginales]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-600">Cargando datos de precipitación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white p-6 rounded-xl shadow-lg">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">Error al cargar datos</h2>
          <p className="text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl"><Cloud className="w-5 h-5 text-white" /></div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Sistema Climático Antisana</h1>
                <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Ecuador • Análisis de Precipitación</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{datosOriginales.length.toLocaleString()} registros</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">● API Activa</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => { setTabActiva('extremos'); setMostrarTodos(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${tabActiva === 'extremos' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <CloudRain className="w-4 h-4" />Lluvia Extrema
            </button>
            <button onClick={() => { setTabActiva('sequias'); setMostrarTodos(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${tabActiva === 'sequias' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <Sun className="w-4 h-4" /> Sequías
            </button>
            <button onClick={() => { setTabActiva('estacionalidad'); setMostrarTodos(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${tabActiva === 'estacionalidad' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <Calendar className="w-4 h-4" /> Estacionalidad
            </button>
          </div>
          <select value={añoFiltro} onChange={(e) => setAñoFiltro(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white">
            <option value="todos">Todos los años</option>
            {años.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* TAB EXTREMOS */}
        {tabActiva === 'extremos' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard icon={AlertTriangle} title="Eventos Lluvia Extrema" value={datosExtremos.resumen.totalEventos} unit="total" color="bg-red-500" />
              <StatCard icon={CloudRain} title="Percentil 95" value={datosExtremos.resumen.percentil95} unit="mm" color="bg-amber-500" subtitle="Umbral extremo" />
              <StatCard icon={Droplets} title="Percentil 99" value={datosExtremos.resumen.percentil99} unit="mm" color="bg-red-600" subtitle="Muy extremo" />
              <StatCard icon={TrendingUp} title="Máx. Registrado" value={datosExtremos.resumen.maxPrecipitacion} unit="mm" color="bg-violet-500" />
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Eventos de Lluvia Extrema</h3>
                <p className="text-xs text-gray-500 mb-3">Cada punto representa un evento &gt; P95</p>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <XAxis dataKey="año" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="precipitacion" unit="mm" tick={{ fontSize: 11 }} />
                    <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-white p-2 rounded shadow-lg border text-xs"><p className="font-semibold">{payload[0].payload.fecha}</p><p className="text-blue-600">{payload[0].payload.precipitacion} mm</p></div> : null} />
                    <Scatter data={datosExtremos.eventos}>{datosExtremos.eventos.map((e, i) => <Cell key={i} fill={e.esP99 ? '#dc2626' : '#f59e0b'} />)}</Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="flex items-center text-gray-500 gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> P95</span>
                  <span className="flex items-center text-gray-500 gap-1"><span className="w-2 h-2 rounded-full bg-red-600"></span> P99</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Eventos de Lluvia Extrema por Mes</h3>
                <p className="text-xs text-gray-500 mb-3">Frecuencia de eventos según el mes</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={datosExtremos.porMes} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-white p-2 rounded shadow-lg border text-xs"><p className="font-semibold">{payload[0].payload.mes}</p><p className="text-blue-600">{payload[0].value} eventos</p></div> : null} />
                    <Bar dataKey="eventos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div><h3 className="font-semibold text-gray-800">Eventos Extremos Detectados</h3><p className="text-sm text-gray-500">Precipitación &gt; Percentil 95</p></div>
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">{datosExtremos.eventos.length} eventos</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-gray-600">Fecha</th><th className="px-4 py-2 text-left text-gray-600">Precipitación</th><th className="px-4 py-2 text-left text-gray-600">Nivel</th></tr></thead>
                <tbody>{(mostrarTodos ? datosExtremos.eventos : datosExtremos.eventos.slice(0, 5)).map((e, i) => <tr key={i} className="border-t border-gray-50 text-gray-600 hover:bg-gray-50"><td className="px-4 py-2">{e.fecha}</td><td className="px-4 py-2 font-semibold">{e.precipitacion} mm</td><td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${e.esP99 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{e.esP99 ? 'P99 Extremo' : 'P95 Alto'}</span></td></tr>)}</tbody>
              </table>
              {datosExtremos.eventos.length > 5 && <button onClick={() => setMostrarTodos(!mostrarTodos)} className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1">{mostrarTodos ? <><ChevronUp className="w-4 h-4" /> Ver menos</> : <><ChevronDown className="w-4 h-4" /> Ver todos ({datosExtremos.eventos.length})</>}</button>}
            </div>
          </>
        )}

        {/* TAB SEQUÍAS */}
        {tabActiva === 'sequias' && (
          <>
            {loadingSequias ? (
              <div className="flex justify-center items-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <StatCard icon={Sun} title="Total Rachas" value={datosSequias.resumen.totalRachas} unit="periodos" color="bg-amber-500" />
                  <StatCard icon={Calendar} title="Días Secos" value={datosSequias.resumen.diasTotalesSinLluvia.toLocaleString()} unit="días" color="bg-orange-500" />
                  <StatCard icon={AlertTriangle} title="Sequía Máxima" value={datosSequias.resumen.sequiaMaxima} unit="días" color="bg-red-500" />
                  <StatCard icon={TrendingUp} title="Promedio" value={datosSequias.resumen.promedioRachas} unit="días" color="bg-yellow-500" />
                  <StatCard icon={Droplets} title="% Días Secos" value={datosSequias.resumen.porcentajeDiasSecos} unit="%" color="bg-amber-600" />
                </div>

                <div className="grid lg:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-1">Sequías por Año</h3>
                    <p className="text-xs text-gray-500 mb-3">Duración máxima de sequía por año</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={datosSequias.porAño} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <XAxis dataKey="año" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="d" />
                        <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-white p-2 rounded shadow-lg border text-xs"><p className=" text-gray-500">Año {payload[0].payload.año}</p><p className="text-amber-600">Máx: {payload[0].payload.maxDuracion} días</p><p className="text-gray-500">{payload[0].payload.rachas} rachas</p></div> : null} />
                        <Line type="monotone" dataKey="maxDuracion" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-1">Distribución por Duración</h3>
                    <p className="text-xs text-gray-500 mb-3">Cantidad de sequías según su duración</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={datosSequias.porDuracion} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <XAxis dataKey="rango" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-white p-2 rounded shadow-lg border text-xs"><p className="font-semibold">{payload[0].payload.rango}</p><p className="text-amber-600">{payload[0].value} sequías</p></div> : null} />
                        <Bar dataKey="cantidad" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className='mb-4' >
                  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-1">Frecuencia de Sequias por Año</h3>
                    <p className="text-xs text-gray-500 mb-3">Cantidad de sequías por cada año</p>

  <ResponsiveContainer width="90%"  className="m-auto" height={250}>
    <BarChart data={datosSequias.frecuenciaPorAño}>
      
      <XAxis 
        dataKey="año" 
        tick={{ fontSize: 12 }} 
      />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-white p-2 rounded shadow-lg border text-xs"><p className="font-semibold">{payload[0].payload.rango}</p><p className="text-amber-600">{payload[0].value} sequías</p></div> : null} />
      <Bar dataKey="frecuencia">
        {datosSequias.frecuenciaPorAño.map((entry, index) => (
          <Cell 
            key={index} 
            fill="#FB2C36"    
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div><h3 className="font-semibold text-gray-800">Rachas de Sequía Detectadas</h3><p className="text-sm text-gray-500">Periodos de 3+ días sin lluvia</p></div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{datosSequias.rachas.length} rachas</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-gray-600">Inicio</th><th className="px-4 py-2 text-left text-gray-600">Fin</th><th className="px-4 py-2 text-left text-gray-600">Duración</th><th className="px-4 py-2 text-left text-gray-600">Severidad</th></tr></thead>
                    <tbody>{(mostrarTodos ? datosSequias.rachas : datosSequias.rachas.slice(0, 5)).map((r, i) => <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 text-gray-600"><td className="px-4 py-2">{r.fechaInicio}</td><td className="px-4 py-2">{r.fechaFin}</td><td className="px-4 py-2 font-semibold">{r.duracion} días</td><td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${r.duracion >= 15 ? 'bg-red-100 text-red-700' : r.duracion >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.duracion >= 15 ? 'Severa' : r.duracion >= 7 ? 'Moderada' : 'Leve'}</span></td></tr>)}</tbody>
                  </table>
                  {datosSequias.rachas.length > 5 && <button onClick={() => setMostrarTodos(!mostrarTodos)} className="w-full py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center justify-center gap-1">{mostrarTodos ? <><ChevronUp className="w-4 h-4" /> Ver menos</> : <><ChevronDown className="w-4 h-4" /> Ver todas ({datosSequias.rachas.length})</>}</button>}
</div>
</>
)}
</>
)}
{/* TAB ESTACIONALIDAD */}
    {tabActiva === 'estacionalidad' && (
      <>
        {loadingEstacionalidad ? (
          <div className="flex justify-center items-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : datosEstacionalidad ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
              <StatCard icon={Droplets} title="Promedio Anual" value={datosEstacionalidad.resumen.precipitacionAnualPromedio} unit="mm" color="bg-blue-500" />
              <StatCard icon={CloudRain} title="Mes Más Lluvioso" value={datosEstacionalidad.resumen.mesMasLluvioso.mes} unit="" color="bg-indigo-500" subtitle={`${datosEstacionalidad.resumen.mesMasLluvioso.promedio} mm`} />
              <StatCard icon={Sun} title="Mes Más Seco" value={datosEstacionalidad.resumen.mesMasSeco.mes} unit="" color="bg-amber-500" subtitle={`${datosEstacionalidad.resumen.mesMasSeco.promedio} mm`} />
              <StatCard icon={Thermometer} title="Variabilidad" value={datosEstacionalidad.resumen.variabilidadEstacional} unit="%" color="bg-purple-500" subtitle="Coef. variación" />
              <StatCard icon={Calendar} title="Época Húmeda" value={datosEstacionalidad.resumen.epocaHumeda.split(',').length} unit="meses" color="bg-teal-500" />
              <StatCard icon={Calendar} title="Época Seca" value={datosEstacionalidad.resumen.epocaSeca.split(',').length} unit="meses" color="bg-orange-500" />
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Precipitación Mensual Promedio</h3>
                <p className="text-xs text-gray-500 mb-3">Patrón anual de precipitación</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={datosEstacionalidad.porMes} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <XAxis dataKey="nombreMes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="mm" />
                    <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-white p-2 rounded shadow-lg border text-xs"><p className="font-semibold">{payload[0].payload.nombreMes}</p><p className="text-blue-600">{payload[0].value} mm</p><p className="text-gray-500">{payload[0].payload.clasificacion}</p></div> : null} />
                    <Bar dataKey="precipPromedio" radius={[4, 4, 0, 0]}>
                      {datosEstacionalidad.porMes.map((entry, index) => (
                        <Cell key={index} fill={
                          entry.clasificacion.includes('Muy Húmedo') ? '#3b82f6' :
                          entry.clasificacion.includes('Húmedo') ? '#60a5fa' :
                          entry.clasificacion.includes('Muy Seco') ? '#f59e0b' :
                          entry.clasificacion.includes('Seco') ? '#fbbf24' :
                          '#94a3b8'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Análisis Trimestral</h3>
                <p className="text-xs text-gray-500 mb-3">Precipitación por trimestre</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={datosEstacionalidad.porTrimestre} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <XAxis dataKey="nombreTrimestre" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="mm" />
                    <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="bg-white p-2 rounded shadow-lg border text-xs"><p className="font-semibold">{payload[0].payload.meses}</p><p className="text-blue-600">{payload[0].value} mm</p><p className="text-gray-500">{payload[0].payload.clasificacion}</p></div> : null} />
                    <Bar dataKey="precipPromedio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3">Época Húmeda</h3>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium">{datosEstacionalidad.resumen.epocaHumeda}</p>
                  <p className="text-xs text-blue-600 mt-1">Mayor precipitación del año</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3">Época Seca</h3>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-900 font-medium">{datosEstacionalidad.resumen.epocaSeca}</p>
                  <p className="text-xs text-amber-600 mt-1">Menor precipitación del año</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3">Comparativa Estaciones</h3>
                <div className="space-y-2">
                  {Object.entries(datosEstacionalidad.comparativaEstaciones).map(([nombre, datos]) => (
                    <div key={nombre} className="flex justify-between items-center p-2 text-gray-600 bg-gray-50 rounded text-xs">
                      <span className="font-medium">{nombre.replace('_', ' ')}</span>
                      <span className="text-blue-600">{datos.promedio} mm</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Detalle Mensual</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600">Mes</th>
                      <th className="px-4 py-2 text-left text-gray-600">Promedio</th>
                      <th className="px-4 py-2 text-left text-gray-600">Máxima</th>
                      <th className="px-4 py-2 text-left text-gray-600">Días lluvia</th>
                      <th className="px-4 py-2 text-left text-gray-600">Clasificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosEstacionalidad.porMes.map((m, i) => (
                      <tr key={i} className="text-gray-600 border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{m.nombreMes}</td>
                        <td className="px-4 py-2">{m.precipPromedio} mm</td>
                        <td className="px-4 py-2">{m.precipMaxima} mm</td>
                        <td className="px-4 py-2">{m.diasConLluvia}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            m.clasificacion.includes('Muy Húmedo') ? 'bg-blue-100 text-blue-700' :
                            m.clasificacion.includes('Húmedo') ? 'bg-sky-100 text-sky-700' :
                            m.clasificacion.includes('Muy Seco') ? 'bg-orange-100 text-orange-700' :
                            m.clasificacion.includes('Seco') ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {m.clasificacion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">No hay datos disponibles</div>
        )}
      </>
    )}

    <div className="mt-4 grid lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-3">Resumen Comparativo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-600">{datosExtremos.resumen.totalEventos}</p><p className="text-xs text-red-500">Eventos Lluvia Extrema</p></div>
          <div className="p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-600">{datosExtremos.resumen.maxPrecipitacion}</p><p className="text-xs text-blue-500">Máx. Lluvia (mm)</p></div>
          <div className="p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-600">{datosSequias.resumen.totalRachas}</p><p className="text-xs text-amber-500">Rachas Sequía</p></div>
          <div className="p-3 bg-orange-50 rounded-lg"><p className="text-2xl font-bold text-orange-600">{datosSequias.resumen.sequiaMaxima}</p><p className="text-xs text-orange-500">Máx. Sequía (días)</p></div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-3">Estaciones</h3>
        <div className="space-y-2">{estaciones.map(est => <div key={est.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${est.color}`}></div><div><p className="font-medium text-sm text-gray-800">{est.id}</p><p className="text-xs text-gray-500">{est.nombre}</p></div></div><span className="text-xs text-gray-400">{est.altitud}</span></div>)}</div>
      </div>
    </div>

    <footer className="mt-6 text-center text-xs text-gray-400 pb-4"><p>Sistema de Análisis Climático del Antisana • {años.length > 0 ? `${años[0]}-${años[años.length-1]}` : ''}</p></footer>
  </main>
</div>
);
}