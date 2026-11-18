from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import open_write_session
from tests.builders import AcceptanceHome, acceptance_home


@pytest.fixture
def home(signed_in: TestClient) -> AcceptanceHome:
    app = cast(FastAPI, signed_in.app)
    with open_write_session(app.state.engine) as session:
        return acceptance_home(session)
