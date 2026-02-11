# PROMPT PARA CREAR LA APLICACIÓN "ATALAYA DE ESTUDIO - CALCULADORA DE TIEMPO"

## Descripción General
Crear una aplicación web PWA (Progressive Web App) en español para analizar artículos de "La Atalaya" en formato PDF y calcular el tiempo necesario para leerlos en voz alta. La aplicación debe crear un cronograma dinámico que desglose el tiempo por párrafo, detectar preguntas, y permitir controlar todo el flujo de estudio desde un panel de presentación.

---

## Stack Tecnológico
- **Backend**: FastAPI (Python) con PyMuPDF para extracción de PDF
- **Frontend**: React con Tailwind CSS y Shadcn/UI
- **Base de datos**: MongoDB (preparado pero no requerido inicialmente)
- **Librerías adicionales**: html2canvas, jspdf, lucide-react, sonner (toasts)
- **PWA**: Service Worker + Web App Manifest para instalación

---

## FUNCIONALIDADES PRINCIPALES

### 1. Análisis de PDF
- Subir archivos PDF mediante drag-and-drop o selector de archivos
- Extraer texto con análisis de fuentes para identificar:
  - Números de párrafo (fuente pequeña ~7pt)
  - Texto de párrafos (fuente ~11pt)
  - Preguntas (fuente ~9pt, formato "N. ¿pregunta?")
  - Preguntas de repaso (después de línea horizontal)
- Detectar contenido entre paréntesis después de las preguntas:
  - Clasificar como "imagen" si contiene "Vea también", "Vea la imagen"
  - Clasificar como "texto bíblico" si contiene referencias (ej: "Juan 3:16", "Salmos 32:17")
- Manejar guiones de división de palabras (ej: "ima-gen" → "imagen")

### 2. Cálculo de Tiempos
- **Velocidad de lectura configurable**: 150 (lento), 180 (normal), 210 (rápido) palabras por minuto
- **Tiempo por respuesta configurable**: 15-90 segundos (slider)
- **Duración total configurable**: 0-60 minutos
- **+40 segundos adicionales** para párrafos que contienen:
  - Referencias a imágenes
  - Textos bíblicos para leer
- Tiempo de lectura FIJO, tiempo de preguntas VARIABLE para ajustar al tiempo total

### 3. Panel de Resumen (AnalysisSummary)
Mostrar estadísticas con badges coloridos en este orden:
1. **Párrafos** (gris) - icono Layers
2. **Preguntas** (naranja) - icono MessageCircle
3. **Textos para leer** (azul) - icono BookOpen
4. **Imágenes** (púrpura) - icono Image
5. **Preguntas de repaso** (rojo) - icono HelpCircle

Mostrar tarjetas de tiempo:
- Lectura (gris)
- Respuestas (naranja)
- Total (negro, fijo)

### 4. Desglose por Párrafo (ParagraphCard)
Cada tarjeta de párrafo debe mostrar:
- Número de párrafo
- **Distintivos en el encabezado** (entre número y tiempo):
  - 🖼️ "Contiene imagen" (púrpura) - si alguna pregunta tiene referencia a imagen
  - 📖 "Texto para leer" (azul) - si alguna pregunta tiene referencia bíblica
- Tiempo estimado del párrafo
- Botón para mostrar/ocultar contenido del párrafo
- Botón para ver preguntas (expandible)
- Cronómetro individual por párrafo (cuando está activo)
- Indicador "LEYENDO" cuando es el párrafo actual
- Cambio a ROJO cuando excede el tiempo estimado

### 5. Flujo de Estudio Completo
El estudio tiene estas secciones en orden:
1. **Palabras de Introducción** (configurable 30s-3min, default 1min)
2. **Lectura de Párrafos** (con preguntas intercaladas)
3. **Preguntas de Repaso** (después de línea horizontal en PDF)
4. **Palabras de Conclusión** (configurable 30s-3min, default 1min)

### 6. Panel de Horarios
- **Hora de inicio**: Se establece automáticamente al iniciar estudio (color esmeralda)
- **Hora de fin**: Calculada según duración (color ámbar)
- **Duración**: Editable de 0-60 minutos
- **Hora de fin manual**: Botón para editar manualmente con indicador "(MANUAL)"
- Opción para "Restaurar hora automática"
- Visible ANTES y DESPUÉS de cargar el PDF

