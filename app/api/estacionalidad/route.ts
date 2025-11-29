// src/app/api/estacionalidad/route.ts

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

interface EstadisticaTrimestral {
  trimestre: number;
  nombreTrimestre: string;
  meses: string;
  precipPromedio: number;
  clasificacion: string;
}

interface RespuestaEstacionalidad {
  resumen: {
    precipitacionAnualPromedio: number;
    mesMasLluvioso: { mes: string; promedio: number };
    mesMasSeco: { mes: string; promedio: number };
    epocaHumeda: string;
    epocaSeca: string;
    variabilidadEstacional: number;
  };
  porMes: EstadisticaMensual[];
  porTrimestre: EstadisticaTrimestral[];
  comparativaEstaciones: {
    P42_Ramon_Huanuna: { promedio: number; mesMax: string };
    P43_Limboasi: { promedio: number; mesMax: string };
    P55_Diguchi: { promedio: number; mesMax: string };
  };
}

// Cargar datos del JSON
function cargarDatos(): RegistroPrecipitacion[] {
  const filePath = path.join(process.cwd(), 'public', 'data', 'precipitaciones.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
}

// Función para clasificar época según precipitación
function clasificarEpoca(promedio: number, promedioGeneral: number): string {
  if (promedio > promedioGeneral * 1.5) return 'Muy Húmedo';
  if (promedio > promedioGeneral * 1.2) return 'Húmedo';
  if (promedio < promedioGeneral * 0.5) return 'Muy Seco';
  if (promedio < promedioGeneral * 0.8) return 'Seco';
  return 'Normal';
}

// Función principal de análisis de estacionalidad
function analizarEstacionalidad(data: RegistroPrecipitacion[]): RespuestaEstacionalidad {
  const mesesNombres = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const trimestreNombres = ['', 'Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];
  
  // Calcular promedio general
  const precipitacionTotal = data.reduce((sum, d) => sum + d.precip, 0);
  const precipAnualPromedio = precipitacionTotal / data.length;

  // Análisis por mes
  const datosPorMes: Record<number, number[]> = {};
  const lluviaPorMes: Record<number, { conLluvia: number; sinLluvia: number }> = {};
  
  for (let m = 1; m <= 12; m++) {
    datosPorMes[m] = [];
    lluviaPorMes[m] = { conLluvia: 0, sinLluvia: 0 };
  }

  data.forEach(registro => {
    datosPorMes[registro.month].push(registro.precip);
    if (registro.precip > 0.1) {
      lluviaPorMes[registro.month].conLluvia++;
    } else {
      lluviaPorMes[registro.month].sinLluvia++;
    }
  });

  const porMes: EstadisticaMensual[] = [];
  let mesMaxPrecip = { mes: '', promedio: 0 };
  let mesMinPrecip = { mes: '', promedio: Infinity };

  for (let m = 1; m <= 12; m++) {
    const valores = datosPorMes[m];
    const promedio = valores.reduce((sum, v) => sum + v, 0) / valores.length;
    const maximo = Math.max(...valores);
    const minimo = Math.min(...valores);
    
    if (promedio > mesMaxPrecip.promedio) {
      mesMaxPrecip = { mes: mesesNombres[m], promedio };
    }
    if (promedio < mesMinPrecip.promedio) {
      mesMinPrecip = { mes: mesesNombres[m], promedio };
    }

    porMes.push({
      mes: m,
      nombreMes: mesesNombres[m],
      precipPromedio: Math.round(promedio * 100) / 100,
      precipMaxima: Math.round(maximo * 100) / 100,
      precipMinima: Math.round(minimo * 100) / 100,
      diasConLluvia: lluviaPorMes[m].conLluvia,
      diasSinLluvia: lluviaPorMes[m].sinLluvia,
      clasificacion: clasificarEpoca(promedio, precipAnualPromedio)
    });
  }

  // Análisis por trimestre
  const porTrimestre: EstadisticaTrimestral[] = [];
  
  for (let q = 1; q <= 4; q++) {
    const mesesTrimestre = data.filter(d => d.quarter === q);
    const promedio = mesesTrimestre.reduce((sum, d) => sum + d.precip, 0) / mesesTrimestre.length;
    
    porTrimestre.push({
      trimestre: q,
      nombreTrimestre: trimestreNombres[q],
      meses: trimestreNombres[q].match(/\((.*?)\)/)?.[1] || '',
      precipPromedio: Math.round(promedio * 100) / 100,
      clasificacion: clasificarEpoca(promedio, precipAnualPromedio)
    });
  }

  // Identificar épocas húmeda y seca
  const mesesHumedos = porMes.filter(m => m.clasificacion.includes('Húmedo')).map(m => m.nombreMes);
  const mesesSecos = porMes.filter(m => m.clasificacion.includes('Seco')).map(m => m.nombreMes);

  // Análisis por estación
  const P42_datos: Record<number, number[]> = {};
  const P43_datos: Record<number, number[]> = {};
  const P55_datos: Record<number, number[]> = {};

  for (let m = 1; m <= 12; m++) {
    P42_datos[m] = [];
    P43_datos[m] = [];
    P55_datos[m] = [];
  }

  data.forEach(d => {
    P42_datos[d.month].push(d.P42_Ramon_Huanuna);
    P43_datos[d.month].push(d.P43_Limboasi);
    P55_datos[d.month].push(d.P55_Diguchi);
  });

  const calcularPromedioEstacion = (datos: Record<number, number[]>) => {
    const promedios = Object.values(datos).map(vals => vals.reduce((s, v) => s + v, 0) / vals.length);
    return promedios.reduce((s, v) => s + v, 0) / promedios.length;
  };

  const encontrarMesMax = (datos: Record<number, number[]>) => {
    let maxMes = 1;
    let maxPromedio = 0;
    for (let m = 1; m <= 12; m++) {
      const promedio = datos[m].reduce((s, v) => s + v, 0) / datos[m].length;
      if (promedio > maxPromedio) {
        maxPromedio = promedio;
        maxMes = m;
      }
    }
    return mesesNombres[maxMes];
  };

  // Calcular variabilidad estacional (coeficiente de variación)
  const promediosMensuales = porMes.map(m => m.precipPromedio);
  const media = promediosMensuales.reduce((s, v) => s + v, 0) / promediosMensuales.length;
  const varianza = promediosMensuales.reduce((s, v) => s + Math.pow(v - media, 2), 0) / promediosMensuales.length;
  const desviacion = Math.sqrt(varianza);
  const coefVariacion = (desviacion / media) * 100;

  return {
    resumen: {
      precipitacionAnualPromedio: Math.round(precipAnualPromedio * 100) / 100,
      mesMasLluvioso: {
        mes: mesMaxPrecip.mes,
        promedio: Math.round(mesMaxPrecip.promedio * 100) / 100
      },
      mesMasSeco: {
        mes: mesMinPrecip.mes,
        promedio: Math.round(mesMinPrecip.promedio * 100) / 100
      },
      epocaHumeda: mesesHumedos.join(', ') || 'No definida',
      epocaSeca: mesesSecos.join(', ') || 'No definida',
      variabilidadEstacional: Math.round(coefVariacion * 10) / 10
    },
    porMes,
    porTrimestre,
    comparativaEstaciones: {
      P42_Ramon_Huanuna: {
        promedio: Math.round(calcularPromedioEstacion(P42_datos) * 100) / 100,
        mesMax: encontrarMesMax(P42_datos)
      },
      P43_Limboasi: {
        promedio: Math.round(calcularPromedioEstacion(P43_datos) * 100) / 100,
        mesMax: encontrarMesMax(P43_datos)
      },
      P55_Diguchi: {
        promedio: Math.round(calcularPromedioEstacion(P55_datos) * 100) / 100,
        mesMax: encontrarMesMax(P55_datos)
      }
    }
  };
}

// GET Handler
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const año = searchParams.get('año');
    const mes = searchParams.get('mes');

    // Cargar datos
    const datos = cargarDatos();
    
    // Filtrar si es necesario
    let datosFiltrados = datos;
    if (año) {
      datosFiltrados = datosFiltrados.filter(d => d.year === parseInt(año));
    }
    if (mes) {
      datosFiltrados = datosFiltrados.filter(d => d.month === parseInt(mes));
    }

    // Realizar análisis
    const resultado = analizarEstacionalidad(datosFiltrados);

    return NextResponse.json({
      success: true,
      filtros: { año, mes },
      data: resultado
    });

  } catch (error) {
    console.error('Error en /api/estacionalidad:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar los datos' },
      { status: 500 }
    );
  }
}