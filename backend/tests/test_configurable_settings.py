"""
Backend tests for Configurable Settings Feature
Tests: wpm (reading speed) and answer_time_seconds parameters in PDF analysis
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConfigurableReadingSpeed:
    """Test configurable reading speed (wpm) parameter"""
    
    def test_default_wpm_180(self):
        """Test default WPM is 180 when no parameter provided"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected reading time at 180 WPM
        total_words = data["total_words"]
        expected_reading_time = (total_words / 180) * 60
        actual_reading_time = data["total_reading_time_seconds"]
        
        # Allow small tolerance for rounding
        assert abs(actual_reading_time - expected_reading_time) < 2, \
            f"Default WPM should be 180. Expected ~{expected_reading_time:.2f}s, got {actual_reading_time}s"
        
        print(f"SUCCESS: Default WPM=180 verified - {total_words} words = {actual_reading_time}s")

    def test_slow_reading_speed_150_wpm(self):
        """Test slow reading speed at 150 WPM"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm=150", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected reading time at 150 WPM
        total_words = data["total_words"]
        expected_reading_time = (total_words / 150) * 60
        actual_reading_time = data["total_reading_time_seconds"]
        
        # Allow small tolerance for rounding
        assert abs(actual_reading_time - expected_reading_time) < 2, \
            f"WPM=150 reading time mismatch. Expected ~{expected_reading_time:.2f}s, got {actual_reading_time}s"
        
        print(f"SUCCESS: WPM=150 (Slow) verified - {total_words} words = {actual_reading_time}s")

    def test_normal_reading_speed_180_wpm(self):
        """Test normal reading speed at 180 WPM (explicit parameter)"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm=180", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected reading time at 180 WPM
        total_words = data["total_words"]
        expected_reading_time = (total_words / 180) * 60
        actual_reading_time = data["total_reading_time_seconds"]
        
        # Allow small tolerance for rounding
        assert abs(actual_reading_time - expected_reading_time) < 2, \
            f"WPM=180 reading time mismatch. Expected ~{expected_reading_time:.2f}s, got {actual_reading_time}s"
        
        print(f"SUCCESS: WPM=180 (Normal) verified - {total_words} words = {actual_reading_time}s")

    def test_fast_reading_speed_210_wpm(self):
        """Test fast reading speed at 210 WPM"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm=210", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected reading time at 210 WPM
        total_words = data["total_words"]
        expected_reading_time = (total_words / 210) * 60
        actual_reading_time = data["total_reading_time_seconds"]
        
        # Allow small tolerance for rounding
        assert abs(actual_reading_time - expected_reading_time) < 2, \
            f"WPM=210 reading time mismatch. Expected ~{expected_reading_time:.2f}s, got {actual_reading_time}s"
        
        print(f"SUCCESS: WPM=210 (Fast) verified - {total_words} words = {actual_reading_time}s")

    def test_reading_time_changes_with_wpm(self):
        """Test that reading time changes correctly with different WPM values"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        results = {}
        for wpm in [150, 180, 210]:
            with open(pdf_path, 'rb') as f:
                files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
                response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm={wpm}", files=files)
            
            assert response.status_code == 200
            data = response.json()
            results[wpm] = data["total_reading_time_seconds"]
        
        # Slower WPM should result in longer reading time
        assert results[150] > results[180], \
            f"150 WPM ({results[150]}s) should be slower than 180 WPM ({results[180]}s)"
        assert results[180] > results[210], \
            f"180 WPM ({results[180]}s) should be slower than 210 WPM ({results[210]}s)"
        
        print(f"SUCCESS: Reading times change correctly - 150wpm:{results[150]:.1f}s > 180wpm:{results[180]:.1f}s > 210wpm:{results[210]:.1f}s")


