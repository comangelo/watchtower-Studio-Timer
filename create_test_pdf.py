from fpdf import FPDF

# Create a test PDF with Spanish content and questions
pdf = FPDF()
pdf.add_page()
pdf.set_font('Arial', 'B', 16)

# Add title
pdf.cell(0, 10, 'Documento de Prueba para Lectura', 0, 1, 'C')
pdf.ln(10)

# Add paragraphs with questions
pdf.set_font('Arial', '', 12)

# Paragraph 1
pdf.cell(0, 8, 'Párrafo 1:', 0, 1)
pdf.multi_cell(0, 6, 'Este es el primer párrafo del documento de prueba. Contiene aproximadamente veinte palabras para calcular el tiempo de lectura correctamente según la velocidad estándar.')
pdf.ln(5)

# Paragraph 2 with question
pdf.cell(0, 8, 'Párrafo 2:', 0, 1)
pdf.multi_cell(0, 6, 'El segundo párrafo incluye una pregunta importante. ¿Cuál es la velocidad de lectura utilizada en este sistema? Esta pregunta debería ser detectada automáticamente por el algoritmo.')
pdf.ln(5)

# Paragraph 3
pdf.cell(0, 8, 'Párrafo 3:', 0, 1)
pdf.multi_cell(0, 6, 'Este tercer párrafo no contiene preguntas. Solo texto normal para verificar que el sistema puede distinguir entre párrafos con y sin preguntas correctamente.')
pdf.ln(5)

# Paragraph 4 with numbered question
pdf.cell(0, 8, 'Párrafo 4:', 0, 1)
pdf.multi_cell(0, 6, '4. ¿Esta es una pregunta numerada que debería ser detectada? El sistema debe identificar preguntas que comienzan con el número del párrafo.')

# Save the PDF
pdf.output('/app/test_document.pdf')
print("Test PDF created successfully at /app/test_document.pdf")