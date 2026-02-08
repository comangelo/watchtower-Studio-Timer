# PRD - Calculadora de Tiempo de Lectura en Voz Alta

## Problema Original
Construir una aplicación en español para introducir un artículo en PDF y determinar cuánto tiempo se requiere para leerlo en voz alta con una velocidad promedio de pronunciación (180 PPM). La aplicación debe mostrar el tiempo de cada párrafo, detectar preguntas identificadas por número de párrafo, y agregar 30-40 segundos por cada respuesta. Incluir cronómetro de lectura y contador regresivo hasta las últimas preguntas. Las preguntas después de "¿QUÉ RESPONDERÍAS?" se consideran preguntas finales separadas.

## User Personas
- Presentadores y locutores
- Profesores preparando clases
- Personas que necesitan calcular tiempos de presentación

## Requisitos Core (Estáticos)
- Subida de archivos PDF
- Extracción de texto y división en párrafos
- Cálculo de tiempo de lectura (180 palabras/minuto)
- Detección de preguntas formato "número. pregunta" (+35 seg/respuesta)
- Detección de preguntas finales después de "¿QUÉ RESPONDERÍAS?"
- Cronómetro principal (cuenta hacia arriba)
- Contador regresivo hasta últimas preguntas
- Duración total fija de 60 minutos
- Ajuste dinámico: tiempo de lectura FIJO, tiempo de preguntas VARIABLE
- Interfaz completamente en español

## Lo Implementado (Febrero 2026)
### Backend (FastAPI)
- ✅ Endpoint POST /api/analyze-pdf para subir y analizar PDFs
- ✅ Extracción de texto con PyMuPDF
- ✅ División en párrafos y conteo de palabras
- ✅ Cálculo de tiempo de lectura (180 PPM)
- ✅ Detección de preguntas formato "número. pregunta"
- ✅ Detección de preguntas finales (después de "¿QUÉ RESPONDERÍAS?")
- ✅ Preparación para MongoDB (índices creados)

### Frontend (React)
- ✅ Zona de carga drag-and-drop para PDFs
- ✅ Tarjeta resumen con tiempos totales (lectura, respuestas, total fijo 60 min)
- ✅ Desglose por párrafo con tiempo individual
- ✅ Cronómetro principal (iniciar/pausar/reiniciar)
- ✅ Contador regresivo hasta últimas preguntas
- ✅ Expansión/colapso de preguntas detectadas
- ✅ Barra de progreso de lectura
- ✅ Navegación manual entre párrafos (Siguiente/Anterior)
- ✅ Botón "Iniciar desde aquí" para comenzar desde cualquier párrafo
- ✅ Indicador visual del párrafo actual ("LEYENDO AHORA")
- ✅ Sección separada para "Preguntas Finales" con tiempos ajustados
- ✅ Ajuste dinámico de tiempos: lectura FIJA, preguntas VARIABLES
- ✅ Modo presentación pantalla completa con temas de color
- ✅ Exportación a PNG y PDF (html2canvas + jspdf)
- ✅ Alertas sonoras y vibración configurables
- ✅ Alerta cuando tiempo por pregunta < 20 segundos
- ✅ Persistencia de preferencias en localStorage

## Stack Técnico
- Backend: FastAPI + PyMuPDF + MongoDB
- Frontend: React + Tailwind CSS + Shadcn/UI + lucide-react
- Librerías: html2canvas, jspdf, sonner (toasts), Web Audio API

## Backlog Priorizado
### P0 (Crítico) - ✅ COMPLETADO
- [x] Subida y análisis de PDF
- [x] Cronómetro y contador regresivo
- [x] Interfaz en español
- [x] Bug pantalla blanca (playNotificationSound antes de useEffect)

### P1 (Importante) - ✅ COMPLETADO
- [x] Detección preguntas finales "¿QUÉ RESPONDERÍAS?"
- [x] Navegación manual entre párrafos
- [x] Ajuste dinámico tiempo lectura fijo / preguntas variable
- [x] Modo presentación con temas
- [x] Exportar a PNG/PDF
- [x] Alertas sonoras y vibración
- [x] Alerta tiempo bajo por pregunta (< 20 seg)

### P2 (Pendiente)
- [ ] Estadísticas tiempo estimado vs. tiempo real por párrafo
- [ ] Historial de documentos analizados
- [ ] Modo "solo lectura" sin controles UI
- [ ] Editor de colores / más temas para presentación

### Refactorización - ✅ COMPLETADA (Febrero 2026)
- [x] Dividir HomePage.jsx de 1700 a 616 líneas
- [x] 8 componentes nuevos creados
- [x] 4 custom hooks creados
- [x] 1 archivo de utilidades

## Arquitectura de Componentes

### Componentes (`/frontend/src/components/`)
| Componente | Descripción |
|------------|-------------|
| UploadZone.jsx | Zona drag-and-drop para subir PDFs |
| AnalysisSummary.jsx | Resumen del análisis (tiempos totales) |
| TimerDisplay.jsx | Cronómetro principal con controles |
| CountdownTimer.jsx | Timer de cuenta regresiva |
| QuickStats.jsx | Estadísticas rápidas |
| NotificationSettings.jsx | Configuración de alertas |
| ParagraphCard.jsx | Tarjeta de párrafo individual |
| FinalQuestionsSection.jsx | Sección preguntas finales |
| PresentationMode.jsx | Modo pantalla completa |

### Custom Hooks (`/frontend/src/hooks/`)
| Hook | Descripción |
|------|-------------|
| useLocalStorage.js | Persistencia en localStorage |
| useTimer.js | Lógica del cronómetro |
| useNotifications.js | Sonidos y vibración |
| useScheduleCalculator.js | Cálculos de tiempos ajustados |

### Utilidades (`/frontend/src/utils/`)
| Archivo | Funciones |
|---------|-----------|
| timeFormatters.js | formatTime, formatTimeText, formatClockTime, addSecondsToDate |

## Archivos Clave
- `/app/backend/server.py` - API y lógica de análisis PDF
- `/app/frontend/src/pages/HomePage.jsx` - Componente principal (616 líneas)
- `/app/test_reports/iteration_4.json` - Último reporte de tests (100% passed)
