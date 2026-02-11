"""
Backend tests for parenthesis extraction feature
Tests: extract_question_with_parenthesis, create_question_info, API response fields
"""
import pytest
import requests
import os
import sys

# Add backend to path for direct imports
sys.path.insert(0, '/app/backend')
from server import extract_question_with_parenthesis, create_question_info

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestExtractQuestionWithParenthesis:
    """Unit tests for extract_question_with_parenthesis function"""
    
    def test_vea_tambien_image_type(self):
        """Test 'Vea también' is classified as image type"""
        question = "¿Qué aprendemos de este ejemplo? (Vea también la imagen)"
        result = extract_question_with_parenthesis(question)
        
        assert result["text"] == "¿Qué aprendemos de este ejemplo?"
        assert result["parenthesis_content"] == "Vea también la imagen"
        assert result["content_type"] == "image"
        print("SUCCESS: 'Vea también' correctly classified as image")
    
    def test_vea_la_ilustracion_image_type(self):
        """Test 'Vea la ilustración' is classified as image type"""
        question = "¿Qué vemos aquí? (Vea la ilustración)"
        result = extract_question_with_parenthesis(question)
        
        assert result["content_type"] == "image"
        assert result["parenthesis_content"] == "Vea la ilustración"
        print("SUCCESS: 'Vea la ilustración' correctly classified as image")
    
    def test_vea_el_recuadro_image_type(self):
        """Test 'Vea el recuadro' is classified as image type"""
        question = "¿Qué dice el recuadro? (Vea el recuadro)"
        result = extract_question_with_parenthesis(question)
        
        assert result["content_type"] == "image"
        print("SUCCESS: 'Vea el recuadro' correctly classified as image")
    
    def test_bible_reference_scripture_type(self):
        """Test bible reference (Juan 3:16) is classified as scripture"""
        question = "¿Qué dice la Biblia? (Juan 3:16)"
        result = extract_question_with_parenthesis(question)
        
        assert result["text"] == "¿Qué dice la Biblia?"
        assert result["parenthesis_content"] == "Juan 3:16"
        assert result["content_type"] == "scripture"
        print("SUCCESS: Bible reference correctly classified as scripture")
    
    def test_salmos_reference_scripture_type(self):
        """Test Salmos reference is classified as scripture"""
        question = "¿Cómo podemos aplicar esto? (Salmos 32:17)"
        result = extract_question_with_parenthesis(question)
        
        assert result["content_type"] == "scripture"
        assert result["parenthesis_content"] == "Salmos 32:17"
        print("SUCCESS: Salmos reference correctly classified as scripture")
    
    def test_proverbios_reference_scripture_type(self):
        """Test Proverbios reference is classified as scripture"""
        question = "¿Qué aprendemos? (Proverbios 3:5)"
        result = extract_question_with_parenthesis(question)
        
        assert result["content_type"] == "scripture"
        print("SUCCESS: Proverbios reference correctly classified as scripture")
    
    def test_no_parenthesis_empty_fields(self):
        """Test question without parenthesis returns empty fields"""
        question = "¿Qué aprendemos de este ejemplo?"
        result = extract_question_with_parenthesis(question)
        
        assert result["text"] == "¿Qué aprendemos de este ejemplo?"
        assert result["parenthesis_content"] == ""
        assert result["content_type"] == ""
        print("SUCCESS: Question without parenthesis has empty fields")
    
    def test_short_parenthesis_ignored(self):
        """Test short parenthesis content (<=3 chars) is ignored"""
        question = "¿Pregunta? (ab)"
        result = extract_question_with_parenthesis(question)
        
        # Short content should be ignored
        assert result["parenthesis_content"] == ""
        print("SUCCESS: Short parenthesis content correctly ignored")
    
    def test_parenthesis_in_middle_of_question(self):
        """Test parenthesis anywhere in question is detected"""
        question = "¿Qué dice (Mateo 5:3) sobre esto?"
        result = extract_question_with_parenthesis(question)
        
        assert result["parenthesis_content"] == "Mateo 5:3"
        assert result["content_type"] == "scripture"
        print("SUCCESS: Parenthesis in middle of question detected")