class TestConfigurableAnswerTime:
    """Test configurable answer time (answer_time_seconds) parameter"""
    
    def test_default_answer_time_35(self):
        """Test default answer time is 35 seconds when no parameter provided"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected question time at 35 seconds per question
        total_questions = data["total_questions"]
        expected_question_time = total_questions * 35
        actual_question_time = data["total_question_time_seconds"]
        
        assert actual_question_time == expected_question_time, \
            f"Default answer time should be 35s. Expected {expected_question_time}s, got {actual_question_time}s"
        
        print(f"SUCCESS: Default answer_time=35s verified - {total_questions} questions = {actual_question_time}s")

    def test_custom_answer_time_15(self):
        """Test custom answer time at 15 seconds (minimum)"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?answer_time_seconds=15", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected question time at 15 seconds per question
        total_questions = data["total_questions"]
        expected_question_time = total_questions * 15
        actual_question_time = data["total_question_time_seconds"]
        
        assert actual_question_time == expected_question_time, \
            f"Answer time 15s mismatch. Expected {expected_question_time}s, got {actual_question_time}s"
        
        print(f"SUCCESS: answer_time=15s verified - {total_questions} questions = {actual_question_time}s")

    def test_custom_answer_time_45(self):
        """Test custom answer time at 45 seconds"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?answer_time_seconds=45", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected question time at 45 seconds per question
        total_questions = data["total_questions"]
        expected_question_time = total_questions * 45
        actual_question_time = data["total_question_time_seconds"]
        
        assert actual_question_time == expected_question_time, \
            f"Answer time 45s mismatch. Expected {expected_question_time}s, got {actual_question_time}s"
        
        print(f"SUCCESS: answer_time=45s verified - {total_questions} questions = {actual_question_time}s")

    def test_custom_answer_time_90(self):
        """Test custom answer time at 90 seconds (maximum)"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?answer_time_seconds=90", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected question time at 90 seconds per question
        total_questions = data["total_questions"]
        expected_question_time = total_questions * 90
        actual_question_time = data["total_question_time_seconds"]
        
        assert actual_question_time == expected_question_time, \
            f"Answer time 90s mismatch. Expected {expected_question_time}s, got {actual_question_time}s"
        
        print(f"SUCCESS: answer_time=90s verified - {total_questions} questions = {actual_question_time}s")

    def test_question_time_changes_with_answer_time(self):
        """Test that question time changes correctly with different answer_time values"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        results = {}
        for answer_time in [15, 35, 45, 90]:
            with open(pdf_path, 'rb') as f:
                files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
                response = requests.post(f"{BASE_URL}/api/analyze-pdf?answer_time_seconds={answer_time}", files=files)
            
            assert response.status_code == 200
            data = response.json()
            results[answer_time] = data["total_question_time_seconds"]
        
        # Higher answer time should result in longer total question time
        assert results[15] < results[35], \
            f"15s ({results[15]}s) should be less than 35s ({results[35]}s)"
        assert results[35] < results[45], \
            f"35s ({results[35]}s) should be less than 45s ({results[45]}s)"
        assert results[45] < results[90], \
            f"45s ({results[45]}s) should be less than 90s ({results[90]}s)"
        
        print(f"SUCCESS: Question times change correctly - 15s:{results[15]}s < 35s:{results[35]}s < 45s:{results[45]}s < 90s:{results[90]}s")


class TestCombinedSettings:
    """Test combined wpm and answer_time_seconds parameters"""
    
    def test_combined_slow_reading_long_answer(self):
        """Test slow reading (150 WPM) with long answer time (45s)"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm=150&answer_time_seconds=45", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify reading time at 150 WPM
        total_words = data["total_words"]
        expected_reading_time = (total_words / 150) * 60
        actual_reading_time = data["total_reading_time_seconds"]
        assert abs(actual_reading_time - expected_reading_time) < 2
        
        # Verify question time at 45 seconds
        total_questions = data["total_questions"]
        expected_question_time = total_questions * 45
        actual_question_time = data["total_question_time_seconds"]
        assert actual_question_time == expected_question_time
        
        print(f"SUCCESS: Combined wpm=150, answer_time=45s - reading:{actual_reading_time:.1f}s, questions:{actual_question_time}s")

    def test_combined_fast_reading_short_answer(self):
        """Test fast reading (210 WPM) with short answer time (15s)"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm=210&answer_time_seconds=15", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify reading time at 210 WPM
        total_words = data["total_words"]
        expected_reading_time = (total_words / 210) * 60
        actual_reading_time = data["total_reading_time_seconds"]
        assert abs(actual_reading_time - expected_reading_time) < 2
        
        # Verify question time at 15 seconds
        total_questions = data["total_questions"]
        expected_question_time = total_questions * 15
        actual_question_time = data["total_question_time_seconds"]
        assert actual_question_time == expected_question_time
        
        print(f"SUCCESS: Combined wpm=210, answer_time=15s - reading:{actual_reading_time:.1f}s, questions:{actual_question_time}s")


class TestParameterValidation:
    """Test parameter validation for wpm and answer_time_seconds"""
    
    def test_invalid_wpm_too_low(self):
        """Test that WPM below 100 is rejected"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm=50", files=files)
        
        assert response.status_code == 400, f"Expected 400 for wpm=50, got {response.status_code}"
        print("SUCCESS: WPM below 100 correctly rejected")

    def test_invalid_wpm_too_high(self):
        """Test that WPM above 300 is rejected"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?wpm=400", files=files)
        
        assert response.status_code == 400, f"Expected 400 for wpm=400, got {response.status_code}"
        print("SUCCESS: WPM above 300 correctly rejected")

    def test_invalid_answer_time_too_low(self):
        """Test that answer_time below 10 is rejected"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?answer_time_seconds=5", files=files)
        
        assert response.status_code == 400, f"Expected 400 for answer_time=5, got {response.status_code}"
        print("SUCCESS: answer_time below 10 correctly rejected")

    def test_invalid_answer_time_too_high(self):
        """Test that answer_time above 120 is rejected"""
        pdf_path = "/app/Articulo_50_Humildad.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip(f"Test PDF not found: {pdf_path}")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('Articulo_50_Humildad.pdf', f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/api/analyze-pdf?answer_time_seconds=150", files=files)
        
        assert response.status_code == 400, f"Expected 400 for answer_time=150, got {response.status_code}"
        print("SUCCESS: answer_time above 120 correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
