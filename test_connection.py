"""
Simple test script to verify frontend-backend connection
"""

import requests
import time

def test_backend_health():
    """Test if backend is running and healthy"""
    try:
        response = requests.get('http://localhost:8000/health')
        if response.status_code == 200:
            print("✅ Backend is running and healthy")
            return True
        else:
            print(f"❌ Backend health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running or not accessible")
        return False

def test_cors():
    """Test CORS configuration"""
    try:
        response = requests.options('http://localhost:8000/api/v1/routes/estimate', 
                                 headers={'Origin': 'http://localhost:3000'})
        if 'access-control-allow-origin' in response.headers:
            print("✅ CORS is properly configured")
            return True
        else:
            print("❌ CORS is not properly configured")
            return False
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
        return False

def test_route_estimation():
    """Test route estimation endpoint"""
    try:
        payload = {
            "user_id": "test_user",
            "pickup": {"lat": 12.9716, "lng": 77.5946},
            "dropoff": {"lat": 12.9352, "lng": 77.6245},
            "stops": [],
            "optimize_for": "time",
            "algorithm": "auto",
            "async_mode": False
        }
        
        response = requests.post('http://localhost:8000/api/v1/routes/estimate', 
                               json=payload,
                               headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            print("✅ Route estimation endpoint is working")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Route estimation failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Route estimation test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Cab Route Estimator Connection...")
    print("=" * 50)
    
    # Wait a moment for services to start
    time.sleep(2)
    
    # Run tests
    backend_ok = test_backend_health()
    cors_ok = test_cors() if backend_ok else False
    route_ok = test_route_estimation() if backend_ok else False
    
    print("\n" + "=" * 50)
    if backend_ok and cors_ok and route_ok:
        print("🎉 All tests passed! Frontend and backend are properly connected.")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")