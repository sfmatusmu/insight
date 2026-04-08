import requests

data = {
    "email": "test-email-service@test.com",
    "username": "testmailer",
    "password": "PasswordSecreta123",
    "nombres": "Homero",
    "apellidoPaterno": "Simpson",
    "apellidoMaterno": "",
    "id_rol": 2
}

try:
    r = requests.post("http://localhost:8000/api/v1/users/", json=data)
    print("Status:", r.status_code)
    print("Body:", r.text)
except Exception as e:
    import urllib.request, json
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/users/",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        print("Status", response.status)
        print("Body", response.read().decode("utf-8"))
