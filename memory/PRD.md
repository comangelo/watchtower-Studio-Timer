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
- **Cálculo de tiempo de lectura CONFIGURABLE (150/180/210 palabras/minuto)**
- **Tiempo por respuesta CONFIGURABLE (15-90 segundos)**
- **Duración total CONFIGURABLE (0-60 minutos, incremento de 1)**
- Detección de preguntas formato "número. pregunta"
- Detección de preguntas finales después de línea horizontal (no "¿QUÉ RESPONDERÍAS?")
- Cronómetro principal (cuenta hacia arriba)
- Contador regresivo hasta últimas preguntas
- Ajuste dinámico: tiempo de lectura FIJO, tiempo de preguntas VARIABLE
- Interfaz completamente en español
- PWA instalable en Android/iOS/Desktop

## Lo Implementado (Febrero 2026)
### Backend (FastAPI)
- ✅ Endpoint POST /api/analyze-pdf para subir y analizar PDFs
- ✅ **Parámetros configurables `wpm` (100-300) y `answer_time_seconds` (10-120)**
- ✅ Extracción de texto con PyMuPDF
- ✅ División en párrafos y conteo de palabras
- ✅ Cálculo de tiempo de lectura basado en WPM configurable
- ✅ Detección de preguntas formato "número. pregunta"
- ✅ Detección de preguntas de repaso basado en línea horizontal del PDF
- ✅ Preparación para MongoDB (índices creados)
- ✅ **Extracción de contenido entre paréntesis de preguntas (11-Feb-2026)**
  - Función `extract_question_with_parenthesis` para detectar contenido en `()`
  - Clasificación automática: "Vea también" → `image`, Referencias bíblicas (Juan 3:16) → `scripture`
  - Función helper `create_question_info` que integra la extracción
  - Campos `parenthesis_content` y `content_type` en modelo `QuestionInfo`

