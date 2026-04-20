import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from unittest import mock

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(email='admin@example.com', password='adminpass')

def obtain_jwt_token(client, email, password):
    response = client.post('/api/token/', {'email': email, 'password': password})
    assert response.status_code == 200
    return response.data['access']

@mock.patch('apps.website_projects.views.GeminiService')
def test_generate_website_success(mock_gemini, api_client, admin_user, db):
    # Mock Gemini service response
    mock_instance = mock_gemini.return_value
    mock_instance.generate_blueprint.return_value = {'pages': [], 'assets': []}

    token = obtain_jwt_token(api_client, admin_user.email, 'adminpass')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    url = reverse('project-generate')  # Assuming route name
    payload = {
        'title': 'Test Project',
        'prompt': 'Create a futuristic landing page',
        'language': 'en'
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == 201
    assert 'blueprint' in response.data

@mock.patch('apps.website_projects.views.GeminiService')
def test_generate_website_rate_limit(mock_gemini, api_client, admin_user, db):
    # Simulate Gemini Service raising a rate‑limit exception
    mock_instance = mock_gemini.return_value
    mock_instance.generate_blueprint.side_effect = Exception('PROVIDER_QUOTA')

    token = obtain_jwt_token(api_client, admin_user.email, 'adminpass')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    url = reverse('project-generate')
    payload = {
        'title': 'Rate limit test',
        'prompt': 'test',
        'language': 'en'
    }
    response = api_client.post(url, payload, format='json')
    # Expected to return 500 with proper error message
    assert response.status_code == 500
    assert response.data['detail'] == 'AI generation failed.'
