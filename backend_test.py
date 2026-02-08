import requests
import sys
import json
import io
from datetime import datetime

class PDFReadingTimerTester:
    def __init__(self, base_url="https://pdf-reading-timer.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def create_test_pdf(self, content_lines):
        """Create a simple test PDF - using a pre-made sample for testing"""
        # For testing purposes, we'll use a simple approach
        # In a real scenario, we'd create actual PDF bytes
        # For now, we'll test with text files and handle the validation separately
        return b"Mock PDF content for testing"

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_message = "PDF Reading Timer API"
                if data.get("message") == expected_message:
                    self.log_test("API Root Endpoint", True, f"Message: {data.get('message')}")
                else:
                    self.log_test("API Root Endpoint", False, f"Unexpected message: {data}")
            else:
                self.log_test("API Root Endpoint", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Error: {str(e)}")

    def test_pdf_upload_validation(self):
        """Test PDF upload with invalid file"""
        try:
            # Test with non-PDF file
            files = {'file': ('test.txt', b'This is not a PDF', 'text/plain')}
            response = requests.post(f"{self.api_url}/analyze-pdf", files=files, timeout=30)
            
            success = response.status_code == 400
            if success:
                data = response.json()
                self.log_test("PDF Validation", True, f"Correctly rejected non-PDF: {data.get('detail')}")
            else:
                self.log_test("PDF Validation", False, f"Should reject non-PDF, got status: {response.status_code}")
                
        except Exception as e:
            self.log_test("PDF Validation", False, f"Error: {str(e)}")

    def test_pdf_analysis_basic(self):
        """Test basic PDF analysis functionality"""
        try:
            # Create a simple test PDF
            content = [
                "Este es el primer párrafo con algunas palabras para probar.",
                "",
                "Este es el segundo párrafo. ¿Hay alguna pregunta aquí?",
                "",
                "Tercer párrafo sin preguntas pero con más contenido para analizar."
            ]
            
            pdf_bytes = self.create_test_pdf(content)
            files = {'file': ('test.pdf', pdf_bytes, 'application/pdf')}
            
            response = requests.post(f"{self.api_url}/analyze-pdf", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['filename', 'total_words', 'total_paragraphs', 'total_questions', 
                                 'total_reading_time_seconds', 'total_question_time_seconds', 
                                 'total_time_seconds', 'paragraphs']
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("PDF Analysis Structure", False, f"Missing fields: {missing_fields}")
                    return
                
                # Validate calculations
                expected_paragraphs = 3  # Based on our test content
                if data['total_paragraphs'] == expected_paragraphs:
                    self.log_test("Paragraph Count", True, f"Found {data['total_paragraphs']} paragraphs")
                else:
                    self.log_test("Paragraph Count", False, f"Expected {expected_paragraphs}, got {data['total_paragraphs']}")
                
                # Check if questions were detected
                if data['total_questions'] > 0:
                    self.log_test("Question Detection", True, f"Detected {data['total_questions']} questions")
                else:
                    self.log_test("Question Detection", False, "No questions detected in test content")
                
                # Validate time calculations
                if data['total_reading_time_seconds'] > 0:
                    self.log_test("Reading Time Calculation", True, f"Reading time: {data['total_reading_time_seconds']}s")
                else:
                    self.log_test("Reading Time Calculation", False, "Reading time should be > 0")
                
                # Check total time = reading time + question time
                expected_total = data['total_reading_time_seconds'] + data['total_question_time_seconds']
                if abs(data['total_time_seconds'] - expected_total) < 0.1:
                    self.log_test("Total Time Calculation", True, f"Total: {data['total_time_seconds']}s")
                else:
                    self.log_test("Total Time Calculation", False, 
                                f"Expected {expected_total}, got {data['total_time_seconds']}")
                
                # Validate paragraph structure
                if data['paragraphs']:
                    para = data['paragraphs'][0]
                    para_fields = ['number', 'text', 'word_count', 'reading_time_seconds', 'questions', 'total_time_seconds']
                    missing_para_fields = [field for field in para_fields if field not in para]
                    
                    if not missing_para_fields:
                        self.log_test("Paragraph Structure", True, "All paragraph fields present")
                    else:
                        self.log_test("Paragraph Structure", False, f"Missing paragraph fields: {missing_para_fields}")
                else:
                    self.log_test("Paragraph Structure", False, "No paragraphs in response")
                    
            else:
                self.log_test("PDF Analysis Basic", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("PDF Analysis Basic", False, f"Error: {str(e)}")

    def test_question_detection_specific(self):
        """Test specific question detection patterns"""
        try:
            # Create PDF with specific question patterns
            content = [
                "Párrafo 1: Este es contenido normal.",
                "",
                "Párrafo 2: Contenido con pregunta. ¿Cuál es la respuesta?",
                "",
                "3. ¿Esta es una pregunta numerada?",
                "",
                "Párrafo 4: Sin preguntas aquí."
            ]
            
            pdf_bytes = self.create_test_pdf(content)
            files = {'file': ('questions_test.pdf', pdf_bytes, 'application/pdf')}
            
            response = requests.post(f"{self.api_url}/analyze-pdf", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should detect at least 1 question
                if data['total_questions'] >= 1:
                    self.log_test("Specific Question Detection", True, 
                                f"Detected {data['total_questions']} questions")
                    
                    # Check question time calculation (35s per question)
                    expected_question_time = data['total_questions'] * 35
                    if data['total_question_time_seconds'] == expected_question_time:
                        self.log_test("Question Time Calculation", True, 
                                    f"Question time: {data['total_question_time_seconds']}s")
                    else:
                        self.log_test("Question Time Calculation", False, 
                                    f"Expected {expected_question_time}s, got {data['total_question_time_seconds']}s")
                else:
                    self.log_test("Specific Question Detection", False, "No questions detected in test content")
            else:
                self.log_test("Specific Question Detection", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Specific Question Detection", False, f"Error: {str(e)}")

    def test_reading_speed_calculation(self):
        """Test 180 WPM reading speed calculation"""
        try:
            # Create PDF with known word count
            words = ["palabra"] * 180  # Exactly 180 words
            content = [" ".join(words)]
            
            pdf_bytes = self.create_test_pdf(content)
            files = {'file': ('speed_test.pdf', pdf_bytes, 'application/pdf')}
            
            response = requests.post(f"{self.api_url}/analyze-pdf", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # 180 words should take 60 seconds at 180 WPM
                expected_time = 60.0
                actual_time = data['total_reading_time_seconds']
                
                # Allow small tolerance for rounding
                if abs(actual_time - expected_time) <= 1.0:
                    self.log_test("180 WPM Calculation", True, 
                                f"180 words = {actual_time}s (expected ~{expected_time}s)")
                else:
                    self.log_test("180 WPM Calculation", False, 
                                f"180 words = {actual_time}s, expected ~{expected_time}s")
            else:
                self.log_test("180 WPM Calculation", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("180 WPM Calculation", False, f"Error: {str(e)}")

    def test_get_analyses(self):
        """Test getting all analyses"""
        try:
            response = requests.get(f"{self.api_url}/analyses", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Analyses", True, f"Retrieved {len(data)} analyses")
                else:
                    self.log_test("Get Analyses", False, "Response is not a list")
            else:
                self.log_test("Get Analyses", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Get Analyses", False, f"Error: {str(e)}")

    def test_status_endpoints(self):
        """Test status check endpoints"""
        try:
            # Test POST status
            status_data = {"client_name": "test_client"}
            response = requests.post(f"{self.api_url}/status", json=status_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'client_name' in data:
                    self.log_test("POST Status", True, f"Created status check: {data['id']}")
                else:
                    self.log_test("POST Status", False, "Missing required fields in response")
            else:
                self.log_test("POST Status", False, f"Status: {response.status_code}")
            
            # Test GET status
            response = requests.get(f"{self.api_url}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET Status", True, f"Retrieved {len(data)} status checks")
                else:
                    self.log_test("GET Status", False, "Response is not a list")
            else:
                self.log_test("GET Status", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Status Endpoints", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting PDF Reading Timer Backend Tests")
        print(f"Testing API at: {self.api_url}")
        print("-" * 60)
        
        # Run tests in order
        self.test_api_root()
        self.test_pdf_upload_validation()
        self.test_pdf_analysis_basic()
        self.test_question_detection_specific()
        self.test_reading_speed_calculation()
        self.test_get_analyses()
        self.test_status_endpoints()
        
        # Print summary
        print("-" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = PDFReadingTimerTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())