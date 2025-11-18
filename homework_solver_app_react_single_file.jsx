// HomeworkSolverApp.jsx
// Single-file React component (default export) ready for preview.
// Tailwind CSS classes are used for styling (no import required in canvas preview).
// How to run in a local project:
// 1. Create a React app (Vite or Create React App).
// 2. Install and enable Tailwind CSS (or replace classes with your own CSS).
// 3. Drop this file as `App.jsx` and import it in `main.jsx`.

import React, { useEffect, useState } from "react";

const SOLVER_CAPACITY = 5;
const SOLVERS = [
  { id: 1, name: "Solver A" },
  { id: 2, name: "Solver B" },
];

export default function App() {
  const [orders, setOrders] = useState([]); // all orders
  const [queue, setQueue] = useState([]); // waiting queue (paid but no available solver)
  const [form, setForm] = useState({
    studentName: "",
    subject: "",
    description: "",
    phone: "",
    deadline: "",
  });
  const [solversState, setSolversState] = useState(
    SOLVERS.map((s) => ({ ...s, assigned: [] }))
  );

  useEffect(() => {
    // try to assign queued orders whenever solvers change or queue changes
    tryAssignFromQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solversState, queue]);

  function validateForm() {
    if (!form.studentName.trim()) return "Student name is required.";
    if (!form.subject.trim()) return "Subject is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    // basic phone validation: digits, length between 7 and 15
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return "Phone number looks invalid.";
    if (!form.deadline) return "Deadline is required.";
    const dl = new Date(form.deadline);
    if (Number.isNaN(dl.getTime())) return "Deadline is invalid.";
    if (dl <= new Date()) return "Deadline must be in the future.";
    return null;
  }

  function submitOrder(e) {
    e.preventDefault();
    const err = validateForm();
    if (err) return alert(err);

    const newOrder = {
      id: Date.now(),
      studentName: form.studentName,
      subject: form.subject,
      description: form.description,
      phone: form.phone,
      deadline: form.deadline,
      status: "Pending Payment", // Pending Payment -> Paid -> Assigned -> In Progress -> Completed
      createdAt: new Date().toISOString(),
      assignedTo: null,
    };

    setOrders((s) => [newOrder, ...s]);
    setForm({ studentName: "", subject: "", description: "", phone: "", deadline: "" });
  }

  function payOrder(orderId) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "Paid" } : o))
    );

    // After payment, try to assign immediately or put into queue
    setTimeout(() => {
      const availableSolver = findAvailableSolver();
      if (availableSolver) {
        assignToSolver(orderId, availableSolver.id);
      } else {
        setQueue((q) => [...q, orderId]);
      }
    }, 100);
  }

  function findAvailableSolver() {
    return solversState.find((s) => s.assigned.length < SOLVER_CAPACITY) || null;
  }

  function assignToSolver(orderId, solverId) {
    setSolversState((prev) =>
      prev.map((s) =>
        s.id === solverId ? { ...s, assigned: [...s.assigned, orderId] } : s
      )
    );

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "Assigned", assignedTo: solverId } : o
      )
    );

    // remove from queue if present
    setQueue((q) => q.filter((id) => id !== orderId));
  }

  function tryAssignFromQueue() {
    setQueue((prevQueue) => {
      let q = [...prevQueue];
      let solvers = [...solversState];
      for (let i = 0; i < q.length; ) {
        const orderId = q[i];
        const freeSolver = solvers.find((s) => s.assigned.length < SOLVER_CAPACITY);
        if (!freeSolver) break;
        // assign in local copies
        solvers = solvers.map((s) =>
          s.id === freeSolver.id ? { ...s, assigned: [...s.assigned, orderId] } : s
        );
        // update orders
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "Assigned", assignedTo: freeSolver.id } : o))
        );
        q.splice(i, 1); // remove from queue
      }
      if (JSON.stringify(solvers) !== JSON.stringify(solversState)) setSolversState(solvers);
      return q;
    });
  }

  function markInProgress(orderId) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "In Progress" } : o)));
  }

  function markCompleted(orderId) {
    // free solver slot
    const order = orders.find((o) => o.id === orderId);
    if (!order || !order.assignedTo) return;
    const solverId = order.assignedTo;
    setSolversState((prev) => prev.map((s) => (s.id === solverId ? { ...s, assigned: s.assigned.filter((id) => id !== orderId) } : s)));

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "Completed" } : o)));

    // after freeing slot, try assign from queue via effect
  }

  function cancelOrder(orderId) {
    // If order is assigned, free slot
    const order = orders.find((o) => o.id === orderId);
    if (order && order.assignedTo) {
      setSolversState((prev) => prev.map((s) => (s.id === order.assignedTo ? { ...s, assigned: s.assigned.filter((id) => id !== orderId) } : s)));
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setQueue((q) => q.filter((id) => id !== orderId));
  }

  function renderOrderCard(o) {
    const assignedSolver = o.assignedTo ? solversState.find((s) => s.id === o.assignedTo) : null;
    return (
      <div key={o.id} className="border rounded-lg p-3 bg-white shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm text-gray-500">#{o.id}</div>
            <h3 className="font-semibold">{o.subject} — {o.studentName}</h3>
            <div className="text-sm text-gray-600 truncate max-w-xl">{o.description}</div>
            <div className="mt-1 text-xs text-gray-500">Deadline: {new Date(o.deadline).toLocaleString()}</div>
            <div className="mt-1 text-xs text-gray-500">Phone: {o.phone}</div>
          </div>
          <div className="text-right">
            <div className="mt-1 text-xs text-gray-600">{o.status}</div>
            {assignedSolver && <div className="text-xs mt-1">Assigned to: {assignedSolver.name}</div>}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {o.status === "Pending Payment" && (
            <button onClick={() => payOrder(o.id)} className="px-3 py-1 bg-green-600 text-white rounded">Pay</button>
          )}
          {o.status === "Paid" && <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Waiting for assignment</div>}
          {o.status === "Assigned" && (
            <>
              <button onClick={() => markInProgress(o.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Start</button>
              <button onClick={() => cancelOrder(o.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">Cancel</button>
            </>
          )}
          {o.status === "In Progress" && (
            <button onClick={() => markCompleted(o.id)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Mark Complete</button>
          )}
          {o.status === "Completed" && <div className="px-3 py-1 text-green-700 rounded text-sm">Completed</div>}
        </div>
      </div>
    );
  }

  const paidButUnassigned = orders.filter((o) => o.status === "Paid" && !o.assignedTo);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Homework Solver — small-pay homework help</h1>
          <p className="text-gray-600 mt-1">Two solvers, each can handle up to 5 homeworks simultaneously. Deadline is mandatory. Phone number required.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="col-span-1 lg:col-span-1">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="font-semibold mb-3">Place an order</h2>
              <form onSubmit={submitOrder} className="space-y-3">
                <input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} placeholder="Your name" className="w-full p-2 border rounded" />
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject (required)" className="w-full p-2 border rounded" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the homework (be specific)" className="w-full p-2 border rounded" rows={4} />

                <div className="flex gap-2">
                  <label className="flex-1">
                    <div className="text-xs text-gray-600">Phone number</div>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 0591234567" className="w-full p-2 border rounded" />
                  </label>
                  <label className="flex-1">
                    <div className="text-xs text-gray-600">Deadline (mandatory)</div>
                    <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full p-2 border rounded" />
                  </label>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Submit order</button>
                  <button type="button" onClick={() => setForm({ studentName: "", subject: "", description: "", phone: "", deadline: "" })} className="px-4 py-2 bg-gray-100 rounded">Reset</button>
                </div>
              </form>
            </div>

            <div className="mt-4 bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold">Solvers status</h3>
              <div className="mt-2 space-y-2">
                {solversState.map((s) => (
                  <div key={s.id} className="border rounded p-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-gray-500">Assigned: {s.assigned.length}/{SOLVER_CAPACITY}</div>
                    </div>
                    <div>
                      <button onClick={() => {
                        // convenience: simulate solver completing the oldest task
                        if (s.assigned.length === 0) return alert("No tasks to complete for this solver.");
                        const toComplete = s.assigned[0];
                        markCompleted(toComplete);
                      }} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Simulate Complete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="col-span-2">
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <h3 className="font-semibold">Orders (newest first)</h3>
              <div className="mt-3 grid gap-3">
                {orders.length === 0 && <div className="text-gray-500">No orders yet.</div>}
                {orders.map((o) => renderOrderCard(o))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold">Queue & statistics</h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 border rounded">
                  <div className="text-sm text-gray-500">Waiting (paid, unassigned)</div>
                  <div className="text-2xl font-bold">{paidButUnassigned.length}</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="text-sm text-gray-500">Total orders</div>
                  <div className="text-2xl font-bold">{orders.length}</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="text-sm text-gray-500">In queue</div>
                  <div className="text-2xl font-bold">{queue.length}</div>
                </div>
              </div>

              {queue.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium">Queue (order ids)</h4>
                  <div className="flex gap-2 mt-2">{queue.map((id) => (
                    <div key={id} className="px-2 py-1 bg-gray-100 rounded">#{id}</div>
                  ))}</div>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="text-center text-sm text-gray-500 mt-8">This is a demo frontend. Integrate with a real payment gateway and backend for production (persist orders, user auth, secure payment). Business rules enforced in frontend as requested: two solvers, each handle up to 5 orders at a time, deadline required.</footer>
      </div>
    </div>
  );
}
