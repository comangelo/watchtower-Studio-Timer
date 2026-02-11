"""
Backend tests for PDF Reading Timer API
Tests: PDF upload, analysis, question detection, time calculations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Test API health and basic endpoints"""
    
    def test_api_root(self):
        """Test API root endpoint returns correct message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "PDF Reading Timer API"
        print("SUCCESS: API root endpoint working")

    def test_status_endpoint(self):
        """Test status endpoint"""
        response = requests.post(f"{BASE_URL}/api/status", json={"client_name": "test_client"})
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "client_name" in data
        assert data["client_name"] == "test_client"
        print("SUCCESS: Status endpoint working")


class TestPDFAnalysis:
    """Test PDF upload and analysis functionality"""
    
    def test_analyze_pdf_with_test_questions(self):
        """Test PDF analysis with test_questions.pdf"""
        pdf_path = "/app/test_questions.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_questions.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "filename" in data
        assert data["filename"] == "test_questions.pdf"
        assert "total_words" in data
        assert "total_paragraphs" in data
        assert "total_questions" in data
        assert "total_reading_time_seconds" in data
        assert "total_question_time_seconds" in data
        assert "total_time_seconds" in data
        assert "paragraphs" in data
        
        # Verify fixed 60-minute duration
        assert data["total_time_seconds"] == 3600, "Total time should be fixed at 60 minutes (3600 seconds)"
        assert data["fixed_duration"] == True
        
        # Verify paragraphs structure
        assert len(data["paragraphs"]) > 0
        for para in data["paragraphs"]:
            assert "number" in para
            assert "text" in para
            assert "word_count" in para
            assert "reading_time_seconds" in para
            assert "questions" in para
            assert "total_time_seconds" in para
            assert "cumulative_time_seconds" in para
        
        print(f"SUCCESS: PDF analyzed - {data['total_paragraphs']} paragraphs, {data['total_questions']} questions")
        return data

    def test_analyze_pdf_with_que_responderias(self):
        """Test PDF analysis with ¿QUÉ RESPONDERÍAS? detection"""
        pdf_path = "/app/test_que_responderias.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_que_responderias.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify final questions detection
        assert "final_questions" in data
        assert "final_questions_start_time" in data
        
        print(f"SUCCESS: Final questions detected - {len(data.get('final_questions', []))} final questions")
        return data

    def test_reject_non_pdf_file(self):
        """Test that non-PDF files are rejected"""
        # Create a fake text file
        files = {'file': ('test.txt', b'This is not a PDF', 'text/plain')}
        response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("SUCCESS: Non-PDF file correctly rejected")

    def test_reading_time_calculation(self):
        """Test reading time calculation at 180 WPM"""
        pdf_path = "/app/test_questions.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_questions.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify reading time calculation (180 WPM = 3 words per second)
        total_words = data["total_words"]
        expected_reading_time = (total_words / 180) * 60  # seconds
        actual_reading_time = data["total_reading_time_seconds"]
        
        # Allow small tolerance for rounding
        assert abs(actual_reading_time - expected_reading_time) < 1, \
            f"Reading time mismatch: expected ~{expected_reading_time:.2f}s, got {actual_reading_time}s"
        
        print(f"SUCCESS: Reading time calculation correct - {total_words} words = {actual_reading_time}s")

    def test_question_time_calculation(self):
        """Test question time calculation at 35 seconds per question"""
        pdf_path = "/app/test_questions.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_questions.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify question time calculation (35 seconds per question)
        total_questions = data["total_questions"]
        expected_question_time = total_questions * 35
        actual_question_time = data["total_question_time_seconds"]
        
        assert actual_question_time == expected_question_time, \
            f"Question time mismatch: expected {expected_question_time}s, got {actual_question_time}s"
        
        print(f"SUCCESS: Question time calculation correct - {total_questions} questions = {actual_question_time}s")


class TestAnalysesEndpoint:
    """Test analyses retrieval endpoint"""
    
    def test_get_analyses(self):
        """Test getting list of analyses"""
        response = requests.get(f"{BASE_URL}/api/analyses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} analyses")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
