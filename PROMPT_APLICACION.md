# Prompt para Crear la Aplicación "Atalaya de Estudio"

Quiero construir una aplicación web (PWA) para analizar artículos de estudio en formato PDF y calcular el tiempo necesario para leerlos en voz alta. La aplicación debe crear un cronograma dinámico que desglose el tiempo por párrafo y por pregunta.

## Funcionalidades principales:

### 1. Carga y análisis de PDF:
- Subir archivos PDF mediante drag & drop o selector de archivos
- Extraer automáticamente párrafos numerados (ej: "1.", "2.", "1, 2.")
- Identificar preguntas asociadas a cada párrafo (texto en cursiva después del párrafo)
- Detectar preguntas de repaso al final del artículo (sección "REPASO")
- Calcular tiempo de lectura basado en velocidad de palabras por minuto configurable

### 2. Configuración de tiempos:
- Velocidad de lectura ajustable (100-250 PPM, default 180)
- Tiempo base por pregunta (20-60 segundos, default 35)
- Duración total del estudio (30-90 minutos, default 60)
- Tiempo para "Palabras de Introducción" (30 seg - 3 min)
- Tiempo para "Palabras de Conclusión" (30 seg - 3 min)

### 3. Flujo de estudio completo:
- Paso 1: Palabras de Introducción (el conductor introduce el tema)
- Paso 2: Lectura de párrafos con preguntas (navegación manual entre párrafos)
- Paso 3: Preguntas de Repaso (modo review con navegación pregunta por pregunta)
- Paso 4: Palabras de Conclusión (cierre del estudio)

### 4. Cronometraje:
- Cronómetro principal (iniciar/pausar/reiniciar)
- Temporizador de cuenta regresiva configurable
- Cronómetros individuales para cada sección
- Alertas visuales y sonoras cuando se excede el tiempo
- Hora de inicio y fin visible y editable manualmente

### 5. Panel de estadísticas:
- Comparativa tiempo estimado vs tiempo real
- Progreso visual por párrafo completado
- Estadísticas rápidas (velocidad, total preguntas, párrafo actual)

### 6. Modo Presentación:
- Vista de pantalla completa para proyectar
- Múltiples temas de color (Oscuro, Claro, Azul Océano, Café, Rosa, Púrpura, Turquesa)
- Responsive para diferentes dispositivos

### 7. Modo Oscuro:
- Toggle global para toda la aplicación
- Selector de variantes (Zinc, AMOLED Negro, Slate Oscuro, Neutral Oscuro)
- Alto contraste en todos los componentes

### 8. Exportación:
- Exportar cronograma como imagen PNG
- Exportar como PDF

### 9. PWA:
- Instalable en dispositivos móviles y desktop
- Icono personalizado
- Funciona offline

### 10. Alertas y notificaciones:
- Sonido configurable
- Vibración (móviles)
- Alertas antes de las preguntas de repaso (configurable: 5 min, 1 min)
- Alerta de exceso de tiempo por párrafo

## Stack tecnológico:
- Frontend: React + Tailwind CSS + Shadcn/UI
- Backend: FastAPI (Python)
- PDF Parser: PyMuPDF
- Exportación: html2canvas + jsPDF

## Diseño UI/UX:
- Estilo moderno y limpio
- Colores principales: Naranja (#f97316) como acento
- Tarjetas con bordes redondeados (rounded-2xl)
- Iconos de Lucide React
- Tipografía del sistema
- Animaciones suaves en transiciones
- Responsive (mobile-first)
