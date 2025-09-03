"use client";
import React, { useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Shipment = any; // use your server type if available

export default function StrategyStyleBrokerage() {
  // Data state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Load modal state
  const [openNewLoad, setOpenNewLoad] = useState(false);

  const [loadForm, setLoadForm] = useState({
    company: "",
    loadNumber: "",
    customerId: "",
    trailerNo: "",
    trailerType: "Dry Van",
    trailerLength: "53'",
    temperature: "NA",
    poNumber: "",
    bol: "",
    commodity: "",
    billableMode: "Miler" as "Miler" | "Manual",
    billableManual: "",
    chargeType: "Mile",
    chargeAmount: "",
    weightLbs: "",
    qty: "",
    qtyUnit: "",
  });

  type StopRow = {
    id: string;
    type: "Load" | "Unload";
    stopName: string;
    city: string;
    qualifier: "Appointment" | "Open" | "FCFS" | "";
    date: string; // yyyy-mm-dd
    time: string; // hh:mm
    locationId: string; // required by your API
  };

  const [stopRows, setStopRows] = useState<StopRow[]>([
    {
      id: crypto.randomUUID(),
      type: "Load",
      stopName: "",
      city: "",
      qualifier: "Appointment",
      date: "",
      time: "",
      locationId: "",
    },
    {
      id: crypto.randomUUID(),
      type: "Unload",
      stopName: "",
      city: "",
      qualifier: "Appointment",
      date: "",
      time: "",
      locationId: "",
    },
  ]);

  // Fetch grid
  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${apiBase}/api/shipments`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setShipments(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Helpers for modal
  function addStopRow() {
    setStopRows((r) => [
      ...r,
      {
        id: crypto.randomUUID(),
        type: "Load",
        stopName: "",
        city: "",
        qualifier: "Appointment",
        date: "",
        time: "",
        locationId: "",
      },
    ]);
  }
  function removeStopRow(id: string) {
    setStopRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  }
  function dtOrNull(d: string, t: string) {
    if (!d) return null;
    const when = t ? `${d}T${t}:00` : `${d}T00:00:00`;
    const v = new Date(when);
    return isNaN(v.getTime()) ? null : v.toISOString();
  }
  async function submitNewLoad() {
    const loads = stopRows.filter((s) => s.type === "Load");
    const unloads = stopRows.filter((s) => s.type === "Unload");
    const hasLocIds = stopRows.every((s) => !!s.locationId);

    if (!loadForm.customerId) return alert("Customer ID is required.");
    if (loads.length === 0 || unloads.length === 0)
      return alert("Need at least one Load and one Unload stop.");
    if (!hasLocIds) return alert("Each stop needs a Location ID.");

    const stops = stopRows.map((s, i) => ({
      sequence: i + 1,
      type: s.type === "Load" ? "PICKUP" : "DELIVERY",
      locationId: s.locationId,
      windowStart: dtOrNull(s.date, s.time),
      notes:
        [
          s.stopName && `Stop:${s.stopName}`,
          s.city && `City:${s.city}`,
          s.qualifier && `Qual:${s.qualifier}`,
          loadForm.poNumber && `PO:${loadForm.poNumber}`,
          loadForm.bol && `BOL:${loadForm.bol}`,
          loadForm.commodity && `Commodity:${loadForm.commodity}`,
          loadForm.weightLbs && `Weight:${loadForm.weightLbs}${loadForm.qtyUnit ? " " + loadForm.qtyUnit : ""}`,
        ]
          .filter(Boolean)
          .join(" | ") || null,
    }));

    const body = {
      customerId: loadForm.customerId,
      reference: loadForm.loadNumber || undefined, // Load #
      stops,
    };

    const r = await fetch(`${apiBase}/api/shipments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      alert(`Create failed: ${r.status}\n${text}`);
      return;
    }

    setOpenNewLoad(false);
    // Minimal reset
    setLoadForm((f) => ({ ...f, loadNumber: "" }));
    setStopRows((rows) =>
      rows.map((x, i) => ({
        ...x,
        stopName: "",
        city: "",
        date: "",
        time: "",
        locationId: i === 0 ? x.locationId : "",
      }))
    );
    await refresh();
  }

  const navy = "#0b4f8a";

  return (
    <div className="min-h-screen bg-[#eef3f8] text-[13px] text-gray-900">
      {/* Top menu */}
      <nav style={{ background: navy }} className="text-white">
        <div className="max-w-6xl mx-auto px-4">
          <ul className="flex gap-6 h-10 items-center">
            <li className="font-semibold">Operations</li>
            <li>Fuel</li>
            <li>Logs</li>
            <li>EDI</li>
            <li>Maintenance</li>
            <li>Safety</li>
            <li>Help</li>
            <li className="ml-auto opacity-90">Profile ▾</li>
          </ul>
        </div>
      </nav>

      {/* Map + Update + New Load */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 h-40 bg-white border rounded grid place-items-center">
            <div className="text-gray-500">Map (placeholder)</div>
          </div>
          <div className="flex items-start justify-end gap-2">
            <button
              onClick={() => setOpenNewLoad(true)}
              className="h-9 px-3 border rounded bg-white hover:bg-gray-50"
            >
              New Load
            </button>
            <button
              onClick={refresh}
              className="h-9 px-3 border rounded bg-white hover:bg-gray-50"
              title="Refresh grid"
            >
              Update Screen
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-2 text-[12px] font-medium">
          {["My Fleet", "Loads", "Brokerage", "Tractors", "Trailers", "Drivers", "Carriers"].map(
            (t) => (
              <div
                key={t}
                className={`px-3 py-1.5 border-t border-l border-r rounded-t ${
                  t === "Brokerage" ? "bg-white" : "bg-[#d8e6f5] text-gray-700"
                }`}
                style={t === "Brokerage" ? { borderColor: navy } : {}}
              >
                {t}
              </div>
            )
          )}
        </div>
      </div>

      {/* Brokerage grid */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="border rounded-b bg-white overflow-auto">
          {error && (
            <div className="p-3 text-red-700 bg-red-50 border-b border-red-200">{error}</div>
          )}
          {loading ? (
            <div className="p-4 text-gray-600">Loading…</div>
          ) : (
            <table className="w-full border-collapse">
              <thead style={{ background: navy }} className="text-white">
                <tr>
                  {[
                    "Load #",
                    "PO #",
                    "Carrier Tractor",
                    "Carrier Trailer",
                    "Carrier Driver",
                    "Carrier Driver Phone",
                    "Carrier",
                    "Customer",
                    "Pickup",
                    "Appointment",
                    "P/U Completed",
                    "Deliver",
                    "Deliver Date",
                    "Last Known Location",
                    "ETA",
                  ].map((h) => (
                    <th key={h} className="text-left py-2 px-3 border-b border-[#0b4f8a]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map((s: Shipment, i: number) => {
                  const pickup = (s.stops || []).find((st: any) => st.sequence === 1);
                  const delivery = (s.stops || []).find((st: any) => st.type === "DELIVERY");
                  const deliverDate =
                    delivery?.windowEnd || delivery?.windowStart || null;
                  const overdue =
                    deliverDate
                      ? new Date(deliverDate) < new Date() && s.status !== "DELIVERED"
                      : false;

                  return (
                    <tr key={s.id} className={i % 2 ? "bg-[#f7fbff]" : "bg-white"}>
                      <td className="py-2 px-3 underline text-blue-700">
                        <a href="#" onClick={(e) => e.preventDefault()} title={s.id}>
                          {s.reference || s.id.slice(0, 6)}
                        </a>
                      </td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">—</td>
                      <td className="py-2 px-3">{s.carrierAssignment?.carrier?.name ?? "—"}</td>
                      <td className="py-2 px-3">{s.customer?.name || s.customerId}</td>
                      <td className="py-2 px-3">{pickup?.locationId ?? "—"}</td>
                      <td className="py-2 px-3">{fmtDT(pickup?.windowStart) || "—"}</td>
                      <td className="py-2 px-3">{fmtDT(pickup?.windowEnd) || "—"}</td>
                      <td className="py-2 px-3">{delivery?.locationId ?? "—"}</td>
                      <td className="py-2 px-3">
                        {deliverDate ? (
                          <span className={overdue ? "text-red-600 font-semibold" : ""}>
                            {fmtDT(deliverDate)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span title="Last ping" className="inline-flex items-center gap-1">
                          <span className="inline-block w-4 h-4 rounded-full bg-[#5aa1e3] border" />
                          {delivery?.locationId ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3">{etaFrom(deliverDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* NEW LOAD MODAL */}
      {openNewLoad && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center">
          <div className="bg-white w-[980px] max-w-[95vw] rounded shadow-lg border overflow-hidden">
            {/* Title Bar */}
            <div className="px-4 py-2 text-white text-sm" style={{ background: navy }}>
              <div className="flex items-center gap-3">
                <span className="font-semibold">Load</span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setOpenNewLoad(false)}
                    className="px-2 py-0.5 bg-white/20 rounded hover:bg-white/30"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-3 space-y-2 text-[13px]">
              {/* Row 1 */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <label className="block text-gray-600">Company</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={loadForm.company}
                    onChange={(e) => setLoadForm({ ...loadForm, company: e.target.value })}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-gray-600">Trailer #</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={loadForm.trailerNo}
                    onChange={(e) => setLoadForm({ ...loadForm, trailerNo: e.target.value })}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-gray-600">Trailer Type/Length</label>
                  <div className="flex gap-2">
                    <select
                      className="border rounded px-2 py-1 w-full"
                      value={loadForm.trailerType}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, trailerType: e.target.value })
                      }
                    >
                      <option>Dry Van</option>
                      <option>Reefer</option>
                      <option>Flatbed</option>
                    </select>
                    <select
                      className="border rounded px-2 py-1 w-24"
                      value={loadForm.trailerLength}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, trailerLength: e.target.value })
                      }
                    >
                      <option>53'</option>
                      <option>48'</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <label className="block text-gray-600">Load Number</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={loadForm.loadNumber}
                    onChange={(e) =>
                      setLoadForm({ ...loadForm, loadNumber: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-gray-600">Customer (ID)</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    placeholder="cmf... (from Prisma Studio)"
                    value={loadForm.customerId}
                    onChange={(e) =>
                      setLoadForm({ ...loadForm, customerId: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-gray-600">Temperature</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={loadForm.temperature}
                    onChange={(e) =>
                      setLoadForm({ ...loadForm, temperature: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <label className="block text-gray-600">PO Number</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={loadForm.poNumber}
                    onChange={(e) =>
                      setLoadForm({ ...loadForm, poNumber: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-gray-600">Bill of Lading</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={loadForm.bol}
                    onChange={(e) => setLoadForm({ ...loadForm, bol: e.target.value })}
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-gray-600">Commodity</label>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={loadForm.commodity}
                    onChange={(e) =>
                      setLoadForm({ ...loadForm, commodity: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Row 4 (Billable / Charge / Qty / Weight) */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <label className="block text-gray-600">Billable Miles</label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="billable"
                        checked={loadForm.billableMode === "Miler"}
                        onChange={() =>
                          setLoadForm({ ...loadForm, billableMode: "Miler" })
                        }
                      />
                      <span>Miler</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name="billable"
                        checked={loadForm.billableMode === "Manual"}
                        onChange={() =>
                          setLoadForm({ ...loadForm, billableMode: "Manual" })
                        }
                      />
                      <span>Manual</span>
                    </label>
                    <input
                      className="border rounded px-2 py-1 w-24"
                      placeholder="mi"
                      disabled={loadForm.billableMode !== "Manual"}
                      value={loadForm.billableManual}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, billableManual: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="col-span-4">
                  <label className="block text-gray-600">Charge</label>
                  <div className="flex gap-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={loadForm.chargeType}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, chargeType: e.target.value })
                      }
                    >
                      <option>Mile</option>
                      <option>Flat</option>
                    </select>
                    <input
                      className="border rounded px-2 py-1 w-28"
                      placeholder="$"
                      value={loadForm.chargeAmount}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, chargeAmount: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="col-span-4">
                  <label className="block text-gray-600">Weight / Quantity</label>
                  <div className="flex gap-2">
                    <input
                      className="border rounded px-2 py-1 w-28"
                      placeholder="lbs"
                      value={loadForm.weightLbs}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, weightLbs: e.target.value })
                      }
                    />
                    <input
                      className="border rounded px-2 py-1 w-20"
                      placeholder="Qty"
                      value={loadForm.qty}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, qty: e.target.value })
                      }
                    />
                    <input
                      className="border rounded px-2 py-1 w-24"
                      placeholder="Unit"
                      value={loadForm.qtyUnit}
                      onChange={(e) =>
                        setLoadForm({ ...loadForm, qtyUnit: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Stops Grid */}
              <div className="mt-2 border rounded">
                <div
                  className="px-2 py-1 text-white text-[12px]"
                  style={{ background: navy }}
                >
                  Stops
                </div>
                <div className="p-2">
                  <div className="grid grid-cols-12 gap-2 font-semibold text-[12px] mb-1">
                    <div className="col-span-2">Type</div>
                    <div className="col-span-3">Stop Name</div>
                    <div className="col-span-2">City, ST</div>
                    <div className="col-span-2">Qualifier</div>
                    <div className="col-span-2">Date / Time</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>

                  {stopRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 mb-1">
                      <div className="col-span-2">
                        <select
                          className="w-full border rounded px-2 py-1"
                          value={row.type}
                          onChange={(e) =>
                            setStopRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id
                                  ? { ...r, type: e.target.value as StopRow["type"] }
                                  : r
                              )
                            )
                          }
                        >
                          <option>Load</option>
                          <option>Unload</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          className="w-full border rounded px-2 py-1"
                          placeholder="Warehouse / Consignee"
                          value={row.stopName}
                          onChange={(e) =>
                            setStopRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id ? { ...r, stopName: e.target.value } : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          className="w-full border rounded px-2 py-1"
                          placeholder="City, ST"
                          value={row.city}
                          onChange={(e) =>
                            setStopRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id ? { ...r, city: e.target.value } : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          className="w-full border rounded px-2 py-1"
                          value={row.qualifier}
                          onChange={(e) =>
                            setStopRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      qualifier: e.target
                                        .value as StopRow["qualifier"],
                                    }
                                  : r
                              )
                            )
                          }
                        >
                          <option>Appointment</option>
                          <option>Open</option>
                          <option>FCFS</option>
                          <option value="">—</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <input
                          type="date"
                          className="border rounded px-2 py-1 w-full"
                          value={row.date}
                          onChange={(e) =>
                            setStopRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id ? { ...r, date: e.target.value } : r
                              )
                            )
                          }
                        />
                        <input
                          type="time"
                          className="border rounded px-2 py-1 w-full"
                          value={row.time}
                          onChange={(e) =>
                            setStopRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id ? { ...r, time: e.target.value } : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={() => removeStopRow(row.id)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Location ID row (required for your API) */}
                      <div className="col-span-12 -mt-1 mb-2">
                        <input
                          className="w-full border rounded px-2 py-1"
                          placeholder="Location ID (required) — e.g., cmf2ye9020002112n49evyvxn"
                          value={row.locationId}
                          onChange={(e) =>
                            setStopRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id
                                  ? { ...r, locationId: e.target.value }
                                  : r
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}

                  <div className="mt-2">
                    <button
                      className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50"
                      onClick={addStopRow}
                    >
                      + Add Stop
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50"
                  onClick={() => setOpenNewLoad(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50"
                  onClick={addStopRow}
                >
                  Create and New
                </button>
                <button
                  className="px-3 py-1.5 rounded text-white"
                  style={{ background: navy }}
                  onClick={submitNewLoad}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDT(v?: string | null) {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "";
  }
}
function etaFrom(deliverDate?: string | null) {
  if (!deliverDate) return "—";
  const dt = new Date(deliverDate);
  return dt.toLocaleString();
}
