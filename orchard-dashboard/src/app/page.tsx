// orchard-dashboard\src\app\page.tsx

"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const MapView = dynamic(() => import("./components/MapView"), {
  ssr: false,
});

type Prediction = {
  no: number;
  tree_no: string | number;
  latitude: number;
  longitude: number;
  image?: string;
  mango_id?: string | number;
  damage_severity?: number | string;
  damage_cause: string;
  predicted_class: "Low" | "Medium" | "High";
};

type TreeExplanation = {
  tree_id: string;
  predicted_class: string;
  damage_cause: string;
  neighbors: {
    tree_id: string;
    predicted_class: string;
  }[];
  explanations: string[];
};

const API_URL = "http://127.0.0.1:8000/api/upload";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState("All");
  const [error, setError] = useState("");

  const [selectedTree, setSelectedTree] = useState<TreeExplanation | null>(
    null
  );
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSelectedTree(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed.");
      }

      const data = await res.json();
      setPredictions(data.predictions || []);
    } catch (err) {
      console.error(err);
      setError("Failed to process CSV. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (treeId: string | number) => {
    try {
      setLoadingExplanation(true);

      const res = await fetch(
        `http://127.0.0.1:8000/api/tree/${treeId}/explanation`
      );

      const data = await res.json();
      setSelectedTree(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const filteredPredictions = useMemo(() => {
    if (selectedClass === "All") return predictions;
    return predictions.filter((item) => item.predicted_class === selectedClass);
  }, [predictions, selectedClass]);

  const classCounts = useMemo(() => {
    return ["Low", "Medium", "High"].map((label) => ({
      class: label,
      count: predictions.filter((p) => p.predicted_class === label).length,
    }));
  }, [predictions]);

  const causeCounts = useMemo(() => {
    const grouped: Record<string, { cause: string; count: number }> = {};

    predictions.forEach((item) => {
      const cause = item.damage_cause || "Unknown";
      if (!grouped[cause]) {
        grouped[cause] = { cause, count: 0 };
      }
      grouped[cause].count += 1;
    });

    return Object.values(grouped);
  }, [predictions]);

  const highRiskCount = predictions.filter(
    (item) => item.predicted_class === "High"
  ).length;

  const mediumRiskCount = predictions.filter(
    (item) => item.predicted_class === "Medium"
  ).length;

  const lowRiskCount = predictions.filter(
    (item) => item.predicted_class === "Low"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 rounded-3xl bg-slate-950 px-8 py-10 text-white shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-300">
            Knowledge Graph + GNN
          </p>

          <h1 className="text-4xl font-bold">
            Mango Orchard Damage Prediction Dashboard
          </h1>

          <p className="mt-3 max-w-3xl text-slate-300">
            Upload orchard data, run graph neural network predictions, and
            visualize predicted mango damage risk across the orchard.
          </p>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Upload Orchard CSV</h2>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm md:w-auto"
            />

            <button
              onClick={handleUpload}
              disabled={loading}
              className="rounded-lg bg-slate-950 px-6 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Processing..." : "Run Prediction"}
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {file && (
            <p className="mt-3 text-sm text-slate-500">
              Selected file: <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>

        {predictions.length > 0 && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">Total Trees</p>
                <p className="mt-2 text-3xl font-bold">{predictions.length}</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">High Risk</p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {highRiskCount}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">Medium Risk</p>
                <p className="mt-2 text-3xl font-bold text-orange-500">
                  {mediumRiskCount}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow">
                <p className="text-sm text-slate-500">Low Risk</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {lowRiskCount}
                </p>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-bold">
                  Prediction Distribution
                </h2>

                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classCounts}>
                    <XAxis dataKey="class" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-bold">Cause Distribution</h2>

                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={causeCounts}
                      dataKey="count"
                      nameKey="cause"
                      outerRadius={100}
                      label
                    >
                      {causeCounts.map((_, index) => (
                        <Cell key={index} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mb-8 rounded-2xl bg-white p-5 shadow">
              <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-bold">Orchard Risk Map</h2>
                  <p className="text-sm text-slate-500">
                    Click a tree marker to explain its predicted risk.
                  </p>
                </div>

                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="rounded-lg border border-slate-300 p-2 text-sm"
                >
                  <option value="All">All classes</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <MapView
                predictions={filteredPredictions}
                onSelectTree={fetchExplanation}
              />
            </div>

            {loadingExplanation && (
              <div className="mb-8 rounded-2xl bg-white p-6 shadow">
                <p className="text-slate-600">Loading tree explanation...</p>
              </div>
            )}

            {selectedTree && !loadingExplanation && (
              <div className="mb-8 rounded-2xl bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Tree Explanation</h2>
                    <p className="text-sm text-slate-500">
                      Spatial reasoning and neighboring influence
                    </p>
                  </div>

                  <div
                    className={
                      selectedTree.predicted_class === "High"
                        ? "rounded-full bg-red-100 px-4 py-2 font-semibold text-red-700"
                        : selectedTree.predicted_class === "Medium"
                        ? "rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-700"
                        : "rounded-full bg-green-100 px-4 py-2 font-semibold text-green-700"
                    }
                  >
                    {selectedTree.predicted_class}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Tree Information
                    </h3>

                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Tree ID:</strong> {selectedTree.tree_id}
                      </p>

                      <p>
                        <strong>Damage Cause:</strong>{" "}
                        {selectedTree.damage_cause || "Unknown"}
                      </p>
                    </div>

                    <h3 className="mt-6 mb-3 text-lg font-semibold">
                      Explanation
                    </h3>

                    {selectedTree.explanations.length > 0 ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {selectedTree.explanations.map((exp, index) => (
                          <li key={index}>{exp}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No explanation available for this tree.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Neighboring Trees
                    </h3>

                    <div className="max-h-72 space-y-3 overflow-y-auto">
                      {selectedTree.neighbors.length > 0 ? (
                        selectedTree.neighbors.map((neighbor, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                          >
                            <p className="font-medium">
                              Tree {neighbor.tree_id}
                            </p>

                            <p
                              className={
                                neighbor.predicted_class === "High"
                                  ? "font-semibold text-red-600"
                                  : neighbor.predicted_class === "Medium"
                                  ? "font-semibold text-orange-500"
                                  : "font-semibold text-green-600"
                              }
                            >
                              {neighbor.predicted_class}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No neighboring trees found.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="border-b p-5">
                <h2 className="text-xl font-bold">Prediction Results</h2>
                <p className="text-sm text-slate-500">
                  Showing {filteredPredictions.length} tree records.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-200 text-slate-900">
                    <tr>
                      <th className="p-3 text-left">Tree</th>
                      <th className="p-3 text-left">Mango ID</th>
                      <th className="p-3 text-left">Cause</th>
                      <th className="p-3 text-left">Predicted</th>
                      <th className="p-3 text-left">Latitude</th>
                      <th className="p-3 text-left">Longitude</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPredictions.map((item, index) => (
                      <tr
                        key={index}
                        className="border-t border-slate-200"
                        onClick={() => fetchExplanation(item.tree_no)}
                      >
                        <td className="cursor-pointer p-3 font-medium">
                          {item.tree_no}
                        </td>
                        <td className="p-3">{item.mango_id || "—"}</td>
                        <td className="p-3">{item.damage_cause}</td>
                        <td className="p-3 font-semibold">
                          <span
                            className={
                              item.predicted_class === "High"
                                ? "text-red-600"
                                : item.predicted_class === "Medium"
                                ? "text-orange-500"
                                : "text-green-600"
                            }
                          >
                            {item.predicted_class}
                          </span>
                        </td>
                        <td className="p-3">{item.latitude}</td>
                        <td className="p-3">{item.longitude}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}