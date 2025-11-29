// src/app/api/tendencias/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Tipos
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

interface TendenciaAnual {
  año: number;
  precipTotal: number;
  precipPromedio: number;
  diasConLluvia: number;
  diasSinLluvia: number;
  eventosExtremos: number;
}

interface RegresionLineal {
  pendiente: number;
  intercepto: number;
  r2: number;
  tendencia: string;
  cambioAnual: number;
  cambioTotal: number;
}

interface RespuestaTendencias {
  resumen: {
    años: number;
    tendenciaGeneral: string;
    cambioPromedio: number;
    r2: number;
    proyeccion2030: number;
    aumentoTotal: number;
  };
  porAño: TendenciaAnual[];
  regresionLineal: RegresionLineal;
  anomalias: {
    año: number;
    anomalia: number;
    tipo: string;
  }[];
  comparativaDecadas: {
    decada: string;
    años: string;
    precipPromedio: number;
    cambioRespectoPrevio: number;
  }[];
}

// Cargar datos del JSON
function cargarDatos(): RegistroPrecipitacion[] {
  const filePath = path.join(process.cwd(), 'public', 'data', 'precipitaciones.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
}

// Función para calcular regresión lineal
function calcularRegresionLineal(x: number[], y: number[]): RegresionLineal {
  const n = x.length;
  
  // Calcular sumas
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  // Calcular pendiente e intercepto
  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercepto = (sumY - pendiente * sumX) / n;
  
  // Calcular R² (coeficiente de determinación)
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => {
    const yPred = pendiente * x[i] + intercepto;
    return sum + Math.pow(yi - yPred, 2);
  }, 0);
  const r2 = 1 - (ssResidual / ssTotal);
  
  // Determinar tendencia
  let tendencia = 'Estable';
  if (Math.abs(pendiente) < 0.01) {
    tendencia = 'Estable';
  } else if (pendiente > 0.05) {
    tendencia = 'Aumento significativo';
  } else if (pendiente > 0) {
    tendencia = 'Aumento leve';
  } else if (pendiente < -0.05) {
    tendencia = 'Disminución significativa';
  } else {
    tendencia = 'Disminución leve';
  }
  
  const cambioAnual = Math.round(pendiente * 1000) / 1000;
  const añosTotal = x[x.length - 1] - x[0];
  const cambioTotal = Math.round(pendiente * añosTotal * 100) / 100;
  
  return {
    pendiente: Math.round(pendiente * 10000) / 10000,
    intercepto: Math.round(intercepto * 100) / 100,
    r2: Math.round(r2 * 1000) / 1000,
    tendencia,
    cambioAnual,
    cambioTotal
  };
}

