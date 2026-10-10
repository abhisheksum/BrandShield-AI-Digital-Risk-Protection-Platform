import pytest

from app.api.auth import require_auth
from app.main import app
from app.models.user import User


@pytest.fixture(autouse=True)
def test_organisation_authentication():
    """Give legacy route tests an authenticated test organisation."""
    app.dependency_overrides[require_auth] = lambda: User(
        id=1,
        email="test-organisation@example.test",
        organisation_name="Test Organisation",
        hashed_password="not-used",
    )
    yield
    app.dependency_overrides.pop(require_auth, None)