### 7. Cronómetros
- **Cronómetro general**: Cuenta desde el inicio del estudio
- **Cronómetro por sección**: Se reinicia al cambiar de párrafo/sección
- **Contador regresivo**: Muestra tiempo restante hasta el fin
- Formato: tiempo actual / tiempo estimado (ej: "0:45 / 2:30")
- Alertas visuales y sonoras al exceder tiempo

### 8. Modo de Presentación (PresentationMode)
Panel de pantalla completa con:

**Encabezado:**
- Nombre del archivo
- Estadísticas con iconos coloridos (párrafos, preguntas, imágenes, textos, repaso)
- Selector de tema (Oscuro, Claro, Azul Océano, AMOLED Negro)
- Botón salir

**Panel de horarios:**
- Hora inicio (esmeralda) | Duración | Hora fin (ámbar)

**Barra de progreso de párrafos:**
- Puntos visuales para cada párrafo (w-4, h-3)
- Punto actual más grande (w-10) con número encima
- Colores: Verde (completado/actual), Púrpura (imagen), Azul (texto), Gris (pendiente)
- Contador "X de Y"
- Leyenda: 🟣 Imagen | 🔵 Texto | 🟢 Actual

**Información de fase actual:**
- Icono grande de la fase (Mic=intro, Book=párrafo, Help=repaso, Sparkles=conclusión)
- Título de la fase (ej: "Párrafo 8")
- **Badges prominentes**: "MOSTRAR IMAGEN" (púrpura), "LEER TEXTO" (azul)
- Cronómetro de fase: tiempo actual / tiempo estimado
- Barra de progreso de la fase

**Cronómetros principales (GRANDES - text-5xl/7xl):**
- Transcurrido (naranja cuando activo)
- Restante (verde, rojo si bajo tiempo)

**Controles de navegación:**
- Botón "Iniciar Estudio" (solo al inicio)
- Botón "Anterior"
- Botón Pause/Play (circular naranja)
- Botón "Siguiente" con nombre del destino (ej: "Párrafo 9")
- **Aviso prominente** encima del botón siguiente cuando hay imagen/texto:
  - Caja con borde punteado amarillo
  - "¡ATENCIÓN!" en amarillo
  - Badge "IMAGEN" (púrpura) y/o "TEXTO" (azul)
  - Animación pulsante
- Botón Reset

**Atajos de teclado:**
- Espacio: iniciar/pausar
- Flechas ←/→: navegar
- ESC: salir

### 9. Modo Oscuro
- Toggle sol/luna en el header
- Menú desplegable con variantes:
  - **Zinc**: Equilibrado y suave (default)
  - **AMOLED Negro**: Negro puro #000000
  - **Slate Oscuro**: Tono azulado frío
  - **Neutral Oscuro**: Tono cálido marrón
- Preferencia guardada en localStorage
- Todos los componentes adaptados con clases `dark:`

### 10. Configuraciones Persistentes
Guardar en localStorage:
- Velocidad de lectura (WPM)
- Tiempo por respuesta
- Duración total
- Tiempos de introducción/conclusión
- Tema de modo oscuro
- Tema de presentación
- Estado de alertas sonoras/vibración

### 11. Alertas y Notificaciones
- Alerta sonora al exceder tiempo de párrafo (configurable on/off)
- Vibración en dispositivos móviles (configurable on/off)
- Alerta visual cuando tiempo por pregunta < 20 segundos
- Toasts informativos (usando sonner)

### 12. Exportación
- Exportar cronograma a PNG (html2canvas)
- Exportar cronograma a PDF (jspdf)

### 13. PWA
- Service Worker para funcionamiento offline
- Web App Manifest con icono naranja y reloj blanco
- Instalable en Android, iOS y Desktop
- Nombre: "Atalaya de Estudio"

---

## ESTRUCTURA DE DATOS DEL BACKEND

### Modelo QuestionInfo
```python
class QuestionInfo(BaseModel):
    text: str
    answer_time: int = 35
    is_final_question: bool = False
    parenthesis_content: str = ""  # Contenido entre paréntesis
    content_type: str = ""  # "image", "scripture", o ""
```

### Modelo ParagraphAnalysis
```python
class ParagraphAnalysis(BaseModel):
    number: int
    text: str
    word_count: int
    reading_time_seconds: float
    questions: List[QuestionInfo]
    total_time_seconds: float
    cumulative_time_seconds: float
    grouped_with: List[int] = []
```

