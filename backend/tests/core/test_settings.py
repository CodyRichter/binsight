import pytest

from app.core.settings import MissingSettingError, load_settings


def test_starting_without_the_app_address_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BINSIGHT_APP_ADDRESS", raising=False)
    with pytest.raises(MissingSettingError, match="BINSIGHT_APP_ADDRESS"):
        load_settings()


def test_the_app_address_is_kept_without_a_trailing_slash(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BINSIGHT_APP_ADDRESS", "https://binsight.example.com/")
    assert load_settings().app_address == "https://binsight.example.com"
