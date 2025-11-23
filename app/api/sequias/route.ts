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

interface RachaSequia {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  duracion: number;
  año: number;
  mes: number;
  trimestre: number;
}

interface RespuestaSequias {
  resumen: {
    totalRachas: number;
    diasTotalesSinLluvia: number;
    sequiaMaxima: number;
    fechaSequiaMaxima: string;
    promedioRachas: number;
    porcentajeDiasSecos: number;
  };
  porAño: { año: number; rachas: number; diasSecos: number; maxDuracion: number }[];
  porMes: { mes: string; rachas: number }[];
  porDuracion: { rango: string; cantidad: number }[];
  rachas: RachaSequia[];
}

// Cargar datos del JSON
function cargarDatos(): RegistroPrecipitacion[] {
  const filePath = path.join(process.cwd(), 'public', 'data', 'precipitaciones.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
}

// Función principal de análisis de sequías
function analizarSequias(data: RegistroPrecipitacion[]): RespuestaSequias {
  const datosOrdenados = [...data].sort((a, b) => 
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const rachas: RachaSequia[] = [];
  const mesesNombres = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  let rachaActual: { inicio: number; duracion: number } | null = null;
  let idRacha = 0;
  let diasTotalesSinLluvia = 0;
  const umbralSeco = 0.1;

  datosOrdenados.forEach((registro, index) => {
    const esDiaSeco = registro.precip < umbralSeco;

    if (esDiaSeco) {
      diasTotalesSinLluvia++;
      if (rachaActual === null) {
        rachaActual = { inicio: index, duracion: 1 };
      } else {
        rachaActual.duracion++;
      }
    } else {
      if (rachaActual !== null && rachaActual.duracion >= 3) {
        const registroInicio = datosOrdenados[rachaActual.inicio];
        const registroFin = datosOrdenados[index - 1];
        
        rachas.push({
          id: ++idRacha,
          fechaInicio: registroInicio.fecha.split(' ')[0],
          fechaFin: registroFin.fecha.split(' ')[0],
          duracion: rachaActual.duracion,
          año: registroInicio.year,
          mes: registroInicio.month,
          trimestre: registroInicio.quarter
        });
      }
      rachaActual = null;
    }
  });

  if (rachaActual !== null && rachaActual.duracion >= 3) {
    const registroInicio = datosOrdenados[rachaActual.inicio];
    const registroFin = datosOrdenados[datosOrdenados.length - 1];
    
    rachas.push({
      id: ++idRacha,
      fechaInicio: registroInicio.fecha.split(' ')[0],
      fechaFin: registroFin.fecha.split(' ')[0],
      duracion: rachaActual.duracion,
      año: registroInicio.year,
      mes: registroInicio.month,
      trimestre: registroInicio.quarter
    });
  }

  rachas.sort((a, b) => b.duracion - a.duracion);

  const porAñoObj: Record<number, { rachas: number; diasSecos: number; maxDuracion: number }> = {};
  rachas.forEach(r => {
    if (!porAñoObj[r.año]) {
      porAñoObj[r.año] = { rachas: 0, diasSecos: 0, maxDuracion: 0 };
    }
    porAñoObj[r.año].rachas++;
    porAñoObj[r.año].diasSecos += r.duracion;
    porAñoObj[r.año].maxDuracion = Math.max(porAñoObj[r.año].maxDuracion, r.duracion);
  });

  const porAño = Object.entries(porAñoObj)
    .map(([año, stats]) => ({ año: parseInt(año), ...stats }))
    .sort((a, b) => a.año - b.año);

  const porMesObj: Record<number, number> = {};
  rachas.forEach(r => {
    porMesObj[r.mes] = (porMesObj[r.mes] || 0) + 1;
  });

  const porMes = Object.entries(porMesObj)
    .map(([mes, rachas]) => ({ mes: mesesNombres[parseInt(mes)], rachas }))
    .sort((a, b) => b.rachas - a.rachas);

  const porDuracion = [
    { rango: '3-5 días', cantidad: rachas.filter(r => r.duracion >= 3 && r.duracion <= 5).length },
    { rango: '6-10 días', cantidad: rachas.filter(r => r.duracion >= 6 && r.duracion <= 10).length },
    { rango: '11-15 días', cantidad: rachas.filter(r => r.duracion >= 11 && r.duracion <= 15).length },
    { rango: '16-20 días', cantidad: rachas.filter(r => r.duracion >= 16 && r.duracion <= 20).length },
    { rango: '21+ días', cantidad: rachas.filter(r => r.duracion >= 21).length },
  ].filter(d => d.cantidad > 0);

  const sequiaMaxima = rachas[0] || { duracion: 0, fechaInicio: '-' };

  return {
    resumen: {
      totalRachas: rachas.length,
      diasTotalesSinLluvia,
      sequiaMaxima: sequiaMaxima.duracion,
      fechaSequiaMaxima: sequiaMaxima.fechaInicio,
      promedioRachas: rachas.length > 0 
        ? Math.round((rachas.reduce((sum, r) => sum + r.duracion, 0) / rachas.length) * 10) / 10 
        : 0,
      porcentajeDiasSecos: Math.round((diasTotalesSinLluvia / datosOrdenados.length) * 1000) / 10
    },
    porAño,
    porMes,
    porDuracion,
    rachas: rachas.slice(0, 100)
  };
}

// GET Handler
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const año = searchParams.get('año');
    const minDuracion = parseInt(searchParams.get('minDuracion') || '3');
    const limite = parseInt(searchParams.get('limite') || '100');

    // Cargar datos
    const datos = cargarDatos();
    
    // Filtrar si es necesario
    let datosFiltrados = datos;
    if (año) {
      datosFiltrados = datosFiltrados.filter(d => d.year === parseInt(año));
    }

    // Realizar análisis
    const resultado = analizarSequias(datosFiltrados);
    
    // Filtrar por duración mínima
    resultado.rachas = resultado.rachas
      .filter(r => r.duracion >= minDuracion)
      .slice(0, limite);

    return NextResponse.json({
      success: true,
      filtros: { año, minDuracion, limite },
      data: resultado
    });

  } catch (error) {
    console.error('Error en /api/sequias:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar los datos' },
      { status: 500 }
    );
  }
}