### Frontend (React)
- ✅ **Panel de configuración de tiempos (SettingsPanel)**
- ✅ **Selector de velocidad: Lento (150), Normal (180), Rápido (210) WPM**
- ✅ **Slider de tiempo por respuesta: 15-90 segundos**
- ✅ Zona de carga drag-and-drop para PDFs con indicadores de configuración
- ✅ Tarjeta resumen con tiempos totales (lectura, respuestas, total fijo 60 min)
- ✅ Desglose por párrafo con tiempo individual
- ✅ Cronómetro principal (iniciar/pausar/reiniciar)
- ✅ Contador regresivo hasta últimas preguntas
- ✅ Expansión/colapso de preguntas detectadas
- ✅ Barra de progreso de lectura
- ✅ Navegación manual entre párrafos (Siguiente/Anterior)
- ✅ Botón "Iniciar desde aquí" para comenzar desde cualquier párrafo
- ✅ Indicador visual del párrafo actual ("LEYENDO AHORA")
- ✅ **Cronómetro individual por párrafo que se reinicia al cambiar de párrafo**
- ✅ **Cronómetro muestra tiempo transcurrido vs estimado (ej: 0:45 / 2:30)**
- ✅ **Cronómetro y tarjeta cambian a ROJO cuando excede el tiempo estimado**
- ✅ **Badge "+X:XX excedido" cuando se pasa del tiempo**
- ✅ **Texto "⚠️ TIEMPO EXCEDIDO" reemplaza "LEYENDO AHORA" en overtime**
- ✅ **Alerta sonora/vibración al exceder tiempo del párrafo (configurable on/off)**
- ✅ **Agrupación de párrafos con preguntas compartidas (ej: "1, 2.")**
- ✅ **Panel de Estadísticas de Tiempo con comparativa estimado vs real**
- ✅ **Resumen: tiempo total estimado, real y diferencia**
- ✅ **Desglose por párrafo con indicadores visuales (verde=más rápido, rojo=más lento)**
- ✅ Sección separada para "Preguntas de Repaso" con tiempos ajustados
- ✅ Ajuste dinámico de tiempos: lectura FIJA, preguntas VARIABLES
- ✅ Modo presentación pantalla completa con temas de color
- ✅ Exportación a PNG y PDF (html2canvas + jspdf)
- ✅ Alertas sonoras y vibración configurables
- ✅ Alerta cuando tiempo por pregunta < 20 segundos
- ✅ Persistencia de preferencias en localStorage
- ✅ PWA instalable (manifest.json, service worker)
- ✅ **Tamaño responsivo de horas inicio/fin (10-Feb-2025)**
- ✅ **Nuevo ícono de app: fondo naranja con reloj blanco minimalista (10-Feb-2025)**
- ✅ **Ícono actualizado en encabezado de la aplicación (10-Feb-2025)**
- ✅ **Duración configurable de 0 a 60 minutos con incremento de 1 (11-Feb-2025)**
- ✅ **Hora de fin vinculada directamente a la duración configurada (11-Feb-2025)**
- ✅ **Horarios siempre visibles con colores distintivos: esmeralda (inicio) y ámbar (fin) (11-Feb-2025)**
- ✅ **Panel de horarios responsivo para móviles en horizontal (11-Feb-2025)**
- ✅ **Manual de usuario actualizado a v2.3 con instrucciones de actualización (11-Feb-2025)**
- ✅ **Hora de fin editable manualmente con cálculo automático de duración (11-Feb-2025)**
- ✅ **Etiqueta "DURACIÓN" visible en panel de horarios (11-Feb-2025)**
- ✅ **Panel de horarios visible en pantalla inicial ANTES de cargar PDF (11-Feb-2025)**
- ✅ **Edición de hora de fin funcional en pantalla inicial con indicador "(MANUAL)" (11-Feb-2025)**
- ✅ **Duración calculada automáticamente al establecer hora manual (color cian) (11-Feb-2025)**
- ✅ **Opción "Restaurar hora automática" para volver a duración configurada (11-Feb-2025)**
- ✅ **Palabras de Introducción: Nueva sección antes de los párrafos con cronómetro (1 min) (11-Feb-2025)**
- ✅ **Palabras de Conclusión: Nueva sección después de preguntas de repaso con cronómetro (1 min) (11-Feb-2025)**
- ✅ **Flujo completo: Introducción → Párrafos → Preguntas → Conclusión → Finalizar (11-Feb-2025)**
- ✅ **Encabezados de párrafos rediseñados: más minimalistas con "LEYENDO" (11-Feb-2025)**
- ✅ **Manual de usuario actualizado a v2.4 con nuevo flujo documentado (11-Feb-2025)**
- ✅ **Modo oscuro global para la aplicación principal con toggle sol/luna (11-Feb-2025)**
- ✅ **12 temas de colores para el modo presentación: Oscuro, Claro, Azul Océano, Verde Bosque, Púrpura Noche, Cálido Atardecer, Rosa Suave, Turquesa, Medianoche, Café, Alto Contraste, AMOLED Negro (11-Feb-2025)**
- ✅ **Configuración de tiempos de introducción y conclusión: sliders de 30 seg a 3 min con colores distintivos (azul/púrpura) (11-Feb-2025)**
- ✅ **Modo oscuro mejorado: fondos más oscuros y mejor contraste en todos los componentes (11-Feb-2025)**
  - Panel de análisis (AnalysisSummary) con fondo zinc-800
  - Tarjetas de párrafos con fondo zinc-800 y texto claro
  - Panel de estadísticas rápidas (QuickStats) con gradiente oscuro
  - Configuración de alertas (NotificationSettings) con fondo oscuro
  - Indicador de progreso de párrafos con estilo oscuro
  - Sección de preguntas finales con variantes oscuras
  - Componentes de introducción/conclusión con fondos oscuros
- ✅ **Selector de variantes de modo oscuro con 4 temas (11-Feb-2025)**
  - Menú desplegable al hacer clic en el icono sol/luna
  - **Zinc**: Equilibrado y suave (por defecto)
  - **AMOLED Negro**: Negro puro #000000 para pantallas OLED
  - **Slate Oscuro**: Tono azulado frío
  - **Neutral Oscuro**: Tono cálido marrón
  - Indicadores visuales de color en cada opción
  - Preferencia guardada en localStorage