// Función para calcular percentil
function calcularPercentil(valores: number[], percentil: number): number {
  const sorted = [...valores].sort((a, b) => a - b);
  const idx = Math.ceil((percentil / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// Función principal de análisis de tendencias
function analizarTendencias(data: RegistroPrecipitacion[]): RespuestaTendencias {
  // Agrupar datos por año
  const datosPorAño: Record<number, RegistroPrecipitacion[]> = {};
  data.forEach(d => {
    if (!datosPorAño[d.year]) datosPorAño[d.year] = [];
    datosPorAño[d.year].push(d);
  });

  // Calcular estadísticas por año
  const años = Object.keys(datosPorAño).map(Number).sort();
  const precipitaciones = data.map(d => d.precip).filter(p => p > 0);
  const p95 = calcularPercentil(precipitaciones, 95);

  const porAño: TendenciaAnual[] = años.map(año => {
    const datosAño = datosPorAño[año];
    const precipTotal = datosAño.reduce((sum, d) => sum + d.precip, 0);
    const precipPromedio = precipTotal / datosAño.length;
    const diasConLluvia = datosAño.filter(d => d.precip > 0.1).length;
    const diasSinLluvia = datosAño.filter(d => d.precip <= 0.1).length;
    const eventosExtremos = datosAño.filter(d => d.precip > p95).length;

    return {
      año,
      precipTotal: Math.round(precipTotal * 100) / 100,
      precipPromedio: Math.round(precipPromedio * 100) / 100,
      diasConLluvia,
      diasSinLluvia,
      eventosExtremos
    };
  });

  // Calcular regresión lineal
  const x = porAño.map(d => d.año);
  const y = porAño.map(d => d.precipPromedio);
  const regresion = calcularRegresionLineal(x, y);

  // Calcular anomalías (desviaciones de la media)
  const precipPromedioGeneral = y.reduce((a, b) => a + b, 0) / y.length;
  const desviacionEstandar = Math.sqrt(
    y.reduce((sum, val) => sum + Math.pow(val - precipPromedioGeneral, 2), 0) / y.length
  );

  const anomalias = porAño.map(d => {
    const anomalia = Math.round((d.precipPromedio - precipPromedioGeneral) * 100) / 100;
    const umbral = desviacionEstandar * 1.5;
    let tipo = 'Normal';
    if (anomalia > umbral) tipo = 'Muy húmedo';
    else if (anomalia > desviacionEstandar * 0.5) tipo = 'Húmedo';
    else if (anomalia < -umbral) tipo = 'Muy seco';
    else if (anomalia < -desviacionEstandar * 0.5) tipo = 'Seco';

    return {
      año: d.año,
      anomalia,
      tipo
    };
  }).filter(a => a.tipo !== 'Normal');

  // Comparativa por décadas
  const decadas: Record<string, TendenciaAnual[]> = {};
  porAño.forEach(d => {
    const decada = Math.floor(d.año / 10) * 10;
    const key = `${decada}s`;
    if (!decadas[key]) decadas[key] = [];
    decadas[key].push(d);
  });

  const comparativaDecadas = Object.entries(decadas).map(([decada, datos], idx, arr) => {
    const precipPromedio = datos.reduce((sum, d) => sum + d.precipPromedio, 0) / datos.length;
    const añoInicio = Math.min(...datos.map(d => d.año));
    const añoFin = Math.max(...datos.map(d => d.año));
    
    let cambioRespectoPrevio = 0;
    if (idx > 0) {
      const prevDecada = arr[idx - 1][1];
      const prevPromedio = prevDecada.reduce((sum, d) => sum + d.precipPromedio, 0) / prevDecada.length;
      cambioRespectoPrevio = Math.round((precipPromedio - prevPromedio) * 100) / 100;
    }

    return {
      decada,
      años: `${añoInicio}-${añoFin}`,
      precipPromedio: Math.round(precipPromedio * 100) / 100,
      cambioRespectoPrevio
    };
  });

  // Proyección a 2030
  const proyeccion2030 = regresion.pendiente * 2030 + regresion.intercepto;

  // Resumen
  const tendenciaGeneral = regresion.tendencia;
  const cambioPromedio = regresion.cambioAnual;
  const r2 = regresion.r2;
  const aumentoTotal = regresion.cambioTotal;

  return {
    resumen: {
      años: años.length,
      tendenciaGeneral,
      cambioPromedio,
      r2,
      proyeccion2030: Math.round(proyeccion2030 * 100) / 100,
      aumentoTotal
    },
    porAño,
    regresionLineal: regresion,
    anomalias,
    comparativaDecadas
  };
}

// GET Handler
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const añoInicio = searchParams.get('añoInicio');
    const añoFin = searchParams.get('añoFin');

    // Cargar datos
    let datos = cargarDatos();
    
    // Filtrar por rango de años si se especifica
    if (añoInicio) {
      datos = datos.filter(d => d.year >= parseInt(añoInicio));
    }
    if (añoFin) {
      datos = datos.filter(d => d.year <= parseInt(añoFin));
    }

    // Realizar análisis
    const resultado = analizarTendencias(datos);

    return NextResponse.json({
      success: true,
      filtros: { añoInicio, añoFin },
      data: resultado
    });

  } catch (error) {
    console.error('Error en /api/tendencias:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar los datos' },
      { status: 500 }
    );
  }
}