# PRD - Calculadora de Tiempo de Lectura en Voz Alta

## Problema Original
Construir una aplicación en español para introducir un artículo en PDF y determinar cuánto tiempo se requiere para leerlo en voz alta con una velocidad promedio de pronunciación (180 PPM). La aplicación debe mostrar el tiempo de cada párrafo, detectar preguntas identificadas por número de párrafo, y agregar 35 segundos por cada respuesta. Incluir cronómetro de lectura y contador regresivo hasta las últimas preguntas.

## User Personas
- Presentadores y locutores
- Profesores preparando clases
- Personas que necesitan calcular tiempos de presentación

## Requisitos Core (Estáticos)
- Subida de archivos PDF
- Extracción de texto y división en párrafos
- Cálculo de tiempo de lectura (180 palabras/minuto)
- Detección de preguntas por número de párrafo (+35 seg/respuesta)
- Cronómetro principal (cuenta hacia arriba)
- Contador regresivo hasta últimas preguntas
- Interfaz completamente en español

## Lo Implementado (Enero 2026)
### Backend (FastAPI)
- ✅ Endpoint POST /api/analyze-pdf para subir y analizar PDFs
- ✅ Extracción de texto con PyMuPDF
- ✅ División en párrafos y conteo de palabras
- ✅ Cálculo de tiempo de lectura (180 PPM)
- ✅ Detección de preguntas por número de párrafo
- ✅ Almacenamiento de análisis en MongoDB

### Frontend (React)
- ✅ Zona de carga drag-and-drop para PDFs
- ✅ Tarjeta resumen con tiempos totales
- ✅ Desglose por párrafo con tiempo individual
- ✅ Cronómetro principal (iniciar/pausar/reiniciar)
- ✅ Contador regresivo hasta últimas preguntas
- ✅ Expansión/colapso de preguntas detectadas
- ✅ Barra de progreso de lectura
- ✅ Diseño Swiss/minimalista con fuentes Manrope/Inter/JetBrains Mono

## Stack Técnico
- Backend: FastAPI + PyMuPDF + MongoDB
- Frontend: React + Tailwind CSS + Shadcn/UI
- Base de datos: MongoDB

## Backlog Priorizado
### P0 (Crítico) - Completado
- [x] Subida y análisis de PDF
- [x] Cronómetro y contador regresivo
- [x] Interfaz en español

### P1 (Importante) - Futuro
- [ ] Exportar informe de tiempos a PDF
- [ ] Historial de análisis previos
- [ ] Ajustar velocidad de lectura personalizada

### P2 (Deseable) - Futuro
- [ ] Modo oscuro
- [ ] Resaltado del párrafo actual durante lectura
- [ ] Audio feedback al terminar cada sección