class TestCreateQuestionInfo:
    """Unit tests for create_question_info helper function"""
    
    def test_creates_question_info_with_image_type(self):
        """Test create_question_info correctly creates QuestionInfo with image type"""
        q = create_question_info("¿Pregunta? (Vea imagen)", 35, False)
        
        assert q.text == "¿Pregunta?"
        assert q.parenthesis_content == "Vea imagen"
        assert q.content_type == "image"
        assert q.answer_time == 35
        assert q.is_final_question == False
        print("SUCCESS: create_question_info creates correct QuestionInfo with image type")
    
    def test_creates_question_info_with_scripture_type(self):
        """Test create_question_info correctly creates QuestionInfo with scripture type"""
        q = create_question_info("¿Qué dice? (Romanos 8:28)", 40, True)
        
        assert q.text == "¿Qué dice?"
        assert q.parenthesis_content == "Romanos 8:28"
        assert q.content_type == "scripture"
        assert q.answer_time == 40
        assert q.is_final_question == True
        print("SUCCESS: create_question_info creates correct QuestionInfo with scripture type")
    
    def test_creates_question_info_without_parenthesis(self):
        """Test create_question_info with question without parenthesis"""
        q = create_question_info("¿Pregunta simple?", 35, False)
        
        assert q.text == "¿Pregunta simple?"
        assert q.parenthesis_content == ""
        assert q.content_type == ""
        print("SUCCESS: create_question_info handles question without parenthesis")


class TestAPIResponseFields:
    """Test API returns parenthesis_content and content_type fields"""
    
    def test_api_returns_parenthesis_fields(self):
        """Test /api/analyze-pdf returns parenthesis_content and content_type for questions"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that paragraphs have questions with the new fields
        for para in data["paragraphs"]:
            for q in para["questions"]:
                assert "parenthesis_content" in q, "Question missing parenthesis_content field"
                assert "content_type" in q, "Question missing content_type field"
                assert isinstance(q["parenthesis_content"], str)
                assert isinstance(q["content_type"], str)
        
        # Check final questions also have the fields
        for q in data.get("final_questions", []):
            assert "parenthesis_content" in q, "Final question missing parenthesis_content field"
            assert "content_type" in q, "Final question missing content_type field"
        
        print("SUCCESS: API returns parenthesis_content and content_type fields for all questions")
    
    def test_question_info_model_has_fields(self):
        """Test QuestionInfo model has parenthesis_content and content_type fields"""
        from server import QuestionInfo
        
        # Create a QuestionInfo instance
        q = QuestionInfo(
            text="Test question?",
            answer_time=35,
            is_final_question=False,
            parenthesis_content="Test content",
            content_type="image"
        )
        
        assert q.parenthesis_content == "Test content"
        assert q.content_type == "image"
        print("SUCCESS: QuestionInfo model has parenthesis_content and content_type fields")


class TestContentTypeClassification:
    """Test content type classification logic"""
    
    def test_vea_variations(self):
        """Test various 'Vea' patterns are classified as image"""
        vea_patterns = [
            "Vea también",
            "Vea la imagen",
            "Vea el recuadro",
            "Vea las fotos",
            "Vea los dibujos",
            "vea también",  # lowercase
        ]
        
        for pattern in vea_patterns:
            question = f"¿Pregunta? ({pattern})"
            result = extract_question_with_parenthesis(question)
            assert result["content_type"] == "image", f"Failed for pattern: {pattern}"
        
        print("SUCCESS: All 'Vea' variations correctly classified as image")
    
    def test_bible_book_variations(self):
        """Test various bible book references are classified as scripture"""
        bible_refs = [
            "Juan 3:16",
            "Mateo 5:3",
            "Salmos 23:1",
            "Proverbios 3:5",
            "Génesis 1:1",
            "Apocalipsis 21:4",
            "Romanos 8:28",
            "Isaías 40:31",
        ]
        
        for ref in bible_refs:
            question = f"¿Pregunta? ({ref})"
            result = extract_question_with_parenthesis(question)
            assert result["content_type"] == "scripture", f"Failed for reference: {ref}"
        
        print("SUCCESS: All bible references correctly classified as scripture")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
