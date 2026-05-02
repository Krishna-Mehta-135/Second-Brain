"use client";
import { useState, useEffect } from "react";
import { useSyncManager } from "@/lib/sync/SyncContext";

export function EditorTitle() {
  const manager = useSyncManager();
  const [title, setTitle] = useState("");

  useEffect(() => {
    const yDoc = manager.doc;
    const yText = yDoc.getText("title");

    setTitle(yText.toString());

    const observer = () => {
      setTitle(yText.toString());
    };

    yText.observe(observer);
    return () => yText.unobserve(observer);
  }, [manager]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    const yText = manager.doc.getText("title");
    manager.doc.transact(() => {
      yText.delete(0, yText.length);
      yText.insert(0, newTitle);
    });
  };

  return (
    <input
      type="text"
      value={title}
      onChange={handleChange}
      placeholder="Untitled"
      className="text-2xl font-bold bg-transparent border-none focus:outline-none w-full px-4 py-4"
    />
  );
}
