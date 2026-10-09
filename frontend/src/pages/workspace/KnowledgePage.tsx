import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../hooks/useProjects.js";
import { useUIStore } from "../../stores/useUIStore.js";

interface DocItem {
  id: string;
  category: "Architecture" | "Requirements" | "ADRs" | "Documentation";
  title: string;
  updatedAt: string;
  author: string;
}

export function KnowledgePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData } = useProject(projectId || null);
  const { showToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [docs, setDocs] = useState<DocItem[]>([
    {
      id: "doc-1",
      category: "Architecture",
      title: "System High-Level Architecture & Domain Boundaries",
      updatedAt: "2026-09-18",
      author: "Maintainer",
    },
    {
      id: "doc-2",
      category: "Requirements",
      title: "V1 Functional Requirements & Authorization Invariants",
      updatedAt: "2026-09-19",
      author: "Maintainer",
    },
    {
      id: "doc-3",
      category: "ADRs",
      title: "ADR 001 — MongoDB Outbox Pattern for Asynchronous Email Delivery",
      updatedAt: "2026-09-19",
      author: "System Architect",
    },
    {
      id: "doc-4",
      category: "Documentation",
      title: "Local Development Setup & Embedded MongoDB Fallback Guidelines",
      updatedAt: "2026-09-20",
      author: "DevAI Core",
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] =
    useState<DocItem["category"]>("Architecture");

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newDoc: DocItem = {
      id: `doc-${Date.now()}`,
      category: newCategory,
      title: newTitle.trim(),
      updatedAt: new Date().toISOString().split("T")[0],
      author: "Maintainer",
    };

    setDocs([newDoc, ...docs]);
    setNewTitle("");
    setIsAddModalOpen(false);
    showToast("Knowledge document added to project.", "success");
  };

  const filteredDocs = docs.filter((d) => {
    const matchesCategory =
      activeCategory === "ALL" || d.category === activeCategory;
    const matchesSearch =
      !search || d.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-6xl mx-auto w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
              Project Knowledge
            </h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold uppercase">
              Maintainer Authority
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Permanent repository documentation & specifications for{" "}
            {projectData?.project?.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Add Document</span>
        </button>
      </div>

      {/* Info Notice distinguishing permanent knowledge from temporary conversation context */}
      <div className="mb-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-start gap-3">
        <span className="material-symbols-outlined text-[18px] text-zinc-500 mt-0.5 shrink-0">
          info
        </span>
        <div className="leading-relaxed">
          <span className="font-semibold text-zinc-900">
            Permanent Knowledge vs Temporary Attachments:
          </span>{" "}
          Files attached in Developer Chat are scoped to individual
          conversations. This section houses permanent project documentation,
          ADRs, and architectural reference materials.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 bg-zinc-100/70 p-1 rounded-xl">
          {["ALL", "Architecture", "Requirements", "ADRs", "Documentation"].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                {cat}
              </button>
            ),
          )}
        </div>

        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-2 text-zinc-400 text-[15px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation..."
            className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all font-sans"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-5 bg-white border border-zinc-200/90 rounded-2xl hover:border-zinc-300 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium">
                  {doc.category}
                </span>
                <span className="font-mono text-[11px] text-zinc-400">
                  {doc.updatedAt}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-950 tracking-tight leading-snug">
                {doc.title}
              </h3>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Author: {doc.author}</span>
              <span className="text-zinc-900 font-sans font-medium hover:underline cursor-pointer">
                View &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">
                    note_add
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Add Knowledge Document
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Permanent project reference
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleAddDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as DocItem["category"])
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 font-sans"
                >
                  <option value="Architecture">Architecture</option>
                  <option value="Requirements">Requirements</option>
                  <option value="ADRs">ADRs</option>
                  <option value="Documentation">Documentation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Microservice Communication RFC"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 transition-all font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-2 text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
