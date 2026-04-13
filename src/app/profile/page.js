"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, updateProfile } from "@/lib/auth";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    role: "",
    bio: "",
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

    setUser(currentUser);
    setForm({
      fullName: currentUser.fullName || "",
      email: currentUser.email || "",
      phone: currentUser.phone || "",
      organization: currentUser.organization || "",
      role: currentUser.role || "",
      bio: currentUser.bio || "",
    });
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setError("Full name and email are required.");
      return;
    }

    try {
      setSaving(true);
      const next = await updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        organization: form.organization.trim(),
        role: form.role.trim(),
        bio: form.bio.trim(),
      });
      setUser(next);
      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-72 text-sm text-slate-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">User Profile</h2>
            <p className="text-sm text-slate-500 mt-1">View and manage your account information.</p>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              disabled={!editing}
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              disabled={!editing}
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input
              disabled={!editing}
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <input
              disabled={!editing}
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. Security Analyst"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Organization</label>
          <input
            disabled={!editing}
            value={form.organization}
            onChange={(e) => handleChange("organization", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
          <textarea
            rows={4}
            disabled={!editing}
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Tell us a little about your responsibilities"
          />
        </div>

        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}

        {editing && (
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </form>
    </div>
  );
}
