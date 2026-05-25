//orchard-dashboard\src\app\components\MapView.tsx 

"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

type Prediction = {
  tree_no: string | number;
  latitude: number;
  longitude: number;
  damage_cause: string;
  predicted_class: string;
};

type Props = {
  predictions: Prediction[];
  onSelectTree: (treeId: string | number) => void;
};

export default function MapView({
  predictions,
  onSelectTree,
}: Props) {
  if (!predictions.length) return null;

  const center: [number, number] = [
    Number(predictions[0].latitude),
    Number(predictions[0].longitude),
  ];

  const getColor = (value: string) => {
    if (value === "High") return "red";
    if (value === "Medium") return "orange";
    return "green";
  };

  return (
    <div className="h-[500px] rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={17}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {predictions.map((item, index) => (
          <CircleMarker
            key={index}
            center={[
              Number(item.latitude),
              Number(item.longitude),
            ]}
            radius={10}
            pathOptions={{
              color: getColor(item.predicted_class),
              fillColor: getColor(item.predicted_class),
              fillOpacity: 0.8,
            }}
            eventHandlers={{
              click: () => {
                onSelectTree(item.tree_no);
              },
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p>
                  <strong>Tree:</strong> {item.tree_no}
                </p>

                <p>
                  <strong>Prediction:</strong>{" "}
                  {item.predicted_class}
                </p>

                <p>
                  <strong>Cause:</strong>{" "}
                  {item.damage_cause}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}