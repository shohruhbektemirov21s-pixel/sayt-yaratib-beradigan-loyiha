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
    return User.objects.create_superuser(email='admin@example.com', password='adminpass')

@pytest.fixture
def regular_user(db):
    return User.objects.create_user(email='user@example.com', password='userpass')

def obtain_jwt_token(client, email, password):
    # Assuming JWT auth endpoint at /api/token/
    response = client.post('/api/token/', {'email': email, 'password': password})
    assert response.status_code == 200
    return response.data['access']

def test_admin_can_access_user_list(api_client, admin_user):
    token = obtain_jwt_token(api_client, admin_user.email, 'adminpass')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    url = reverse('user-list')  # Assuming router basename for User is 'user'
    resp = api_client.get(url)
    assert resp.status_code == 200
    assert isinstance(resp.data, list)

def test_regular_user_cannot_access_user_list(api_client, regular_user):
    token = obtain_jwt_token(api_client, regular_user.email, 'userpass')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    url = reverse('user-list')
    resp = api_client.get(url)
    assert resp.status_code == 403

def test_user_registration(api_client, db):
    url = reverse('register')  # Assuming Register endpoint name
    payload = {
        'email': 'newuser@example.com',
        'password': 'StrongPass123',
        'full_name': 'New User'
    }
    resp = api_client.post(url, payload)
    assert resp.status_code == 201
    assert User.objects.filter(email='newuser@example.com').exists()
