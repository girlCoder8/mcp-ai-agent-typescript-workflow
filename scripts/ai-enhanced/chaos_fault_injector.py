import random
import requests

def inject_fault(service_url):
    faults = ['latency', 'http_500', 'connection_drop']
    fault = random.choice(faults)
    response = requests.post(f"{service_url}/inject_fault", json={'fault': fault})
    return response.status_code

if __name__ == "__main__":
    status = inject_fault("http://localhost:5000")
    print(f"Fault injected, status: {status}")
