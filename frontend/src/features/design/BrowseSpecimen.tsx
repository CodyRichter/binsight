import { Button } from "@mantine/core";
import { Link, useParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { DesignFrame } from "./DesignFrame";
import { LocationSpecimen } from "./LocationSpecimen";
import { LocationsSpecimen } from "./LocationsSpecimen";
import { sampleLocation } from "./sampleHome";

export function BrowseSpecimen() {
  const { location: id } = useParams();
  if (id === undefined) return <LocationsSpecimen />;
  const location = sampleLocation(id);
  if (!location) {
    return (
      <DesignFrame parent="/design/browse">
        <title>Binsight</title>
        <EmptyState
          statement={`No location has the address ${id}`}
          action={
            <Button component={Link} to="/design/browse">
              Show all locations
            </Button>
          }
        />
      </DesignFrame>
    );
  }
  return <LocationSpecimen key={location.id} location={location} />;
}
