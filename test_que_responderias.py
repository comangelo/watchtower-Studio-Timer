from fpdf import FPDF

# Create a test PDF with "¿QUÉ RESPONDERÍAS?" question to test ignoring functionality
pdf = FPDF()
pdf.add_page()
pdf.set_font('Arial', 'B', 16)

# Add title
pdf.cell(0, 10, 'Test PDF con QUE RESPONDERIAS', 0, 1, 'C')
pdf.ln(10)

pdf.set_font('Arial', '', 12)

# Paragraph 1 - Normal paragraph
pdf.cell(0, 8, '1 Párrafo normal:', 0, 1)
pdf.multi_cell(0, 6, 'Este es un párrafo normal con texto de prueba para verificar el funcionamiento del sistema de análisis de tiempo de lectura.')
pdf.ln(5)

# Paragraph 2 - With regular question
pdf.cell(0, 8, '2 Párrafo con pregunta regular:', 0, 1)
pdf.multi_cell(0, 6, '2 ¿Cuál es la velocidad de lectura utilizada? Esta es una pregunta normal que debe ser contada.')
pdf.ln(5)

# Paragraph 3 - Final questions before QUE RESPONDERIAS
pdf.cell(0, 8, '3 Preguntas finales:', 0, 1)
pdf.multi_cell(0, 6, '3 ¿Esta es una pregunta final importante? 3 ¿Otra pregunta final antes de la sección ignorada?')
pdf.ln(5)

# Paragraph 4 - The ignored question
pdf.cell(0, 8, '4 Pregunta ignorada:', 0, 1)
pdf.multi_cell(0, 6, '4 ¿QUÉ RESPONDERÍAS? Esta pregunta debe ser ignorada completamente por el sistema.')
pdf.ln(5)

# Paragraph 5 - After ignored question
pdf.cell(0, 8, '5 Después de ignorada:', 0, 1)
pdf.multi_cell(0, 6, 'Este párrafo viene después de la pregunta ignorada y no debe tener preguntas finales marcadas.')

# Save the PDF
pdf.output('/app/test_que_responderias.pdf')
print("Test PDF with QUE RESPONDERIAS created successfully at /app/test_que_responderias.pdf")