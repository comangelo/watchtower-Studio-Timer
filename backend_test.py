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
        """Test basic PDF analysis functionality with real PDF"""
        try:
            with open('/app/test_document.pdf', 'rb') as f:
                files = {'file': ('test_document.pdf', f, 'application/pdf')}
                response = requests.post(f"{self.api_url}/analyze-pdf", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['filename', 'total_words', 'total_paragraphs', 'total_questions', 
                                 'total_reading_time_seconds', 'total_question_time_seconds', 
                                 'total_time_seconds', 'fixed_duration', 'paragraphs']
                
                missing_fields = [field for field in required_fields if field not in data]
                if not missing_fields:
                    # Check fixed duration is 3600 seconds (60 minutes)
                    if data['total_time_seconds'] == 3600 and data['fixed_duration']:
                        self.log_test("PDF Analysis Basic", True, f"Analysis successful: {data['total_paragraphs']} paragraphs, {data['total_questions']} questions, 60min fixed duration")
                    else:
                        self.log_test("PDF Analysis Basic", False, f"Fixed duration not 60min: {data['total_time_seconds']}s, fixed: {data['fixed_duration']}")
                else:
                    self.log_test("PDF Analysis Basic", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("PDF Analysis Basic", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("PDF Analysis Basic", False, f"Error: {str(e)}")

    def test_question_detection_specific(self):
        """Test specific question detection patterns with QUE RESPONDERIAS"""
        try:
            with open('/app/test_que_responderias.pdf', 'rb') as f:
                files = {'file': ('test_que_responderias.pdf', f, 'application/pdf')}
                response = requests.post(f"{self.api_url}/analyze-pdf", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should have 3 questions (ignoring QUE RESPONDERIAS)
                expected_questions = 3
                if data['total_questions'] == expected_questions:
                    # Check for final questions
                    final_questions_found = False
                    for paragraph in data['paragraphs']:
                        for question in paragraph['questions']:
                            if question.get('is_final_question', False):
                                final_questions_found = True
                                break
                    
                    if final_questions_found:
                        self.log_test("Specific Question Detection", True, f"Correctly detected {data['total_questions']} questions (ignoring QUE RESPONDERIAS) with final questions marked")
                    else:
                        self.log_test("Specific Question Detection", False, "Final questions not marked correctly")
                else:
                    self.log_test("Specific Question Detection", False, f"Expected {expected_questions} questions, got {data['total_questions']}")
            else:
                self.log_test("Specific Question Detection", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Specific Question Detection", False, f"Error: {str(e)}")

    def test_reading_speed_calculation(self):
        """Test 180 WPM reading speed calculation"""
        try:
            with open('/app/test_document.pdf', 'rb') as f:
                files = {'file': ('test_document.pdf', f, 'application/pdf')}
                response = requests.post(f"{self.api_url}/analyze-pdf", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Calculate expected reading time: words / 180 WPM * 60 seconds
                expected_reading_time = (data['total_words'] / 180) * 60
                actual_reading_time = data['total_reading_time_seconds']
                
                # Allow 1 second tolerance
                if abs(expected_reading_time - actual_reading_time) <= 1:
                    self.log_test("180 WPM Calculation", True, f"Correct calculation: {data['total_words']} words = {actual_reading_time:.1f}s at 180 WPM")
                else:
                    self.log_test("180 WPM Calculation", False, f"Calculation error: expected {expected_reading_time:.1f}s, got {actual_reading_time}s")
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