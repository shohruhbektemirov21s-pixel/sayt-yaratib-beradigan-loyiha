import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    user = User.objects.create_superuser(email="admin@example.com", password="adminpass")
    return user

def test_admin_login(api_client, admin_user):
    # Obtain JWT token (assuming JWT auth endpoint exists at /api/token/)
    response = api_client.post("/api/token/", {"email": admin_user.email, "password": "adminpass"})
    assert response.status_code == 200
    token = response.data.get("access")
    assert token
    # Access admin endpoint (list users)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = api_client.get(reverse("user-list"))  # Assuming router basename for User is 'user'
    # Should be allowed for admin
    assert resp.status_code == 200
