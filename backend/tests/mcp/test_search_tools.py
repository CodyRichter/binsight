from tests.builders import AcceptanceHome
from tests.mcp.conftest import Claude

PATH_TO_CABLES = ["Home", "Garage", "Shelf 2", "Cables"]


def test_where_is_the_hdmi_cable_gives_its_full_path_despite_a_typo(
    claude: Claude, home: AcceptanceHome
) -> None:
    found = claude.call("search_home", query="hdmi cabel")
    first = found["results"][0]
    assert (first["kind"], first["item"]["id"]) == ("item", home.hdmi_cable)
    assert [step["name"] for step in first["item"]["path"]] == PATH_TO_CABLES


def test_a_label_code_finds_its_location(claude: Claude, home: AcceptanceHome) -> None:
    first = claude.call("search_home", query="b14")["results"][0]
    assert (first["kind"], first["location"]["id"]) == ("location", home.cables)


def test_a_limit_out_of_bounds_is_refused_in_the_api_s_shape(claude: Claude) -> None:
    assert claude.refusal("search_home", query="hdmi", limit=0)["code"] == "validation_failed"
