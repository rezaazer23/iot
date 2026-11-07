
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SensorRow = {
  id?: number | string;
  created_at?: string;
  device_id?: string;
  temperature?: number | string | null;
  distance?: number | string | null;
  water_level?: number | string | null;
  humidity?: number | string | null;
};

const TANK_EMPTY_DISTANCE = 10.7;
const TANK_FULL_DISTANCE = 3.07;
const TANK_AREA = 44.18;
const TANK_HEIGHT = TANK_EMPTY_DISTANCE - TANK_FULL_DISTANCE;

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function getLevel(row?: SensorRow): number | null {
  if (!row) return null;

  const savedLevel = numberValue(row.water_level);

  if (savedLevel !== null && savedLevel >= 0 && savedLevel <= 100) {
    return savedLevel;
  }

  const distance = numberValue(row.distance);

  if (
    distance === null ||
    distance < TANK_FULL_DISTANCE ||
    distance > TANK_EMPTY_DISTANCE
  ) {
    return null;
  }

  const level =
    ((TANK_EMPTY_DISTANCE - distance) / TANK_HEIGHT) * 100;

  return Math.max(0, Math.min(100, level));
}

function formatValue(value: number | null, suffix = "") {
  return value === null ? "--" : `${value.toFixed(1)}${suffix}`;
}