### Modelo PDFAnalysisResult
```python
class PDFAnalysisResult(BaseModel):
    filename: str
    total_words: int
    total_paragraphs: int
    total_questions: int
    total_reading_time_seconds: float
    total_question_time_seconds: float
    total_time_seconds: float = 3600
    final_questions_start_time: float
    final_questions: List[QuestionInfo]
    final_questions_title: str
    paragraphs: List[ParagraphAnalysis]
    # Contadores adicionales
    total_paragraph_questions: int
    total_review_questions: int
    total_images: int
    total_scriptures: int
```

### Endpoint Principal
```
POST /api/analyze-pdf
- Parámetros: file (PDF), wpm (100-300), answer_time_seconds (10-120)
- Retorna: PDFAnalysisResult
```

---

## FUNCIONES CLAVE DEL BACKEND

### extract_question_with_parenthesis(question_text)
- Extrae contenido entre paréntesis después del "?"
- Clasifica: "image" si contiene "Vea", "scripture" si contiene referencias bíblicas
- Limpia guiones de división (clean_hyphenated_text)

### create_question_info(question_text, answer_time, is_final_question)
- Wrapper que usa extract_question_with_parenthesis
- Retorna QuestionInfo con campos de contenido extra

### Cálculo de tiempo extra
- +40 segundos por párrafo si tiene imagen
- +40 segundos por párrafo si tiene texto bíblico
- (Pueden acumularse: +80 seg si tiene ambos)

---

## COMPONENTES FRONTEND PRINCIPALES

```
/src/
├── components/
│   ├── AnalysisSummary.jsx      # Panel resumen con estadísticas
│   ├── ParagraphCard.jsx        # Tarjeta de párrafo individual
│   ├── PresentationMode.jsx     # Modo presentación pantalla completa
│   ├── SettingsPanel.jsx        # Configuración de velocidad y tiempos
│   ├── IntroductionWordsSection.jsx  # Sección palabras introducción
│   ├── ConclusionWordsSection.jsx    # Sección palabras conclusión
│   ├── FinalQuestionsSection.jsx     # Preguntas de repaso
│   ├── TimerDisplay.jsx         # Cronómetro principal
│   ├── QuickStats.jsx           # Estadísticas rápidas
│   └── NotificationSettings.jsx # Config alertas
├── pages/
│   └── HomePage.jsx             # Página principal (componente monolítico)
├── hooks/
│   ├── useLocalStorage.js       # Persistencia
│   ├── useTimer.js              # Lógica cronómetro
│   └── useNotifications.js      # Sonidos y vibración
└── utils/
    ├── timeFormatters.js        # Funciones de formato de tiempo
    └── darkThemes.js            # Variantes de tema oscuro
```

---

## PALETA DE COLORES

| Elemento | Modo Claro | Modo Oscuro |
|----------|------------|-------------|
| Párrafos | zinc-100 | zinc-700 |
| Preguntas | orange-50/700 | orange-900/200 |
| Imágenes | purple-50/700 | purple-900/200 |
| Textos bíblicos | blue-50/700 | blue-900/200 |
| Repaso | red-50/700 | red-900/200 |
| Actual/Activo | green-500 | green-500 |
| Tiempo excedido | red-500 | red-500 |
| Hora inicio | emerald-400 | emerald-400 |
| Hora fin | amber-400 | amber-400 |

---

## NOTAS IMPORTANTES

1. **Idioma**: Toda la interfaz debe estar en español
2. **Responsivo**: Diseñado para móviles y desktop
3. **Accesibilidad**: data-testid en todos los elementos interactivos
4. **Rendimiento**: Hot reload en desarrollo, build optimizado en producción
5. **Caché PWA**: Los usuarios deben refrescar forzadamente (Ctrl+Shift+R) para ver actualizaciones
6. **El botón "Iniciar Estudio"** es el punto central que inicia todos los cronómetros
7. **Los tiempos de lectura son FIJOS**, los tiempos de preguntas se AJUSTAN para cumplir la duración total

---

## VERSIÓN ACTUAL: 2.5 (Febrero 2026)

### Historial de versiones:
- v2.5: Distintivos de contenido extra, avisos prominentes en presentación, cronómetros grandes
- v2.4: Palabras de introducción/conclusión, flujo completo de estudio
- v2.3: Modo oscuro con variantes, selector de temas
- v2.2: Panel de horarios editable, duración configurable
- v2.1: Modo presentación con navegación
- v2.0: Velocidad y tiempo configurables
- v1.0: Análisis básico de PDF y cronómetro