- ✅ **Distintivos de contenido extra en preguntas (11-Feb-2026)**
  - Badge púrpura "Contiene imagen" con icono Image para referencias "Vea también"
  - Badge azul "Texto para leer" con icono BookOpen para referencias bíblicas
  - Muestra el contenido del paréntesis junto al distintivo
  - Compatible con modo oscuro (bg-purple-900/60, bg-blue-900/60)

## Stack Técnico
- Backend: FastAPI + PyMuPDF + MongoDB
- Frontend: React + Tailwind CSS + Shadcn/UI + lucide-react
- Librerías: html2canvas, jspdf, sonner (toasts), Web Audio API
- PWA: Service Worker + Web App Manifest

## Backlog Priorizado
### P0 (Crítico) - ✅ COMPLETADO
- [x] Subida y análisis de PDF
- [x] Cronómetro y contador regresivo
- [x] Interfaz en español
- [x] Bug pantalla blanca (playNotificationSound antes de useEffect)
- [x] **Velocidad de lectura configurable (150/180/210 WPM)**
- [x] **Tiempo por respuesta configurable (15-90 seg)**
- [x] **Extracción y visualización de contenido extra en preguntas**

### P1 (Importante) - ✅ COMPLETADO
- [x] Detección preguntas finales (línea horizontal)
- [x] Navegación manual entre párrafos
- [x] Ajuste dinámico tiempo lectura fijo / preguntas variable
- [x] Modo presentación con temas
- [x] Exportar a PNG/PDF
- [x] Alertas sonoras y vibración
- [x] Alerta tiempo bajo por pregunta (< 20 seg)
- [x] PWA instalable

### P2 (Pendiente)
- [ ] Historial de documentos analizados
- [ ] Modo "solo lectura" sin controles UI
- [ ] Editor de colores / más temas para presentación
- [ ] Resumen en PDF con gráficas comparativas

## Arquitectura de Componentes

### Componentes (`/frontend/src/components/`)
| Componente | Descripción |
|------------|-------------|
| SettingsPanel.jsx | **Panel de configuración de velocidad y tiempo por respuesta** |
| UploadZone.jsx | Zona drag-and-drop para subir PDFs |
| AnalysisSummary.jsx | Resumen del análisis (tiempos totales) |
| TimerDisplay.jsx | Cronómetro principal con controles |
| CountdownTimer.jsx | Timer de cuenta regresiva |
| QuickStats.jsx | Estadísticas rápidas (muestra WPM configurado) |
| NotificationSettings.jsx | Configuración de alertas |
| ParagraphCard.jsx | Tarjeta de párrafo individual **con distintivos de contenido extra** |
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
| darkThemes.js | Variantes de tema oscuro (Zinc, AMOLED, Slate, Neutral) |

## Archivos Clave
- `/app/backend/server.py` - API y lógica de análisis PDF (con funciones configurables y extracción de paréntesis)
- `/app/frontend/src/pages/HomePage.jsx` - Componente principal
- `/app/frontend/src/components/SettingsPanel.jsx` - **Configuración de tiempos**
- `/app/frontend/src/components/ParagraphCard.jsx` - Tarjetas de párrafo **con distintivos de contenido extra**
- `/app/frontend/src/components/FinalQuestionsSection.jsx` - Preguntas de repaso
- `/app/test_reports/iteration_8.json` - Último reporte de tests (100% passed)

## Cambios para Deployment (11-Feb-2026)
- ✅ **Migración a patrón `lifespan` de FastAPI** (reemplazo del deprecado `@app.on_event`)
- ✅ **Endpoint de health check `/api/health`** para Kubernetes
- ✅ **Manejo robusto de conexión a MongoDB** con timeouts y fallbacks
- ✅ **Variables de entorno con valores por defecto** para evitar crashes
- ✅ **Operaciones de base de datos con try-catch** para manejar errores de conexión