function formatTime(value?: string) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Home() {
  const [rows, setRows] = useState<SensorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastChecked, setLastChecked] = useState("");

  async function loadSensorData() {
    try {
      const { data, error } = await supabase
        .from("Sensor_Data")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      const sensorRows = (data ?? []) as SensorRow[];

      setRows(sensorRows);
      setOnline(sensorRows.length > 0);
      setErrorMessage("");
      setLastChecked(new Date().toISOString());
    } catch (error: unknown) {
      console.error("Supabase error:", error);

      setOnline(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal membaca data Supabase"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSensorData();

    const interval = setInterval(loadSensorData, 5000);

    return () => clearInterval(interval);
  }, []);

  const latest = rows[0];

  const temperature = numberValue(latest?.temperature);
  const distance = numberValue(latest?.distance);
  const humidity = numberValue(latest?.humidity);
  const waterLevel = getLevel(latest);

  const volume =
    waterLevel === null
      ? null
      : (waterLevel / 100) * TANK_HEIGHT * TANK_AREA;

  const status =
    waterLevel === null
      ? "DATA TIDAK VALID"
      : waterLevel <= 40
        ? "LEVEL RENDAH"
        : waterLevel >= 90
          ? "LEVEL TINGGI"
          : "NORMAL";

  const statusColor =
    waterLevel === null
      ? "text-slate-400"
      : waterLevel <= 40
        ? "text-red-400"
        : waterLevel >= 90
          ? "text-amber-400"
          : "text-emerald-400";

  const chartRows = useMemo(
    () => [...rows].reverse(),
    [rows]
  );

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl p-5 md:p-8">

        {/* HEADER */}
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-700 pb-6 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-[0.3em] text-cyan-400">
              INTERNET OF THINGS
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              IOT <span className="text-cyan-400">DOSTAM</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Monitoring Level dan Temperatur Tangki Air
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-[#101e30] px-5 py-3">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  online ? "animate-pulse bg-emerald-400" : "bg-red-400"
                }`}
              />
              <div>
                <p className="text-xs text-slate-400">Database Status</p>
                <p className={`font-bold ${online ? "text-emerald-400" : "text-red-400"}`}>
                  {loading ? "CONNECTING..." : online ? "CONNECTED" : "OFFLINE"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ERROR */}
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <p className="font-bold text-red-400">Koneksi Supabase bermasalah</p>
            <p className="mt-1 break-words text-sm text-red-200">
              {errorMessage}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Periksa URL, Publishable Key, nama tabel, dan kebijakan SELECT
              pada Supabase.
            </p>
          </div>
        )}

        {/* SENSOR CARDS */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <SensorCard
            title="Temperature"
            value={formatValue(temperature, " °C")}
            description="Suhu terukur"
            icon="🌡️"
            color="cyan"
          />

          <SensorCard
            title="Water Level"
            value={formatValue(waterLevel, " %")}
            description="Persentase ketinggian air"
            icon="💧"
            color="blue"
          />

          <SensorCard
            title="Distance"
            value={formatValue(distance, " cm")}
            description="Jarak sensor ke permukaan air"
            icon="📏"
            color="purple"
          />

          <SensorCard
            title="Humidity"
            value={formatValue(humidity, " %")}
            description="Kelembapan (jika tersedia)"
            icon="☁️"
            color="amber"
          />
        </section>

        {/* MAIN CONTENT */}
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* TANK */}
          <div className="rounded-2xl border border-slate-700 bg-[#101e30] p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold">Visualisasi Tangki</h2>
              <p className="text-sm text-slate-400">
                Kondisi level air secara real-time
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative h-64 w-40 overflow-hidden rounded-b-3xl rounded-t-xl border-4 border-slate-500 bg-slate-800/70">
                {waterLevel !== null && (
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-700 to-cyan-400 transition-all duration-700"
                    style={{ height: `${waterLevel}%` }}
                  >
                    <div className="absolute -top-1 h-2 w-full rounded-full bg-cyan-200/70" />
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-lg bg-[#07111f]/80 px-3 py-2 text-2xl font-bold">
                    {formatValue(waterLevel, "%")}
                  </span>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-xs text-slate-400">STATUS TANGKI</p>
                <p className={`mt-1 text-lg font-bold ${statusColor}`}>
                  {status}
                </p>
              </div>
            </div>
          </div>

          {/* INFORMATION */}
          <div className="rounded-2xl border border-slate-700 bg-[#101e30] p-6 lg:col-span-2">
            <h2 className="text-lg font-bold">Informasi Sistem</h2>
            <p className="mb-6 text-sm text-slate-400">
              Informasi pembacaan sensor terakhir
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoItem label="Device ID" value={latest?.device_id ?? "--"} />
              <InfoItem label="Volume Air" value={formatValue(volume, " cm³")} />
              <InfoItem label="Jarak Sensor" value={formatValue(distance, " cm")} />
              <InfoItem label="Temperatur" value={formatValue(temperature, " °C")} />
              <InfoItem label="Data Terakhir" value={formatTime(latest?.created_at)} />
              <InfoItem label="Pemeriksaan Dashboard" value={formatTime(lastChecked)} />
            </div>

            <div className="mt-6 rounded-xl border border-slate-700 bg-[#07111f] p-4">
              <p className="text-xs text-slate-400">KETERANGAN</p>
              <p className="mt-2 text-sm text-slate-300">
                Dashboard mengambil data dari tabel Sensor_Data setiap 5
                detik. Perhitungan level air dilakukan dari water_level
                atau jarak sensor jika nilainya berada dalam rentang kalibrasi.
              </p>
            </div>
          </div>
        </section>

        {/* CHART */}
        <section className="mt-6 rounded-2xl border border-slate-700 bg-[#101e30] p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold">Riwayat Pembacaan Sensor</h2>
            <p className="text-sm text-slate-400">
              Maksimal 30 data terakhir dari Supabase
            </p>
          </div>

          {chartRows.length > 0 ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-cyan-400">Temperature (°C)</p>
                <div className="flex h-28 items-end gap-1 overflow-hidden">
                  {chartRows.map((row, index) => {
                    const value = numberValue(row.temperature);
                    const height =
                      value === null
                        ? 0
                        : Math.max(4, Math.min(100, (value / 100) * 100));

                    return (
                      <div
                        key={row.id ?? index}
                        title={`${formatValue(value, " °C")} - ${formatTime(row.created_at)}`}
                        className="min-w-1 flex-1 rounded-t bg-cyan-400/80 transition-all hover:bg-cyan-300"
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-blue-400">Water Level (%)</p>
                <div className="flex h-28 items-end gap-1 overflow-hidden">
                  {chartRows.map((row, index) => {
                    const value = getLevel(row);

                    return (
                      <div
                        key={row.id ?? index}
                        title={`${formatValue(value, "%")} - ${formatTime(row.created_at)}`}
                        className="min-w-1 flex-1 rounded-t bg-blue-500/80 transition-all hover:bg-blue-400"
                        style={{ height: `${value ?? 0}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              {loading ? "Memuat data sensor..." : "Belum ada data sensor."}
            </div>
          )}
        </section>

        {/* DATA TABLE */}
        <section className="mt-6 rounded-2xl border border-slate-700 bg-[#101e30] p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Data Sensor</h2>
              <p className="text-sm text-slate-400">
                Data terbaru yang tersimpan di database
              </p>
            </div>

            <button
              onClick={loadSensorData}
              className="rounded-lg border border-cyan-500/50 px-4 py-2 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/10"
            >
              ↻ Refresh Data
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                  <th className="px-3 py-4">No.</th>
                  <th className="px-3 py-4">Waktu</th>
                  <th className="px-3 py-4">Device ID</th>
                  <th className="px-3 py-4">Temperature</th>
                  <th className="px-3 py-4">Distance</th>
                  <th className="px-3 py-4">Water Level</th>
                  <th className="px-3 py-4">Humidity</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id ?? index}
                    className="border-b border-slate-800 transition hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-4 text-slate-400">{index + 1}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-slate-300">
                      {formatTime(row.created_at)}
                    </td>
                    <td className="px-3 py-4 text-cyan-400">
                      {row.device_id ?? "--"}
                    </td>
                    <td className="px-3 py-4">
                      {formatValue(numberValue(row.temperature), " °C")}
                    </td>
                    <td className="px-3 py-4">
                      {formatValue(numberValue(row.distance), " cm")}
                    </td>
                    <td className="px-3 py-4">
                      {formatValue(getLevel(row), " %")}
                    </td>
                    <td className="px-3 py-4">
                      {formatValue(numberValue(row.humidity), " %")}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      {loading ? "Memuat data..." : "Tidak ada data yang terbaca."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          IOT DOSTAM · Monitoring Level dan Temperatur Tangki Air
        </footer>
      </div>
    </main>
  );
}

function SensorCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-500/30 text-cyan-400",
    blue: "border-blue-500/30 text-blue-400",
    purple: "border-purple-500/30 text-purple-400",
    amber: "border-amber-500/30 text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#101e30] p-5 transition hover:-translate-y-1 hover:border-cyan-500/40">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>

      <p className={`mt-5 text-3xl font-bold ${colors[color]}`}>
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#07111f] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
