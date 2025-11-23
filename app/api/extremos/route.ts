// src/app/api/extremos/route.ts

import { NextResponse } from 'next/server';
import datos from '@/data/precipitaciones.json';

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

interface EventoExtremo {
  fecha: string;
  precipitacion: number;
  estacion: string;
  percentil: number;
  año: number;
  mes: number;
}

interface RespuestaExtremos {
  resumen: {
    totalEventos: number;
    percentil95: number;
    percentil99: number;
    maxPrecipitacion: number;
    fechaMaxima: string;
    promedioEventosExtremos: number;
  };
  porEstacion: {
    P42_Ramon_Huanuna: { eventos: number; maximo: number };
    P43_Limboasi: { eventos: number; maximo: number };
    P55_Diguchi: { eventos: number; maximo: number };
  };
  porAño: Record<number, number>;
  porMes: Record<number, number>;
  eventos: EventoExtremo[];
}

// Función para calcular percentil
function calcularPercentil(valores: number[], percentil: number): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.ceil((percentil / 100) * ordenados.length) - 1;
  return ordenados[Math.max(0, indice)];
}

// Función principal de análisis
function analizarEventosExtremos(data: RegistroPrecipitacion[]): RespuestaExtremos {
  // Extraer todos los valores de precipitación promedio
  const precipitaciones = data.map(d => d.precip).filter(p => p > 0);
  
  // Calcular percentiles
  const p95 = calcularPercentil(precipitaciones, 95);
  const p99 = calcularPercentil(precipitaciones, 99);
  
  // Encontrar eventos extremos (> percentil 95)
  const eventosExtremos: EventoExtremo[] = [];
  const porAño: Record<number, number> = {};
  const porMes: Record<number, number> = {};
  const porEstacion = {
    P42_Ramon_Huanuna: { eventos: 0, maximo: 0 },
    P43_Limboasi: { eventos: 0, maximo: 0 },
    P55_Diguchi: { eventos: 0, maximo: 0 }
  };

  let maxPrecip = 0;
  let fechaMax = '';

  data.forEach(registro => {
    const { fecha, precip, year, month } = registro;
    
    // Verificar si es evento extremo
    if (precip > p95) {
      // Determinar qué estación contribuyó más
      const estaciones = [
        { nombre: 'P42_Ramon_Huanuna', valor: registro.P42_Ramon_Huanuna },
        { nombre: 'P43_Limboasi', valor: registro.P43_Limboasi },
        { nombre: 'P55_Diguchi', valor: registro.P55_Diguchi }
      ];
      const estacionMax = estaciones.reduce((a, b) => a.valor > b.valor ? a : b);
      
      // Determinar percentil exacto
      const percentilEvento = precip > p99 ? 99 : 95;
      
      eventosExtremos.push({
        fecha,
        precipitacion: Math.round(precip * 100) / 100,
        estacion: estacionMax.nombre,
        percentil: percentilEvento,
        año: year,
        mes: month
      });

      // Contadores por año y mes
      porAño[year] = (porAño[year] || 0) + 1;
      porMes[month] = (porMes[month] || 0) + 1;

      // Actualizar estadísticas por estación
      estaciones.forEach(est => {
        if (est.valor > p95) {
          const key = est.nombre as keyof typeof porEstacion;
          porEstacion[key].eventos++;
          porEstacion[key].maximo = Math.max(porEstacion[key].maximo, est.valor);
        }
      });

      // Actualizar máximo global
      if (precip > maxPrecip) {
        maxPrecip = precip;
        fechaMax = fecha;
      }
    }
  });

  // Ordenar eventos por precipitación descendente
  eventosExtremos.sort((a, b) => b.precipitacion - a.precipitacion);

  return {
    resumen: {
      totalEventos: eventosExtremos.length,
      percentil95: Math.round(p95 * 100) / 100,
      percentil99: Math.round(p99 * 100) / 100,
      maxPrecipitacion: Math.round(maxPrecip * 100) / 100,
      fechaMaxima: fechaMax,
      promedioEventosExtremos: Math.round(
        (eventosExtremos.reduce((sum, e) => sum + e.precipitacion, 0) / 
        eventosExtremos.length) * 100
      ) / 100
    },
    porEstacion,
    porAño,
    porMes,
    eventos: eventosExtremos.slice(0, 100) // Limitar a los 100 más extremos
  };
}

// GET Handler
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros opcionales de filtro
    const año = searchParams.get('año');
    const mes = searchParams.get('mes');
    const estacion = searchParams.get('estacion');
    const limite = parseInt(searchParams.get('limite') || '100');

    // Filtrar datos si hay parámetros
    let datosFiltrados = datos as RegistroPrecipitacion[];
    
    if (año) {
      datosFiltrados = datosFiltrados.filter(d => d.year === parseInt(año));
    }
    if (mes) {
      datosFiltrados = datosFiltrados.filter(d => d.month === parseInt(mes));
    }

    // Realizar análisis
    const resultado = analizarEventosExtremos(datosFiltrados);
    
    // Aplicar límite a eventos
    resultado.eventos = resultado.eventos.slice(0, limite);

    return NextResponse.json({
      success: true,
      filtros: { año, mes, estacion, limite },
      data: resultado
    });

  } catch (error) {
    console.error('Error en /api/extremos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar los datos' },
      { status: 500 }
    );
  }
}